# Breakthrough Publishers — Project Reference

An audit of how this codebase actually works, written so that new code can be
added in the same idiom as what is already here. Everything below was read off
the source, not assumed.

## Operational guardrail (do not override)

- **Deployment pipelines are frozen.** Do not modify files under `.github/workflows/` that control deploys (`deploy-backend.yml`, `deploy-frontend.yml`, `deploy-prod-backend.yml`, `deploy-prod-frontend.yml`) unless the repository owner explicitly asks for that exact change in the current request.

---

## 1. Shape of the repo

```text
BreakThrough/
├── backend/            Django 4.2 REST API (DRF)
│   ├── bp_backend/     settings, urls, wsgi/asgi
│   ├── api/            the single Django app — all models, views, serializers
│   ├── venv/           the working virtualenv (Python 3.13, Django 4.2.29)
│   └── manage.py
├── frontend/           React 18 + Vite SPA
│   └── src/
│       ├── api/        axios client + apiService facade
│       ├── pages/      one folder per page: Page.jsx + Page.module.css
│       ├── layouts/    Admin/Author/Editor/Reviewer portal shells
│       ├── components/ shared UI
│       ├── contexts/   Auth, Journal, Modal, Toast
│       └── styles/     globals.css — the design tokens
└── uploads/            user-generated content (gitignored)
```

There is **one** Django app (`api`). Views are split by audience into
`views_*.py` files rather than into packages.

---

## 2. Running it locally

```bash
# backend
cd backend
source venv/bin/activate          # NOT the repo root — that venv was removed
python manage.py runserver        # http://127.0.0.1:8000

# frontend
cd frontend
npm run dev                       # http://localhost:5173
```

`backend/venv` is the only working environment. The project is Django, **not**
FastAPI — `uvicorn main:app` will fail because there is no `main.py`. If you
need ASGI, the callable is `bp_backend.asgi:application`.

`frontend/.env` sets `VITE_API_URL=http://localhost:8000`.

---

## 3. Database: the two-tier model convention

This is the single most important thing to understand before touching
`models.py`.

**Tier 1 — legacy tables (`managed = False`).** `User`, `Journal`, `Volume`,
`Issue`, `Paper`, `PaperPublished`, `Editor`, `ReviewerInvitation` and the rest
map onto a pre-existing MySQL schema that Django does not own. Django will
never create, alter or drop them.

Columns are added to these tables by the **`ensure_schema` management command**
(`api/management/commands/ensure_schema.py`), which holds a `REQUIRED_COLUMNS`
list and issues `ALTER TABLE ... ADD COLUMN` for anything missing. It runs on
deploy and is idempotent. To add a column to a legacy table, add a row to that
list — do not write a migration.

**Tier 2 — new tables (`managed = True`).** Tables this project owns outright
use ordinary Django migrations. Precedent: `PaperAccessAuditLog` (migration
`0007`), and the books/proceedings tables (migration `0009`).

Rule of thumb: **new table → `managed = True` + migration. New column on an old
table → `ensure_schema`.**

The database is MySQL, `utf8mb4` / `utf8mb4_unicode_ci`, with
`sql_mode='STRICT_TRANS_TABLES'`. Credentials come from `backend/.env` via
`get_required_env()`, which raises at import time if a variable is missing.

---

## 4. Authentication

Custom, and it does not use `django.contrib.auth`.

- `api/models.py :: User` is a **plain `models.Model`** on the legacy `user`
  table. It fakes the Django user interface with `is_authenticated`,
  `is_anonymous`, `is_active` and `status` properties — `is_authenticated`
  simply returns `True`, because an instance only ever exists for a real user.
- `api/auth.py :: JWTAuthentication` is the default authentication class. It
  reads `Authorization: Bearer <token>`, verifies via `api/jwt_utils.py`,
  requires `payload["type"] == "access"`, and resolves `payload["sub"]` to a
  `User` row.
- `JWTQueryParamAuthentication` is the same thing but falls back to `?token=`,
  for file viewers opened in a new tab where headers cannot be set.

`request.user` is therefore a `User` row, or Django's `AnonymousUser` when no
token was sent. Since `AnonymousUser.is_authenticated` is `False` and the custom
`User.is_authenticated` is `True`, the check `request.user.is_authenticated`
works correctly for both.

**Roles** live in two places: `User.role` (a string) and the `UserRole` table
(role + `status='approved'`), which supports a user holding several roles.
Views check both — see `_is_admin_or_editor()` in `views_journals.py`.

---

## 5. API conventions

`REST_FRAMEWORK` defaults (settings.py):

- Authentication: `api.auth.JWTAuthentication`
- Permission: **`IsAuthenticated` by default** — every view is locked unless it
  opts out
- Renderer: JSON only
- Exception handler: `api.exception_handler.custom_exception_handler`

### Making an endpoint public

Two established idioms:

```python
# Whole view is public
class ArticleListView(APIView):
    permission_classes = [permissions.AllowAny]

# Public GET, authenticated write
class JournalListView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
```

### URL layout

All API routes are registered in `api/urls.py` and mounted at the **root** by
`bp_backend/urls.py` (`path("", include("api.urls"))`) — not under `/api/`.
Each route carries its own `api/v1/` prefix.

Trailing-slash convention, followed consistently:

- collection routes end in a slash — `api/v1/journals/`
- routes ending in a path parameter do not — `api/v1/journals/<int:journal_id>`

Order matters: a literal segment must be registered **before** a same-prefix
parameter route (`books/proposals/` before `books/<slug:slug>`).

### Response shape

List endpoints return a **bare JSON array**, not a wrapper object:

```python
return Response(serializer.data, status=status.HTTP_200_OK)
```

Errors return `{"detail": "..."}` with the appropriate status. Serializer
validation errors return DRF's default field-keyed dict with 400.

### Pagination

`skip` and `limit` query parameters, sliced directly:

```python
skip = int(request.query_params.get("skip", 0))
limit = int(request.query_params.get("limit", 10))
qs[skip : skip + limit]
```

Not `offset`/`page`.

### Media URLs

`MEDIA_URL = "/media/"`, `MEDIA_ROOT = backend/media`, served by Django in
`DEBUG` only.

**The frontend is on a different origin from the API** (`localhost:5173` vs
`localhost:8000` in dev; `breakthroughpublishers.in` vs
`api.breakthroughpublishers.com` in production). A relative `/media/...` path
in the frontend therefore resolves against the *frontend* origin and 404s.

The convention is to build the absolute URL **server-side**, in the serializer,
from the request — see `_build_journal_media_url()` in `api/serializers.py`,
which calls `request.build_absolute_uri(f'/media/{value}')`. Serializers that
emit a file path must be given `context={'request': request}`.

### Error middleware

`ApiJsonErrorMiddleware` and `DatabaseErrorMiddleware` (`api/middleware.py`)
guarantee that anything under the API prefix returns JSON rather than Django's
HTML debug or error pages. `custom_exception_handler` additionally masks
database exceptions behind a generic message so internals do not leak.

---

## 6. Frontend conventions

### Structure

One folder per page, containing `PageName.jsx` and `PageName.module.css`. CSS
Modules throughout — there are no global utility classes and no CSS framework.

Some pages export named (`export const DashboardPage`), some default. Several do
both. `App.jsx` imports whichever form the page provides.

### Routing

All routes live in `frontend/src/App.jsx`, in four groups:

- **Public** — `/`, `/journals`, `/books`, `/proceedings`, `/login`, article views
- **Protected** — wrapped in `<ProtectedRoute>`
- **Portals** — `/admin`, `/author`, `/editor`, `/reviewer`, each behind a
  `Protected*Route` and rendered inside its own `*Layout`
- **Journal sites** — `/j/:shortForm/*`, which mount `JournalRouteWrapper` and
  render an entirely separate chrome (`JournalNavbar`) via `JournalProvider`

`AppContent` decides which navbar to show by inspecting `location.pathname`.

### The two navbars

- `components/header/Header.jsx` — the public site header. Nav items are
  hardcoded `<li><Link>` elements.
- `components/Navbar/Navbar.jsx` — the portal/dashboard navbar. Nav items come
  from a `navLinks` array and are rendered **twice**, once for desktop and once
  for the mobile menu.

A new top-level page must be added to **both**.

### API access

Never call axios directly from a component. Go through
`src/api/apiService.js`, which groups endpoints by domain (`journals`, `news`,
`books`, `proceedings`, …) and is exported as the default `acsApi`.

`src/api/axios.js` holds the client: it attaches the bearer token from
`localStorage.authToken`, transparently refreshes on 401, and honours a
`{ skipAuth: true }` config flag for public endpoints — always pass it on
public calls so an expired token cannot trigger a spurious refresh.

Components fetch in `useEffect`, hold `loading` state, `console.error` on
failure and fall back to an empty array. Responses are unwrapped defensively:

```js
const list = Array.isArray(data) ? data : data?.books || [];
```

### Design tokens

`src/styles/globals.css` defines the palette on `:root`. The values in active
use:

| Token | Value | Role |
|---|---|---|
| `--j-primary` | `#012d1d` | Dark green — hero bands, buttons, accents |
| `--j-secondary` | `#3f665c` | Muted green — supporting text |
| `--j-surface` | `#f9f9f8` | Page ground |
| `--j-surface-low` | `#f3f4f3` | Raised/alternating sections |
| `--j-on-surface` | `#1b1c1a` | Body ink |
| `--j-on-surface-variant` | `#414844` | Secondary ink |
| `--j-primary-fixed` | `#c1ecd4` | Pale green on dark grounds |
| `--j-outline-variant` | `#c1c8c2` | Hairline rules |
| `--font-headline` | Newsreader (serif) | Headings |
| `--font-body` | Manrope (sans) | Everything else |

Fonts load from Google Fonts in `index.html`. Icons are Material Symbols
Rounded, used as `<span className="material-symbols-rounded">name</span>`.

Every declaration is written as `var(--token, fallback)`. Follow this — but be
aware the fallbacks are **not always the real value**: `DashboardPage.module.css`
writes `var(--j-primary, #1b6d30)` throughout while `--j-primary` is actually
`#012d1d`. The token wins; the fallback is dead code.

---

## 7. Known issues found during this audit

Not introduced by recent work — worth fixing.

1. **Undefined tokens.** `DashboardPage.module.css` references
   `--j-surface-container-low`, `--j-surface-container`, `--j-primary-hover`
   and `--j-outline`, none of which are defined in `globals.css`. All four
   silently fall back. Either define them or inline the values.

2. **Misleading fallbacks.** The `#1b6d30` written as the `--j-primary`
   fallback across DashboardPage never renders. Anyone reading the CSS to learn
   the palette will get the wrong colour.

3. **Dark-on-dark contrast.** `DashboardPage.module.css .ctaIconWrap` pairs
   `--j-primary-container` (`#1b4332`, dark) with `--j-on-primary-container`
   (undefined → `#002107`, near-black). The icon is barely visible.
   `--j-primary-fixed` / `--j-on-primary-fixed` are the correct pair and are
   both defined.

4. **Two Django admin gaps.** `api/admin.py` registers nothing, so there is no
   built-in way to edit data. New catalogue rows need a management command or
   direct SQL.

5. **Bundle size.** The production build emits a single ~1.9 MB JS chunk. Route
   -level `React.lazy` would be the obvious fix.

6. **`requirements.txt` floors are stale.** It pins `scikit-learn>=1.0` and
   `numpy>=1.21` while the venv runs 1.8.0 and 2.4.4 — a fresh install could
   resolve to something very different from what is deployed.

7. **Lint error in `src/api/axios.js`.** `toast` is imported and never used,
   which fails `npx eslint`. Either wire it into the error interceptor (which
   looks like the original intent) or drop the import.

8. **`annotate()` drops `Meta.ordering`.** Adding an aggregate introduces a
   `GROUP BY` and Django silently discards the model's declared ordering, so
   the queryset comes back in insertion order. Any annotated queryset needs an
   explicit `.order_by(...)`. This bit `BookSeriesListView` and is now fixed
   there, but the same trap applies anywhere else aggregates are added.

---

## 8. Books & Conference Proceedings

The newest feature, and the reason this document exists.

### Tables (all `managed = True`, migration `0009`)

| Model | Table | Purpose |
|---|---|---|
| `BookSeries` | `book_series` | Named series with an abbreviation (BSAS, BCP …) |
| `Book` | `book` | A title. `kind` ∈ monograph / edited / textbook / proceedings |
| `BookContributor` | `book_contributor` | Ordered authors or editors of a book |
| `BookChapter` | `book_chapter` | Chapters with their own DOIs, for proceedings volumes |
| `DownloadAsset` | `download_asset` | Templates, guidelines and forms for the proceedings page |
| `ProceedingsProposal` | `proceedings_proposal` | A conference chair's submission |
| `BookProposal` | `book_proposal` | An author's book submission |

`DownloadAsset` exists so a revised template only needs a new file and date, not
a frontend release.

### Endpoints (`api/views_books.py`)

| Method | Route | Auth |
|---|---|---|
| GET | `api/v1/books/` | public — filters `kind`, `series`, `open_access`, `q`, `skip`, `limit` |
| GET | `api/v1/books/<slug>` | public |
| GET | `api/v1/book-series/` | public |
| GET | `api/v1/proceedings/downloads/` | public — optional `audience` |
| POST | `api/v1/books/proposals/` | public; attaches the user when a token is present |
| POST | `api/v1/proceedings/proposals/` | public; same |

### Pages

- `/books` (`pages/BooksPage/`) — catalogue with server-side filtering, series
  list, proposal process, CTA
- `/proceedings` (`pages/ProceedingsPage/`) — audience fork for volume editors
  vs contributing authors, six-stage process, downloads, specification, FAQ

Both reuse the homepage's dark-green hero band, pill buttons and footer, and
both keep their static editorial copy in a sibling `*Data.js` file. Only the
catalogue, series and downloads come from the API.

### Seeding

```bash
python manage.py seed_books
```

Idempotent. Creates 4 series, 8 books and 8 download assets.

**The seeded titles, ISBNs and file paths are placeholders**, and the turnaround
figures quoted on both pages ("10–14 weeks", "reply in 3 weeks", the 120–500pp
bounds) are editorial commitments that have not been confirmed. Both must be
replaced before these pages are made public.

### Proposals

Both proposal flows are live and require sign-in. See
[PROPOSALS_PLAN.md](PROPOSALS_PLAN.md) for the research behind the field sets.

| Route | Page |
|---|---|
| `/books/propose` | 4-step book proposal, optional CV / sample-chapter upload |
| `/proceedings/propose` | 2-step conference proposal |
| `/books/:slug` | Single title with chapter listing |
| `/admin/proposals` | Editorial triage queue, admin/editor only |

Submitting queues two emails: a confirmation to the proposer and a notification
to `EDITORIAL_EMAIL` (`breakthroughpublishersindia@gmail.com` by default).
Neither states a turnaround time — those live on the public pages only, so there
is one place to change them. Changing a proposal's status in the queue does
**not** email anyone; editors reply by hand.

Attachments land in `MEDIA_ROOT/proposals/<id>/`. Extension and size are
validated *before* the proposal row is created, so a rejected file cannot leave
an orphan record. Submissions are throttled at `10/hour` per account.

**Route ordering matters:** `/books/propose` is registered before
`/books/:slug`, otherwise "propose" is matched as a slug. The same applies to
`api/v1/books/proposals/` versus `api/v1/books/<slug>` on the backend.
