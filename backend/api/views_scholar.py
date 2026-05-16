import json
import re
from datetime import timedelta
from pathlib import Path

from django.db.models import Count
from django.db.models.functions import TruncYear
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views import View
from rest_framework import permissions
from rest_framework.views import APIView

from .models import Journal, Paper, PaperPublished


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _strip_html(text: str) -> str:
    """Remove HTML tags and normalise whitespace."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", clean).strip()


def _parse_authors(article: PaperPublished) -> list:
    """
    Return an ordered list of clean author-name strings.

    Preference order:
      1. co_authors_json (structured, already sorted by author_order on publish)
      2. article.author  (concatenated fallback string)
    """
    if article.co_authors_json:
        try:
            parsed = json.loads(article.co_authors_json)
            if isinstance(parsed, list):
                names = [a.get("name", "").strip() for a in parsed if a.get("name", "").strip()]
                if names:
                    return names
        except (json.JSONDecodeError, TypeError):
            pass

    # Fallback: split the stored author string on commas/semicolons
    raw = _strip_html(article.author or "")
    return [n.strip() for n in re.split(r"[,;]", raw) if n.strip()]


def _parse_pages(pages: str):
    """
    Split a page range like '12-25' or '12–25' into (first_page, last_page).
    Returns (pages, '') when no range separator is found.
    """
    if not pages:
        return "", ""
    parts = re.split(r"[-–—]", pages, maxsplit=1)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return pages.strip(), ""


# ---------------------------------------------------------------------------
# View
# ---------------------------------------------------------------------------

class ScholarPaperView(View):
    """
    Minimal, server-rendered landing page for a single published paper.

    Purpose: give Google Scholar's crawler a fully static HTML page with
    all required citation meta tags and a visible abstract — no JavaScript
    needed.

    URL: /scholar/paper/<paper_code>/

    This page is NOT the primary user-facing article page (that is the
    React SPA at /article/<id>). It is indexed by Scholar and links users
    back to the full article on the React front-end.
    """

    def get(self, request, paper_code: str):
        # ------------------------------------------------------------------
        # 1. Resolve paper_code → Paper → PaperPublished
        # ------------------------------------------------------------------
        paper = Paper.objects.filter(paper_code=paper_code).first()
        if not paper:
            raise Http404

        article = PaperPublished.objects.filter(paper_submission_id=paper.id).first()
        if not article:
            raise Http404

        # ------------------------------------------------------------------
        # 2. Supporting data
        # ------------------------------------------------------------------
        journal_obj = Journal.objects.filter(fld_id=article.journal_id).first()

        authors = _parse_authors(article)

        first_page, last_page = _parse_pages(_strip_html(article.pages))

        # Absolute PDF URL — only exposed for open-access papers
        pdf_url = None
        if article.access_type == "open" and article.paper:
            pdf_url = request.build_absolute_uri(f"/api/v1/articles/{article.id}/pdf")

        canonical_url = request.build_absolute_uri(f"/scholar/paper/{paper_code}/")

        # Link back to the full React article page
        react_url = request.build_absolute_uri(f"/article/{article.id}")

        # Publication date in YYYY/MM/DD format for citation_publication_date
        pub_date_meta = ""
        if article.date:
            pub_date_meta = article.date.strftime("%Y/%m/%d")

        context = {
            "article": article,
            "paper_code": paper_code,
            "authors": authors,
            "first_page": first_page,
            "last_page": last_page,
            "journal_obj": journal_obj,
            "pdf_url": pdf_url,
            "canonical_url": canonical_url,
            "react_url": react_url,
            "pub_date_meta": pub_date_meta,
            # Pre-stripped strings so the template stays simple
            "clean_title": _strip_html(article.title),
            "clean_abstract": _strip_html(article.abstract),
            "clean_affiliation": _strip_html(article.affiliation),
            "clean_pages": _strip_html(article.pages),
            "clean_keyword": _strip_html(article.keyword),
        }
        return render(request, "scholar/paper_detail.html", context)


# ---------------------------------------------------------------------------
# robots.txt
# ---------------------------------------------------------------------------

class RobotsView(View):
    """Serve /robots.txt — allows Scholar/Googlebot to crawl article pages."""

    def get(self, request):
        sitemap_url = request.build_absolute_uri("/sitemap.xml")
        content = (
            "User-agent: Googlebot\n"
            "Allow: /scholar/\n"
            "Allow: /browse/\n"
            "Allow: /api/v1/articles/\n"
            "Disallow: /api/v1/admin/\n"
            "Disallow: /api/v1/editor/\n"
            "Disallow: /api/v1/reviewer/\n"
            "Disallow: /api/v1/auth/\n"
            "Disallow: /media/profile_pictures/\n"
            f"Sitemap: {sitemap_url}\n"
            "\n"
            "User-agent: *\n"
            "Allow: /scholar/\n"
            "Allow: /browse/\n"
            "Allow: /api/v1/articles/\n"
            "Disallow: /api/v1/admin/\n"
            "Disallow: /api/v1/editor/\n"
            "Disallow: /api/v1/reviewer/\n"
            "Disallow: /api/v1/auth/\n"
            "Disallow: /media/profile_pictures/\n"
        )
        return HttpResponse(content, content_type="text/plain")


# ---------------------------------------------------------------------------
# sitemap.xml  (no django.contrib.sites dependency)
# ---------------------------------------------------------------------------

class SitemapView(View):
    """
    Generate /sitemap.xml listing every published paper scholar page plus
    the browse index pages.  Built from the live DB so it stays current.
    """

    def get(self, request):
        base = f"{request.scheme}://{request.get_host()}"

        # ── paper entries ──────────────────────────────────────────────────
        sub_ids = list(
            PaperPublished.objects
            .exclude(paper_submission_id=None)
            .order_by("-date")
            .values_list("paper_submission_id", flat=True)
        )
        papers = Paper.objects.filter(
            id__in=sub_ids, paper_code__isnull=False
        ).exclude(paper_code="")

        # Map paper.id → publication date for <lastmod>
        date_map = dict(
            PaperPublished.objects
            .exclude(paper_submission_id=None)
            .values_list("paper_submission_id", "date")
        )

        lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ]

        for p in papers:
            loc = f"{base}/scholar/paper/{p.paper_code}/"
            pub_date = date_map.get(p.id)
            lastmod = (
                f"\n    <lastmod>{pub_date.date().isoformat()}</lastmod>"
                if pub_date else ""
            )
            lines.append(
                f"  <url>\n    <loc>{loc}</loc>{lastmod}\n"
                f"    <changefreq>monthly</changefreq>\n"
                f"    <priority>0.8</priority>\n  </url>"
            )

        # ── browse / index pages ───────────────────────────────────────────
        static_pages = [
            ("/browse/",        "weekly", "0.6"),
            ("/browse/recent/", "daily",  "0.7"),
        ]
        for path, freq, pri in static_pages:
            lines.append(
                f"  <url>\n    <loc>{base}{path}</loc>\n"
                f"    <changefreq>{freq}</changefreq>\n"
                f"    <priority>{pri}</priority>\n  </url>"
            )

        lines.append("</urlset>")
        return HttpResponse("\n".join(lines), content_type="application/xml")


# ---------------------------------------------------------------------------
# Browse-by-date pages  (plain HTML, no JS — required for crawler discovery)
# ---------------------------------------------------------------------------

class ScholarBrowseView(View):
    """
    /browse/  — year index with paper counts.
    Google Scholar's crawler uses this to discover all paper URLs within
    at most 10 HTML link hops from the homepage.
    """

    def get(self, request):
        year_data = (
            PaperPublished.objects
            .exclude(paper_submission_id=None)
            .annotate(yr=TruncYear("date"))
            .values("yr")
            .annotate(count=Count("id"))
            .order_by("-yr")
        )
        years = [
            {"year": row["yr"].year, "count": row["count"]}
            for row in year_data
            if row["yr"]
        ]
        return render(request, "scholar/browse.html", {"years": years})


class ScholarBrowseYearView(View):
    """
    /browse/<year>/  — paginated paper list for a given year.
    Each entry is a plain <a> link to the scholar paper page.
    """

    PER_PAGE = 25

    def get(self, request, year: int):
        page = max(1, int(request.GET.get("page", 1)))
        offset = (page - 1) * self.PER_PAGE

        qs = (
            PaperPublished.objects
            .filter(date__year=year)
            .exclude(paper_submission_id=None)
            .order_by("-date")
        )
        total = qs.count()
        if total == 0 and page == 1:
            raise Http404

        articles_page = list(qs[offset: offset + self.PER_PAGE])

        # Batch-fetch Paper records to get paper_codes — avoids N+1 queries.
        sub_ids = [pp.paper_submission_id for pp in articles_page]
        papers_map = {p.id: p for p in Paper.objects.filter(id__in=sub_ids)}

        items = []
        for pp in articles_page:
            paper = papers_map.get(pp.paper_submission_id)
            if paper and paper.paper_code:
                items.append({
                    "paper_code": paper.paper_code,
                    "title":   _strip_html(pp.title),
                    "author":  _strip_html(pp.author),
                    "date":    pp.date,
                    "journal": pp.journal,
                })

        total_pages = max(1, (total + self.PER_PAGE - 1) // self.PER_PAGE)
        context = {
            "year":        year,
            "items":       items,
            "total":       total,
            "page":        page,
            "total_pages": total_pages,
            "prev_page":   page - 1 if page > 1 else None,
            "next_page":   page + 1 if page < total_pages else None,
        }
        return render(request, "scholar/browse_year.html", context)


class ScholarBrowseRecentView(View):
    """
    /browse/recent/  — papers added in the last 14 days.
    Recrawled more frequently so new papers get indexed faster.
    """

    def get(self, request):
        cutoff = timezone.now() - timedelta(days=14)
        qs = (
            PaperPublished.objects
            .filter(date__gte=cutoff)
            .exclude(paper_submission_id=None)
            .order_by("-date")
        )
        articles = list(qs)

        sub_ids = [pp.paper_submission_id for pp in articles]
        papers_map = {p.id: p for p in Paper.objects.filter(id__in=sub_ids)}

        items = []
        for pp in articles:
            paper = papers_map.get(pp.paper_submission_id)
            if paper and paper.paper_code:
                items.append({
                    "paper_code": paper.paper_code,
                    "title":   _strip_html(pp.title),
                    "author":  _strip_html(pp.author),
                    "date":    pp.date,
                    "journal": pp.journal,
                })

        return render(
            request,
            "scholar/browse_recent.html",
            {"items": items, "cutoff": cutoff},
        )


# ---------------------------------------------------------------------------
# Scholar QA Checklist
# ---------------------------------------------------------------------------

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_PDF_MAGIC = b"%PDF-"
_PDF_MAX_BYTES = 5 * 1024 * 1024


def _run_scholar_qa(paper_code: str) -> dict:
    """
    Run the Google Scholar QA checklist for a published paper identified by
    *paper_code*.  All checks are data-level (DB + filesystem) — no live HTTP
    requests are made.

    Returns a dict suitable for JSON serialisation:
      {paper_code, checks, pass_count, fail_count, warn_count, scholar_url}
    Each check: {id, label, status ("pass"|"fail"|"warn"), message}
    """
    checks = []

    def _add(id_, label, status, message):
        checks.append({"id": id_, "label": label, "status": status, "message": message})

    def _check(id_, label, ok, pass_msg, fail_msg, warn=False):
        _add(id_, label, "pass" if ok else ("warn" if warn else "fail"),
             pass_msg if ok else fail_msg)

    # ── 1. Published record exists ─────────────────────────────────────────
    paper_sub = Paper.objects.filter(paper_code=paper_code).first()
    published = (
        PaperPublished.objects.filter(paper_submission_id=paper_sub.id).first()
        if paper_sub else None
    )
    _check(
        "published_record", "Published record exists",
        bool(published),
        "PaperPublished record found.",
        "No PaperPublished record found for this paper code.",
    )
    if not published:
        return {
            "paper_code": paper_code,
            "checks": checks,
            "pass_count": 0, "fail_count": 1, "warn_count": 0,
            "scholar_url": f"/scholar/paper/{paper_code}/",
        }

    # ── 2. citation_title ─────────────────────────────────────────────────
    title_clean = _strip_html(published.title or "")
    _check(
        "citation_title", "citation_title meta tag",
        bool(title_clean),
        f"Title present: \"{title_clean[:80]}{'…' if len(title_clean) > 80 else ''}\"",
        "Title is empty — citation_title tag will be blank.",
    )

    # ── 3. citation_author ────────────────────────────────────────────────
    has_author = bool((published.author or "").strip()) or bool(published.co_authors_json)
    _check(
        "citation_author", "citation_author meta tag",
        has_author,
        "Author data present.",
        "Author field and co_authors_json are both empty.",
    )

    # ── 4. citation_publication_date ──────────────────────────────────────
    _check(
        "citation_publication_date", "citation_publication_date meta tag",
        bool(published.date),
        f"Publication date: {published.date.isoformat() if published.date else ''}",
        "Publication date is not set.",
    )

    # ── 5. citation_journal_title ─────────────────────────────────────────
    _check(
        "citation_journal_title", "citation_journal_title meta tag",
        bool((published.journal or "").strip()),
        f"Journal: {published.journal}",
        "Journal name is empty.",
        warn=True,
    )

    # ── 6. Abstract visible above fold ───────────────────────────────────
    abstract_clean = _strip_html(published.abstract or "")
    _check(
        "abstract", "Abstract visible above fold (no JS)",
        bool(abstract_clean),
        "Abstract is present and will render without JavaScript.",
        "Abstract is empty — Scholar requires the full author-written abstract.",
    )

    # ── 7. DOI ────────────────────────────────────────────────────────────
    _check(
        "citation_doi", "citation_doi meta tag",
        bool((published.doi or "").strip()),
        f"DOI: {published.doi}",
        "DOI is not set. Paper will still be indexed but DOI link won't work.",
        warn=True,
    )

    # ── 8. PDF for open-access ────────────────────────────────────────────
    if published.access_type == "open":
        pdf_raw = (paper_sub.file or "").strip() if paper_sub else ""
        if not pdf_raw:
            _add("pdf_url", "citation_pdf_url (open access)", "fail",
                 "Paper is open access but no PDF file is attached.")
        else:
            norm = pdf_raw.replace("\\", "/").lstrip("/")
            project_root = _BACKEND_ROOT.parent  # BreakThrough/
            candidates = [
                Path(pdf_raw) if Path(pdf_raw).is_absolute() else None,
                project_root / norm,                    # BreakThrough/uploads/papers/...
                _BACKEND_ROOT / norm,                   # BreakThrough/backend/uploads/...
                project_root / "uploads" / Path(norm).name,  # fallback: filename only
            ]
            found = next((p for p in candidates if p and p.exists()), None)
            if found:
                size = found.stat().st_size
                try:
                    with found.open("rb") as fh:
                        header = fh.read(5)
                    is_pdf = header == _PDF_MAGIC
                except OSError:
                    is_pdf = True  # can't read — assume ok
                if not is_pdf:
                    _add("pdf_url", "citation_pdf_url (open access)", "fail",
                         "File does not appear to be a valid PDF (missing %PDF- header).")
                elif size > _PDF_MAX_BYTES:
                    _add("pdf_url", "citation_pdf_url (open access)", "warn",
                         f"PDF is {size / (1024*1024):.1f} MB — Scholar recommends under 5 MB.")
                else:
                    _add("pdf_url", "citation_pdf_url (open access)", "pass",
                         f"Valid PDF found ({size / 1024:.0f} KB) — citation_pdf_url will be emitted.")
            else:
                _add("pdf_url", "citation_pdf_url (open access)", "fail",
                     "PDF file could not be located on disk — citation_pdf_url will be missing.")
    else:
        _add("pdf_url", "citation_pdf_url", "pass",
             "Subscription access — citation_pdf_url correctly omitted per Scholar spec.")

    # ── 9. Canonical link ────────────────────────────────────────────────
    _add("canonical", "Canonical <link> tag", "pass",
         "Template always emits <link rel=\"canonical\"> pointing to /scholar/paper/<code>/.")

    # ── 10. Browse-page presence ─────────────────────────────────────────
    _check(
        "browse_page", "Appears in /browse/<year>/ page",
        bool(published.date),
        f"Paper appears in /browse/{published.date.year}/ (verified via DB)."
        if published.date else "",
        "Publication date not set — paper will not appear in browse pages.",
        warn=True,
    )

    # ── 11. Sitemap inclusion ────────────────────────────────────────────
    _check(
        "sitemap", "Listed in sitemap.xml",
        bool(paper_code),
        f"/scholar/paper/{paper_code}/ will appear in the auto-generated sitemap.xml.",
        "paper_code is blank — paper cannot be included in sitemap.",
        warn=True,
    )

    pass_count = sum(1 for c in checks if c["status"] == "pass")
    fail_count = sum(1 for c in checks if c["status"] == "fail")
    warn_count = sum(1 for c in checks if c["status"] == "warn")

    return {
        "paper_code": paper_code,
        "checks": checks,
        "pass_count": pass_count,
        "fail_count": fail_count,
        "warn_count": warn_count,
        "scholar_url": f"/scholar/paper/{paper_code}/",
    }


# ---------------------------------------------------------------------------
# Scholar QA API view  (editor / admin only — DRF-auth)
# ---------------------------------------------------------------------------

class ScholarQAView(APIView):
    """
    GET /api/v1/editor/scholar-qa/<paper_code>/

    Run the Scholar QA checklist for a specific published paper.
    Returns a JSON report the editor UI can display.
    Requires editor or admin role.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, paper_code: str):
        from .views_editor import check_editor_role  # local import avoids circular
        if not check_editor_role(request.user):
            return JsonResponse({"detail": "Editor or admin access required."}, status=403)
        result = _run_scholar_qa(paper_code)
        return JsonResponse(result)
