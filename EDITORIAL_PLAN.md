# Plan — Editor & admin features for Books and Proceedings

Companion to [PROJECT.md](PROJECT.md) and [PROPOSALS_PLAN.md](PROPOSALS_PLAN.md).

---

## 1. The gap

The public side is finished: catalogue, series, downloads, both proposal forms,
book detail pages, and a proposal triage queue. The staff side is almost
entirely missing.

**There is currently no way to create or edit a book, a series, a chapter, or a
download asset through the application.** The only route into the catalogue is
`python manage.py seed_books`, which is a developer tool, not an editorial one.

Three consequences worth stating plainly:

1. **An accepted proposal is a dead end.** An editor can mark a proposal
   "accepted" and then has no way to turn it into a book. The workflow stops at
   exactly the point where the real work starts.
2. **The proceedings downloads are broken.** `DownloadAsset` rows point at
   `proceedings/*.docx` files that were never uploaded, so every link on the
   proceedings page 404s. There is no upload UI to fix it.
3. **A published book has no lifecycle.** `Book.is_published` is a boolean. A
   real title moves through delivery, copyediting, typesetting and proofs before
   it is published, and editors need to know which stage each title is at.

---

## 2. What the industry does

### Production stages

Every source describes the same sequential pipeline —
[Chicago Manual of Style](https://www.chicagomanualofstyle.org/help-tools/production-technologies.html),
[Center for Engaged Learning](https://www.centerforengagedlearning.org/making-edits-during-production/),
[Enago](https://www.enago.com/author-hub/the-stages-of-the-publishing-process):

> manuscript delivered → copyediting → typesetting → proofs (author corrections)
> → indexing → print & ebook release

Editing is *sequential*: developmental, then copyediting, then proofreading.
Each stage is a checkpoint that must clear before the next begins. That maps
cleanly to a single `production_status` field with an ordered choice list, which
is what we adopt.

### Metadata

[ONIX 3.x](https://editeur.org/files/ONIX%203/Introduction_to_ONIX_for_Books_3.1.1.pdf),
[JSTOR's publisher requirements](https://support.publishers.jstor.org/hc/en-us/articles/360049235333-Metadata-Requirements)
and [BISG's best-practice guide](https://static1.squarespace.com/static/550334cbe4b0e08b6885e88f/t/55d2277be4b0a2c68568aaec/1439836027770/BISG_Best_Practices_for_Product_Metadata_6.1.15.pdf)
agree on the minimum a title must carry:

- **Book level** — unique record reference, title, publisher, publication date
  (year/month/day), ISBN and eISBN, language, DOI
- **Chapter level** — chapter title, start page, author(s), DOI, chapter number,
  language, plus recommended ORCID, keywords and abstract

Our `Book` and `BookChapter` models already cover most of this. The notable
absences are **eISBN** and a **publication-date precision** better than a year,
both of which block a future ONIX export. `BookChapter` already carries a DOI
and page range, which is the part most small publishers get wrong.

Chapter-level DOIs are the single highest-value item here — they are what make
individual contributions to an edited volume discoverable
([ScienceOpen](https://blog.scienceopen.com/2022/07/why-book-dois/)).

---

## 3. Design

### 3.1 Model changes (migration `0011`)

| Model | Field | Purpose |
|---|---|---|
| `Book` | `production_status` | ordered: `commissioned`, `manuscript`, `copyediting`, `typesetting`, `proofs`, `published` |
| `Book` | `managing_editor` → User | who owns this title |
| `Book` | `eisbn` | ONIX/JSTOR requirement for the digital edition |
| `Book` | `source_proposal_id` | which proposal it came from |
| `Book` | `updated_on` | last edited, for the staff list |
| `BookProposal` | `converted_book` → Book | forward link, and a guard against converting twice |

`is_published` stays and remains the public visibility switch, so nothing on the
public side changes. `production_status` is the editorial pipeline; the two are
deliberately separate — a title can be at `proofs` and still hidden.

### 3.2 Endpoints

All admin/editor gated with the existing `check_admin_or_editor_role`.

| Method | Route | Purpose |
|---|---|---|
| GET, POST | `api/v1/admin/books/` | Staff list (includes unpublished) and create |
| GET, PATCH, DELETE | `api/v1/admin/books/<id>` | Manage one title |
| POST | `api/v1/admin/books/<id>/chapters/` | Add a chapter |
| PATCH, DELETE | `api/v1/admin/books/<id>/chapters/<chapter_id>` | Edit or remove |
| GET, POST | `api/v1/admin/book-series/` | Series list and create |
| PATCH, DELETE | `api/v1/admin/book-series/<id>` | Manage one series |
| GET, POST | `api/v1/admin/downloads/` | Download assets, with file upload |
| PATCH, DELETE | `api/v1/admin/downloads/<id>` | Manage one asset |
| POST | `api/v1/admin/proposals/book/<id>/convert` | Accepted proposal → draft book |

### 3.3 The conversion step

This is the piece that makes the whole feature cohere. An editor accepts a
proposal, clicks **Create book from this proposal**, and gets a draft `Book`
with title, kind, series, abstract and the proposer already filled in as first
contributor, at `production_status = commissioned` and `is_published = False`.

Guards: the proposal must be `accepted`, and must not already have a
`converted_book`. Slug is derived from the title and de-duplicated.

### 3.4 Staff pages

- `/admin/books` — every title including unpublished, filtered by production
  status; drawer to edit metadata and manage chapters inline
- `/admin/downloads` — upload and revise the proceedings templates, which is
  what unbreaks the public downloads
- Editors get the same two pages under `/editor/*`, since commissioning is an
  editorial job, not an administrative one

---

## 3.5 Proceedings-specific additions (migration `0012`)

Proceedings volumes are `Book.kind='proceedings'`, but three things were missing
that books do not need.

**Conference metadata.** `Book` carried a single `conference_name` string, so
everything the proposal form collects — dates, venue, organiser, website — was
lost on conversion. [Crossref registers proceedings as a distinct record
type](https://www.crossref.org/documentation/schema-library/markup-guide-record-types/conference-proceedings/)
requiring event metadata (name required; acronym, number, location and date
encouraged) plus proceedings title, publisher and date. Added:
`conference_acronym`, `conference_number`, `conference_start`,
`conference_end`, `conference_venue`, `conference_organiser`, `conference_url`.

**Conversion for proceedings proposals.** `converted_book` existed only on
`BookProposal`, so an accepted conference proposal was still a dead end. The
convert endpoint is now `admin/proposals/<kind>/<id>/convert` and handles both.
A converted volume lands in the BCP series, carries every conference field
across, and records the proposer as its **volume editor** rather than an author.

**Advisory checks.** The public proceedings page states a 120–500 page range and
a 40% open-choice ceiling; nothing enforced either. `BookChapter.is_open_access`
was added so the ratio is computable, and `proceedings_warnings()` returns
non-blocking warnings on every book GET/PATCH — page bounds, the open-choice
ceiling, and a missing conference name. They are warnings, not errors, because
editorial can knowingly publish outside them.

---

## 4. Deliberate omissions

- **No ONIX export.** The metadata is now sufficient to build one, but nobody
  has asked for a feed and it is a large, standards-heavy job on its own.
- **No automatic DOI registration.** There is Crossref machinery in the journals
  code (`doi_status`, `crossref_batch_id` on `PaperPublished`); wiring books into
  it is a separate piece of work with real external credentials involved.
- **No email on production-status change.** Consistent with the earlier decision
  that only proposal confirmations are automatic.
- **`BookChapter.authors` is still free text.** Crossref wants structured
  contributors with ORCIDs for conference papers. Fine while deposits are
  manual; it becomes a blocker if they are ever automated.
- **No per-chapter licence tracking.** Springer requires one signed licence per
  paper. `CopyrightForm` covers journal papers only; a chapter equivalent is a
  separate piece of work.

---

## 5. Guest editors (migration `0013`)

A volume — especially a conference proceedings volume — is normally assembled
by people from outside the publishing house. `BookGuestEditor` gives them
scoped access to exactly one volume. **A volume can have any number of them**,
which is the usual case for an edited collection.

### Why a separate model from `BookContributor`

They answer different questions:

- `BookContributor` is **bibliographic** — the public byline. It may name
  people who have no account here at all.
- `BookGuestEditor` is **authorisation** — who may sign in and change this
  volume.

Accepting an invitation creates the matching `BookContributor` row
automatically, so the byline stays correct without anyone retyping a name.

### The permission boundary

| Guest editors can | Guest editors cannot |
|---|---|
| Edit volume metadata (title, abstract, ISBN, conference details) | Publish or unpublish |
| Add, edit and remove chapters | Change the production stage |
| Manage the contributor list / byline | Change the series or URL slug |
| Invite further co-editors to the same volume | Delete the volume |
| — | See or touch any other volume |

`can_manage_book(user, book_id)` is the single gate: staff pass for any title,
a guest editor only for a volume where they are `active`. `STAFF_ONLY_BOOK_FIELDS`
rejects the rest with a message naming the fields, rather than silently dropping
them. A guest editor also cannot remove their own access and lock themselves out.

### The invitation flow

Invite by **email address**, not by user account, so someone can be invited
before they have registered. Reading `/guest-editor/<token>` is public — the
recipient should see what they were asked before signing in — but responding
requires signing in as the invited address, so forwarding the link grants
nothing. Tokens expire after 30 days and can be re-sent.

### Routing

`/my-volumes` and `/my-volumes/manage` sit **outside** the editor portal guard.
A guest editor is usually an author or an outside academic whose `role` is not
`editor`, so `ProtectedEditorRoute` would turn them away. The API scopes every
response instead, and the catalogue screen hides staff-only controls when the
signed-in user is not staff.
