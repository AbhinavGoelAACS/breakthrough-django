"""
Recalculate fit scores for job applications.

Needed because resumes uploaded before pypdf/python-docx were installed were
never actually read: extraction failed silently and the placeholder string
"Resume uploaded. Manual review required." was stored and then scored, which is
why genuine candidates came out around 1% with every skill listed as missing.

    python manage.py rescore_applications --dry-run
    python manage.py rescore_applications --reextract        # re-read the files first
    python manage.py rescore_applications --reextract --job 3
"""

from django.core.management.base import BaseCommand

from api.models import JobApplication, JobPosting
from api.services.career_screening import job_screening_fields, screen_candidate_for_job
from api.services.resume_text import extract_resume_text

# What the old extractor stored whenever it failed.
PLACEHOLDER_TEXT = "Resume uploaded. Manual review required."


class Command(BaseCommand):
    help = "Recalculate AI fit scores for job applications, optionally re-reading resume files."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Report what would change without writing anything.")
        parser.add_argument("--reextract", action="store_true",
                            help="Re-read the stored resume files before scoring.")
        parser.add_argument("--job", type=int, default=None,
                            help="Limit to one job posting id.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        reextract = options["reextract"]
        job_id = options["job"]

        applications = JobApplication.objects.select_related("job").all()
        if job_id:
            if not JobPosting.objects.filter(id=job_id).exists():
                self.stderr.write(self.style.ERROR(f"No job posting with id {job_id}"))
                return
            applications = applications.filter(job_id=job_id)

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — nothing will be saved.\n"))

        fields_cache = {}
        recovered = unreadable = rescored = 0

        for application in applications:
            job = application.job
            if job.id not in fields_cache:
                fields_cache[job.id] = job_screening_fields(job)

            resume_text = application.resume_text or ""

            if reextract and application.resume_file:
                from django.core.files.storage import default_storage
                try:
                    path = default_storage.path(application.resume_file)
                except (NotImplementedError, ValueError):
                    path = None
                extracted = extract_resume_text(path) if path else ""
                if extracted:
                    if resume_text.strip() == PLACEHOLDER_TEXT:
                        recovered += 1
                    resume_text = extracted
                elif resume_text.strip() == PLACEHOLDER_TEXT:
                    # Still unreadable: clear the placeholder so the score says
                    # "could not be read" instead of pretending to be a match.
                    resume_text = ""
                    unreadable += 1

            screening = screen_candidate_for_job(fields_cache[job.id], resume_text)

            changed = (
                application.ai_score != screening["score"]
                or application.ai_summary != screening["summary"]
                or application.matched_skills != screening["matched_skills"]
                or application.missing_skills != screening["missing_skills"]
                or application.resume_text != resume_text
            )
            if not changed:
                continue

            self.stdout.write(
                f"  {application.candidate_name} ({job.title}): "
                f"{application.ai_score}% -> {screening['score']}%"
            )
            rescored += 1

            if dry_run:
                continue

            application.resume_text = resume_text
            application.ai_score = screening["score"]
            application.ai_summary = screening["summary"]
            application.matched_skills = screening["matched_skills"]
            application.missing_skills = screening["missing_skills"]
            application.save(update_fields=[
                "resume_text", "ai_score", "ai_summary", "matched_skills", "missing_skills",
            ])

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {rescored} application(s) rescored"
            + (f", {recovered} resume(s) recovered" if reextract else "")
            + (f", {unreadable} still unreadable" if reextract and unreadable else "")
            + "."
        ))
        if reextract and unreadable:
            self.stdout.write(
                "Unreadable resumes are usually scanned PDFs with no text layer, "
                "or pypdf not being installed on this server."
            )
