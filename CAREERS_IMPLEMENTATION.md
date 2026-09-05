# Careers Feature Implementation

This document explains what was implemented for the Careers feature across backend and frontend.

## Scope Delivered

- Public careers listing page
- Public career details page
- Job application submission flow (with resume upload)
- Admin hiring dashboard page
- Backend APIs for public careers + admin hiring operations
- Careers data models for jobs, applications, and interview invitations

## Frontend Implementation

### 1. Public careers list page

File:
- `frontend/src/pages/CareersPage/CareersPage.jsx`

What it does:
- Fetches open roles from `GET /api/v1/careers/jobs` with `skipAuth: true`
- Handles loading, empty, and error states
- Renders cards with title, type, location, department, experience, and top skills
- Links each card to the role detail route: `/careers/:slug`

### 2. Public career detail + apply page

File:
- `frontend/src/pages/CareersPage/CareerDetailsPage.jsx`

What it does:
- Fetches one role from `GET /api/v1/careers/jobs/:slug`
- Displays role metadata, overview, responsibilities, and required skills
- Provides application form with:
  - candidate details
  - profile links
  - cover letter
  - resume file (`.pdf/.doc/.docx`) and/or resume text
- Submits `FormData` to `POST /api/v1/careers/applications`
- Confirms receipt on success.

### 3. Admin hiring dashboard UI

File:
- `frontend/src/pages/CareersAdminPage/CareersAdminPage.jsx`

What it does:
- Loads jobs and applications from admin endpoints
- Shows hiring stats (awaiting review, shortlisted, applicants, open roles)
- Posts a new role through `POST /api/v1/admin/careers/jobs`
- Lists applicants in a filterable table; opening one fetches the full detail
- Shows the cover letter, profile links, extracted resume text and a link to
  the resume file
- Moves an application to shortlisted / hired / rejected
- Sends interview invites via admin API

### 4. Frontend API service wiring

File:
- `frontend/src/api/apiService.js`

Careers service methods:
- `careers.listJobs()` -> `GET /api/v1/careers/jobs`
- `careers.getJob(slug)` -> `GET /api/v1/careers/jobs/:slug`
- `careers.submitApplication(formData)` -> `POST /api/v1/careers/applications`
- `careers.admin.listJobs()` -> `GET /api/v1/admin/careers/jobs`
- `careers.admin.listApplications()` -> `GET /api/v1/admin/careers/applications`
- `careers.admin.createJob(payload)` -> `POST /api/v1/admin/careers/jobs`
- `careers.admin.getApplication(id)` -> `GET /api/v1/admin/careers/applications/:id`
- `careers.admin.updateApplication(id, payload)` -> `PATCH /api/v1/admin/careers/applications/:id`
- `careers.admin.sendInvite(id, payload)` -> `POST /api/v1/admin/careers/applications/:id/invite`

### 5. Routing integration

File:
- `frontend/src/App.jsx`

Public routes added:
- `/careers` -> `CareersPage`
- `/careers/:slug` -> `CareerDetailsPage`

Note:
- `CareersAdminPage` is routed at `/admin/careers` inside `AdminLayout`, and the
  admin sidebar links to it from `frontend/src/layouts/AdminLayout/AdminLayout.jsx`.
- All three careers pages go through `acsApi.careers.*` (the default export of
  `apiService.js`). They must not import the named `apiService`, which is the
  bare get/post wrapper and carries no `careers` namespace.

## Backend Implementation

### 1. Data models

File:
- `backend/api/models.py`

Implemented models:
- `JobPosting` (`job_posting`): role metadata, skills, status
- `JobApplication` (`job_application`): candidate profile, resume data, status
- `InterviewInvitation` (`interview_invitation`): invitation content, meeting/test links, send status

All three are `managed = True` models.

### 2. API views

File:
- `backend/api/views_careers.py`

Public endpoints:
- `CareerJobsListView` -> list active roles
- `CareerJobDetailView` -> role detail by slug
- `JobApplicationCreateView` -> accepts application + file upload, extracts resume text

Admin endpoints:
- `AdminCareerJobsView` -> list/create jobs
- `AdminCareerApplicationsView` -> list applications
- `AdminCareerApplicationDetailView` -> view/update one application
- `AdminCareerSendInviteView` -> send interview invite and persist invitation record

### 3. URL registration

File:
- `backend/api/urls.py`

Registered routes:
- `api/v1/careers/jobs`
- `api/v1/careers/jobs/<slug:slug>`
- `api/v1/careers/applications`
- `api/v1/admin/careers/jobs`
- `api/v1/admin/careers/applications`
- `api/v1/admin/careers/applications/<int:application_id>`
- `api/v1/admin/careers/applications/<int:application_id>/invite`

## Operational Note (Deployment)

The three careers tables are `managed = True` and are created by migration
`0014_jobposting_jobapplication_interviewinvitation`. They will not exist on any
environment that has not run `python manage.py migrate` since that migration was
added — the admin endpoints return a masked 500 until it is applied.

If careers routes return 404 while the routes exist in code, the deployed
backend is stale; that is pipeline related, not careers code.

## Quick Smoke Tests

Public:
- `GET /api/v1/careers/jobs` returns `200` with jobs list
- `GET /api/v1/careers/jobs/<slug>` returns `200` for active role
- `POST /api/v1/careers/applications` with valid form data returns `201`

Admin:
- `GET /api/v1/admin/careers/jobs` returns `200` for admin token
- `GET /api/v1/admin/careers/applications` returns `200` for admin token
- `POST /api/v1/admin/careers/applications/<id>/invite` returns `200` for admin token

## Fixes applied (2026-09-05)

The feature was wired up but could not run end to end. What was corrected:

| Problem | Fix |
|---|---|
| No migration for `JobPosting` / `JobApplication` / `InterviewInvitation`, so the tables were never created | Added migration `0014` |
| `STORAGES` in `settings.py` declared only `staticfiles`, which drops Django's `default` entry — `default_storage` raised, so every resume upload 500'd | Restated `default` as `FileSystemStorage` |
| No `/admin/careers` route, so the sidebar link rendered an empty layout | Route added inside `AdminLayout` |
| Pages imported the named `apiService`, so `apiService.careers` was `undefined` and the admin page crashed on mount | All three pages use the `acsApi` default export |
| `resume_file` stored the original upload name, not the path storage wrote to, so a deduplicated file could never be found again | Store the value returned by `default_storage.save()` |
| Admins could not open a resume, read a cover letter, or see profile links | Admin detail is fetched on select and returns `resume_url` and prior `invitations` |
| Nothing could set `screening_status`, so the "Shortlisted" tile was always 0 | Shortlist / hire / reject wired to the existing PATCH, which now rejects unknown statuses |
| No way to create a job posting (no UI, no Django admin) | "Post a role" form on the admin page, using the existing POST endpoint |
| Resume uploads were unvalidated | Extension and 10 MB size checked before the row is created |
| Pages used a blue/slate palette unrelated to the rest of the site | Rebuilt on the `--j-*` / `--font-*` tokens, matching BooksPage and AdminProposals |

### Still open

- Resumes live at `/media/careers/resumes/…` and are readable by anyone with the
  URL, like the proposal attachments. Candidate resumes are personal data and
  deserve an access-gated route.
- The admin gate is `User.role == 'admin'` only; it does not consult the
  `UserRole` table the way `_is_admin_or_editor()` does. This matches
  `ProtectedAdminRoute` on the frontend, so it is consistent, but an admin who
  holds the role only through `UserRole` cannot use this page.

## Automated fit scoring (removed)

An automated "fit percentage" scored each resume against the posting. It was
removed on 5 September 2026 at the owner's request, together with the
`ai_score`, `ai_summary`, `matched_skills` and `missing_skills` columns
(migration `0016`).

Resume text is still extracted on upload and shown in the admin queue, so a
reviewer can read a CV without downloading it; `pypdf` and `python-docx` stay
in requirements.txt for that.
