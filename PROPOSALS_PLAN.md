# Plan — "Propose a book" and "Propose a volume"

> **Status: all four phases implemented.** Kept as the record of what was
> researched and decided. See §8 for what shipped and what deliberately did not.

How to make the three dead buttons work, informed by what other academic
publishers actually ask for. Companion to [PROJECT.md](PROJECT.md).

---

## 1. Current state

Three `<Link>`s point at routes that do not exist, so React Router falls
through to the `*` catch-all and silently redirects to `/`:

| Link | File | Target |
|---|---|---|
| "Propose a volume" (hero) | `ProceedingsPage.jsx:72` | `/proceedings/propose` |
| "Propose a volume" (CTA) | `ProceedingsPage.jsx:298` | `/proceedings/propose` |
| "Propose a book" (CTA) | `BooksPage.jsx:248` | `/books/propose` |

A silent redirect to the homepage is the worst possible failure here — the user
believes they mis-clicked. Even before the forms land, these should either be
disabled or point at a mailto.

The backend is already further along than the frontend: `BookProposal` and
`ProceedingsProposal` tables exist (migration `0009`), and both POST endpoints
work and are tested. **The gap is the forms, the field coverage, and everything
after submission.**

---

## 2. What other publishers ask for

Researched from live publisher guidelines and forms.

### Book proposals — the consensus set

[UC Press](https://www.ucpress.edu/resources/book-authors/book-proposal-guidelines)
gives the most complete public specification; Harvard, Warwick and the trade
guides agree closely. Every source asks for:

1. **Brief description** — ~3 paragraphs / 200 words, written like back-cover copy
2. **Chapter outline** — a paragraph per chapter, showing how they connect
3. **Audience** — specialists, students (at what level), or general readers
4. **Comparable and competing works** — 4–6 titles from the last 3–5 years, with
   an honest account of how this one differs
5. **Status of the work** — percentage drafted, expected delivery date,
   previously published material, permissions still needed
6. **Apparatus** — total word count including notes; number and kind of
   illustrations
7. **Author information** — why this author, plus their reach for marketing
8. **Suggested reviewers** — UC Press asks for five to ten names with
   affiliations and emails
9. **Attachments** — CV, one or two sample chapters, sample illustrations

Points 4, 5 and 8 are the ones amateur forms omit, and they are exactly what an
acquisitions editor needs to make a decision.

### Proceedings proposals — the consensus set

[AIJR's proposal form](https://aijr.org/conference-proceedings/organizer/submit-proposal/)
is the clearest live example of the genre. Its fields:

Conference type (National / International) · start and end dates · conference
title · organiser · conference website · **announcement link on the organiser's
site** · **paper selection process (Peer-Reviewed / Non-Reviewed)** · venue ·
contact name · email · designation & affiliation · additional comments ·
privacy consent.

Two of those deserve attention. The **announcement link** is a cheap
authenticity check — a real conference has a public page. The **paper selection
process** determines whether the volume is publishable at all, and asking it
early avoids wasting everyone's time. Springer's own page makes the same point
differently: *"We do not select the papers for publication here in editorial.
The papers are selected by the Program Committees of the conferences."*

---

## 3. Gap analysis against our models

### `ProceedingsProposal` — has 11 of 15 fields

Present: `conference_name`, `organising_body`, `subject_area`,
`conference_start`, `conference_end`, `expected_papers`, `website`, `message`,
`contact_name`, `contact_email`, `contact_phone`.

**Missing — add in migration `0010`:**

| Field | Type | Why |
|---|---|---|
| `conference_type` | choice: national / international | Standard on every form; affects series routing |
| `venue` | CharField(500) | Physical location, or "Online" |
| `announcement_url` | CharField(500) | Authenticity check |
| `selection_process` | choice: peer_reviewed / non_reviewed | Decides publishability up front |
| `contact_designation` | CharField(255) | Who is asking, and in what capacity |
| `consent_given` | BooleanField | Privacy consent record |

### `BookProposal` — has 9 of 16 fields

Present: `title`, `kind`, `series`, `synopsis`, `outline`, `audience`,
`estimated_pages`, `outline_file`, `contact_name`, `contact_email`,
`affiliation`.

**Missing — add in migration `0010`:**

| Field | Type | Why |
|---|---|---|
| `comparable_works` | TextField | Every publisher asks; strongest signal of author seriousness |
| `completion_status` | choice: idea / partial / substantially / complete | Sets the timeline |
| `expected_delivery` | DateField | The date we would contract against |
| `estimated_words` | IntegerField | Extent is priced on words, not pages |
| `illustration_count` | IntegerField | Drives production cost |
| `previously_published` | TextField | Permissions and self-plagiarism risk |
| `author_bio` | TextField | Replaces "attach a CV" for a first pass |
| `suggested_reviewers` | TextField | Speeds up peer review by weeks |
| `cv_file` / `sample_chapter_file` | CharField(500) | Attachments |
| `consent_given` | BooleanField | Privacy consent record |

Both tables are `managed = True`, so this is an ordinary migration — **not** an
`ensure_schema` change. See PROJECT.md §3.

---

## 4. Backend work

### 4.1 Model and migration

Add the fields above, then `makemigrations api` → `0010_proposal_fields`. All
new fields nullable so the existing rows and endpoints keep working.

### 4.2 File uploads

Book proposals need CV and sample-chapter uploads; proceedings proposals do
not. Follow the existing pattern rather than inventing one:

- Accept `multipart/form-data` — add `parser_classes = [MultiPartParser,
  FormParser, JSONParser]` to `BookProposalCreateView`, as `JournalListView`
  does.
- Write via a `save_proposal_file()` helper modelled on `save_journal_image()`
  in `views_journals.py`: whitelist extensions (`.pdf`, `.doc`, `.docx`), cap
  size at 10 MB, generate a `uuid4().hex[:8]` filename, store under
  `MEDIA_ROOT/proposals/<proposal_id>/`.
- Store the relative path on the model and return an absolute URL through
  `_build_media_url()` — the serializer helper added for downloads.

**Validate content type and extension both.** These are public, unauthenticated
uploads: the single highest-risk surface in this plan.

### 4.3 Anti-abuse

Public POST endpoints with file upload will be found by bots. Minimum viable:

- A honeypot field the form leaves empty and real users never see.
- Rate limit by IP — DRF's `AnonRateThrottle` at something like `5/hour` on
  these two views only, via `throttle_classes`.
- `consent_given` must be `True` or reject with 400.

Recommend against a CAPTCHA for now: it needs a third-party script, and the
throttle plus honeypot will handle the volume a publisher of this size sees.

### 4.4 Email notification

`api/services/email_service.py` already has everything needed —
`queue_email_task()` for non-blocking send, plus
`notify_editors_new_submission()` and `send_submission_confirmation()` as direct
precedents. Add two pairs:

- `send_proposal_confirmation(proposal, kind)` → to the proposer: what was
  received, the reference number, and the realistic reply window.
- `notify_editorial_new_proposal(proposal, kind)` → to the editorial address,
  with a deep link into the admin queue.

Both must be queued, not synchronous, so a slow SMTP host cannot make the form
appear to hang.

### 4.5 Editorial queue

A proposal nobody reads is worse than no form. Add admin-only endpoints:

| Method | Route | Purpose |
|---|---|---|
| GET | `api/v1/admin/proposals/` | List both kinds, filter by `status` and `kind` |
| GET | `api/v1/admin/proposals/<kind>/<id>` | Full detail with attachments |
| PATCH | `api/v1/admin/proposals/<kind>/<id>` | Change `status`, record a decision note |

Reuse the `_is_admin_or_editor()` check from `views_journals.py`. Add
`decided_by`, `decided_on` and `decision_note` to both models in the same
migration.

---

## 5. Frontend work

### 5.1 Routes

Three additions to `App.jsx`, in the public group:

```jsx
<Route path="/books/propose" element={<BookProposalPage />} />
<Route path="/proceedings/propose" element={<ProceedingsProposalPage />} />
<Route path="/books/:slug" element={<BookDetailPage />} />
```

The third is listed because it is the same class of dead link and the endpoint
already exists.

### 5.2 Form structure — multi-step, not one long page

The book proposal has ~16 fields including two uploads. As a single page it
reads as a wall and will be abandoned. `SubmitPaperForm.jsx` already implements
a stepped form with `currentStep`, `fieldErrors` and `touched` state — copy that
structure rather than inventing a second one.

**Book proposal — 4 steps:**

1. *The book* — title, kind, series, synopsis, audience
2. *The content* — chapter outline, comparable works, word count,
   illustrations, previously published material
3. *You* — name, email, affiliation, bio, suggested reviewers
4. *Attachments & submit* — CV, sample chapter, completion status, expected
   delivery, consent

**Proceedings proposal — 2 steps.** It is a much shorter form and stepping it
twice is enough:

1. *The conference* — name, type, organiser, dates, venue, website,
   announcement link, subject area, expected papers, selection process
2. *You & submit* — name, designation, email, phone, message, consent

### 5.3 Shared components

Both forms need the same primitives, and neither page should own them:

- `components/proposal/ProposalField` — label, control, inline error, help text
- `components/proposal/ProposalStepper` — step indicator plus back/next
- `components/proposal/FileDropField` — file picker with name, size and clear

Style with the same tokens as the two pages: dark-green hero band, pill
buttons, `--j-outline-variant` hairlines, Newsreader headings.

### 5.4 Validation

Client-side on blur and on step change; the server revalidates regardless.
Required: title/conference name, synopsis, contact name, contact email,
consent. Email by format. `conference_end` must not precede `conference_start`.
File size and extension checked before upload so a 40 MB PDF fails instantly
rather than after a long wait.

### 5.5 Submission and success

- Disable the submit button and show a spinner while in flight.
- On success, replace the form with a confirmation panel — reference number,
  what happens next, the reply window — rather than a toast. A toast that
  disappears is not an adequate receipt for a form that took 20 minutes.
- On failure, keep every entered value, surface the server's field errors
  inline, and show a `mailto:` fallback so the work is not lost.

### 5.6 API layer

Add to the existing `books` and `proceedings` groups in `apiService.js`. The
book one sends `FormData`; the axios client already strips the JSON
`Content-Type` header when it sees `FormData`.

---

## 6. Suggested phasing

**Phase 1 — stop the silent redirect.** Half a day. Add the two routes with
working forms covering only the fields the models already have. The buttons work
and proposals land in the database.

**Phase 2 — full field coverage.** Migration `0010`, the extra fields, the
stepped layout, file uploads, throttling and honeypot.

**Phase 3 — close the loop.** Confirmation and notification emails, the admin
queue, status transitions.

**Phase 4 — `/books/:slug`.** The remaining dead link.

Phase 1 is genuinely deployable on its own, and I would ship it before
Phase 2 rather than after.

---

## 7. Decisions I need from you

1. **Where do notifications go?** There is no editorial address configured
   anywhere in the codebase. Needs a real inbox, or a settings value.
2. **Attachments at first contact — required or optional?** UC Press asks for a
   CV and sample chapters up front. Requiring them raises quality and lowers
   volume. My recommendation: optional at proposal, requested at review.
3. **Login required?** Currently the endpoints are public and attach the user
   only if a token is present. Requiring an account would cut spam sharply but
   also cut genuine first-time proposers. My recommendation: keep public,
   rely on the throttle.
4. **Are the published turnaround times real?** Both pages currently promise
   "reply in 3 weeks" (books) and "ten working days" (proceedings). The
   confirmation email will repeat whatever we put there, which turns it into a
   commitment. These need editorial sign-off before Phase 3.

---

## Sources

- [UC Press — Book Proposal Guidelines](https://www.ucpress.edu/resources/book-authors/book-proposal-guidelines)
- [AIJR — Submit Proceedings Proposal](https://aijr.org/conference-proceedings/organizer/submit-proposal/)
- [AIJR — Proceedings Publication Process](https://aijr.org/conference-proceedings/organizer/publication-process/)
- [Springer Nature — Conference Proceedings, step by step](https://www.springernature.com/gp/authors/publish-a-book/step-by-step-conference-proceedings)
- [Harvard University Press — Book Proposal Guidelines](https://www.hup.harvard.edu/resources/for-prospective-authors/book-proposal-guidelines)
- [Laura Portwood-Stacer — What Goes In An Academic Book Proposal](https://medium.com/@lportwoodstacer/how-to-format-your-academic-book-proposal-afefb7b95794)
- [Warwick — How to write a book proposal](https://warwick.ac.uk/fac/arts/hrc/wsh/bp/)

---

## 8. What shipped

All four phases are done. Decisions taken during implementation, and how they
differ from the plan above:

| Decision | Outcome |
|---|---|
| Notification address | `EDITORIAL_EMAIL`, default `breakthroughpublishersindia@gmail.com`, env-overridable |
| CV & sample chapters | Optional, as recommended |
| Login | **Required** — endpoints are `IsAuthenticated`; the plan recommended public, the call went the other way |
| Turnaround times | Kept out of the emails; they live on the two public pages only |

Two departures from the plan worth noting:

- **No honeypot.** It defends anonymous endpoints; with sign-in required it
  earns nothing. `UserRateThrottle` at `10/hour` per account does the work.
- **No sign-in redirect.** The proposal routes are registered as public and
  each page renders its own explanatory sign-in panel. Bouncing someone to
  `/login` the instant they click "Propose a book" reads as a bug. The API is
  what actually enforces auth.

### Files

**Backend** — `api/models.py` (7 models, migrations `0009` and `0010`),
`api/views_books.py` (public catalogue, proposals, admin queue),
`api/serializers.py`, `api/services/email_service.py`,
`api/management/commands/seed_books.py`.

**Frontend** — `pages/BooksPage`, `pages/ProceedingsPage`,
`pages/BookProposalPage`, `pages/ProceedingsProposalPage`,
`pages/BookDetailPage`, `pages/AdminProposals`, `components/proposal/`.

### Editorial queue

`/admin/proposals` lists both kinds in one triage table with status and type
filters, opens each in a drawer, and records accept / decline / under-review
plus an internal note against `decided_by` and `decided_on`.

**Changing a status does not email the proposer.** Only the two confirmation
emails are automatic, per the decision above — editors reply by hand. If that
should change, the wiring point is `AdminProposalDetailView.patch()`.

### Still outstanding

- Seeded titles, ISBNs, chapter DOIs and download file paths are placeholders.
- The `DownloadAsset` rows point at files that do not exist under
  `MEDIA_ROOT/proceedings/` yet, so those links will 404 until the real
  templates are uploaded.
- The turnaround figures on both public pages still need editorial sign-off.
