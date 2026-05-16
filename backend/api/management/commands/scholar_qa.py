"""
manage.py scholar_qa

Runs the Google Scholar QA checklist on published papers.

Usage:
  # Check every published paper
  python manage.py scholar_qa

  # Check a specific paper code
  python manage.py scholar_qa --paper-code TEST-26-03001

  # Show only failing / warning checks
  python manage.py scholar_qa --failures-only
"""
from django.core.management.base import BaseCommand

from api.models import Paper, PaperPublished
from api.views_scholar import _run_scholar_qa

STATUS_ICONS = {"pass": "✓", "warn": "⚠", "fail": "✗"}
STATUS_LABELS = {"pass": "PASS", "warn": "WARN", "fail": "FAIL"}


class Command(BaseCommand):
    help = "Run Google Scholar QA checklist on published papers."

    def add_arguments(self, parser):
        parser.add_argument(
            "--paper-code",
            type=str,
            default=None,
            help="Check only this paper code (e.g. TEST-26-03001).",
        )
        parser.add_argument(
            "--failures-only",
            action="store_true",
            default=False,
            help="Only print checks that are failing or warning.",
        )

    def handle(self, *args, **options):
        paper_code = options["paper_code"]
        failures_only = options["failures_only"]

        if paper_code:
            codes = [paper_code]
        else:
            # All papers that have a published record
            sub_ids = list(
                PaperPublished.objects
                .exclude(paper_submission_id=None)
                .values_list("paper_submission_id", flat=True)
            )
            codes = list(
                Paper.objects
                .filter(id__in=sub_ids)
                .exclude(paper_code="")
                .values_list("paper_code", flat=True)
            )
            if not codes:
                self.stdout.write(self.style.WARNING("No published papers found."))
                return

        total_pass = total_fail = total_warn = 0
        problem_papers = []

        for code in codes:
            result = _run_scholar_qa(code)
            p = result["pass_count"]
            f = result["fail_count"]
            w = result["warn_count"]
            total_pass += p
            total_fail += f
            total_warn += w

            if f or w:
                problem_papers.append(code)

            if failures_only and not (f or w):
                continue

            # Header line
            if f:
                header_style = self.style.ERROR
            elif w:
                header_style = self.style.WARNING
            else:
                header_style = self.style.SUCCESS

            self.stdout.write(
                header_style(
                    f"\n{'='*60}\n"
                    f"  {code}  —  "
                    f"{p} pass / {w} warn / {f} fail\n"
                    f"  Scholar URL: {result['scholar_url']}\n"
                    f"{'='*60}"
                )
            )

            for check in result["checks"]:
                if failures_only and check["status"] == "pass":
                    continue
                icon = STATUS_ICONS[check["status"]]
                label = STATUS_LABELS[check["status"]]
                if check["status"] == "pass":
                    line = self.style.SUCCESS(f"  {icon} [{label}] {check['label']}")
                elif check["status"] == "warn":
                    line = self.style.WARNING(f"  {icon} [{label}] {check['label']}")
                else:
                    line = self.style.ERROR(f"  {icon} [{label}] {check['label']}")
                self.stdout.write(line)
                self.stdout.write(f"         {check['message']}")

        # Summary
        self.stdout.write(
            f"\n{'─'*60}\n"
            f"Checked {len(codes)} paper(s)  |  "
            f"{total_pass} pass  "
            f"{total_warn} warn  "
            f"{total_fail} fail\n"
        )
        if problem_papers:
            self.stdout.write(
                self.style.WARNING(
                    f"Papers needing attention ({len(problem_papers)}):\n"
                    + "\n".join(f"  • {c}" for c in problem_papers)
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("All papers passed Scholar QA checks."))
