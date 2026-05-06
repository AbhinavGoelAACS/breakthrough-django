import html
import os
import re
import mimetypes
from pathlib import Path

from django.http import FileResponse, Http404
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import News, PaperPublished, Journal, Paper, User, PaperCoAuthor, OnlineReview, ReviewSubmission, PaperVersion, CopyrightForm
from .serializers import ArticleDetailSerializer, ArticleListSerializer, NewsSerializer


BASE_DIR = Path(__file__).resolve().parent.parent
PUBLISHED_PAPERS_DIR = BASE_DIR.parent / "uploads" / "published"


def strip_html_tags(text: str) -> str:
    if not text:
        return text
    clean = re.sub(r"<[^>]+>", "", text)
    clean = re.sub(r"\s+", " ", clean)
    return clean.strip()


def decode_references(text: str) -> str:
    if not text:
        return text
    decoded = html.unescape(text)
    decoded = re.sub(r"<br\s*/?>", "\n", decoded, flags=re.IGNORECASE)
    decoded = re.sub(r"</(div|p|li|ul|ol)>\s*", "\n", decoded, flags=re.IGNORECASE)
    decoded = re.sub(r"<[^>]+>", "", decoded)
    lines = [line.strip() for line in decoded.split("\n")]
    return "\n".join(line for line in lines if line)


class ArticleListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 10))
        qs = PaperPublished.objects.order_by("-date").all()
        articles = qs[skip : skip + limit]

        data = []
        for article in articles:
            data.append(
                {
                    "id": article.id,
                    "title": strip_html_tags(article.title) or "Untitled",
                    "abstract": strip_html_tags(article.abstract),
                    "author": strip_html_tags(article.author),
                    "date": article.date.isoformat() if article.date else None,
                    "journal": article.journal,
                    "journal_id": article.journal_id,
                    "volume": article.volume,
                    "issue": article.issue,
                }
            )
        return Response(data, status=status.HTTP_200_OK)


class LatestArticlesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        limit = int(request.query_params.get("limit", 5))
        limit = max(1, min(limit, 50))
        articles = PaperPublished.objects.order_by("-date")[:limit]

        data = []
        for article in articles:
            data.append(
                {
                    "id": article.id,
                    "title": strip_html_tags(article.title) or "Untitled",
                    "abstract": strip_html_tags(article.abstract),
                    "author": strip_html_tags(article.author),
                    "date": article.date.isoformat() if article.date else None,
                    "journal": article.journal,
                    "journal_id": article.journal_id,
                    "volume": article.volume,
                    "issue": article.issue,
                }
            )
        return Response(data, status=status.HTTP_200_OK)


class ArticleDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, article_id):
        # Try to fetch by numeric ID, then by paper_code
        article = None
        if str(article_id).isdigit():
            try:
                article = PaperPublished.objects.get(id=int(article_id))
            except PaperPublished.DoesNotExist:
                pass
        if not article:
            try:
                article = PaperPublished.objects.get(paper_code=article_id)
            except PaperPublished.DoesNotExist:
                return Response(
                    {"detail": f"Article with ID or code '{article_id}' not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Build co_authors_json dynamically if not stored
        co_authors_json = article.co_authors_json
        author_display = strip_html_tags(article.author)
        published_reference = article.p_reference
        paper = None

        if article.paper_submission_id and (not co_authors_json or not published_reference):
            paper = Paper.objects.filter(id=article.paper_submission_id).first()
            if paper and not published_reference:
                published_reference = paper.paper_references

        if not co_authors_json and article.paper_submission_id:
            import json
            if paper:
                authors_list = []
                seen_author_keys = set()

                def build_author_key(name: str, email: str) -> str:
                    clean_name = (name or "").strip().lower()
                    clean_email = (email or "").strip().lower()
                    if clean_email:
                        return f"email:{clean_email}"
                    return f"name:{clean_name}"

                def upsert_author(author_obj: dict):
                    key = build_author_key(author_obj.get("name", ""), author_obj.get("email", ""))
                    if key in seen_author_keys:
                        for existing in authors_list:
                            existing_key = build_author_key(existing.get("name", ""), existing.get("email", ""))
                            if existing_key == key:
                                # Merge missing details and preserve corresponding flag.
                                if not existing.get("affiliation") and author_obj.get("affiliation"):
                                    existing["affiliation"] = author_obj["affiliation"]
                                if not existing.get("email") and author_obj.get("email"):
                                    existing["email"] = author_obj["email"]
                                existing["is_corresponding"] = bool(existing.get("is_corresponding")) or bool(author_obj.get("is_corresponding"))
                                return
                        return

                    seen_author_keys.add(key)
                    authors_list.append(author_obj)

                author_user = User.objects.filter(id=int(paper.added_by)).first() if paper.added_by and str(paper.added_by).isdigit() else None
                if author_user:
                    upsert_author({
                        "name": f"{author_user.fname or ''} {author_user.lname or ''}".strip() or author_user.email,
                        "email": author_user.email,
                        "affiliation": author_user.affiliation or author_user.organisation or "",
                        "is_primary": True,
                        "is_corresponding": True,
                    })
                try:
                    co_authors = PaperCoAuthor.objects.filter(paper_id=paper.id).order_by('author_order').defer('user_id', 'invitation_token')
                    for ca in co_authors:
                        upsert_author({
                            "name": f"{ca.first_name or ''} {ca.middle_name or ''} {ca.last_name or ''}".strip(),
                            "email": ca.email or "",
                            "affiliation": ca.organisation or "",
                            "is_primary": False,
                            "is_corresponding": bool(ca.is_corresponding),
                        })
                except Exception:
                    pass
                if authors_list:
                    co_authors_json = json.dumps(authors_list)
                    author_display = ", ".join(a["name"] for a in authors_list)
        elif co_authors_json and article.paper_submission_id:
            # Re-sort already-stored co_authors_json by author_order from PaperCoAuthor table
            import json
            try:
                _parsed = json.loads(co_authors_json) if isinstance(co_authors_json, str) else co_authors_json
                if isinstance(_parsed, list):
                    _sub_id = paper.id if paper else article.paper_submission_id
                    _ca_order = {
                        ca.email.strip().lower(): ca.author_order
                        for ca in PaperCoAuthor.objects.filter(paper_id=_sub_id).only('email', 'author_order')
                        if ca.email
                    }
                    if _ca_order:
                        _parsed.sort(key=lambda a: _ca_order.get((a.get('email') or '').strip().lower(), 999))
                        co_authors_json = json.dumps(_parsed)
                        author_display = ", ".join(a["name"] for a in _parsed)
            except Exception:
                pass

        # Build paper timeline from submission data
        timeline = []
        if article.paper_submission_id:
            paper_for_timeline = paper if 'paper' in dir() and paper else Paper.objects.filter(id=article.paper_submission_id).first()
            if paper_for_timeline:
                # Reviewed On — last review submission date
                last_completed_review = ReviewSubmission.objects.filter(
                    paper_id=paper_for_timeline.id,
                    status="submitted"
                ).order_by('-submitted_at').first()
                if last_completed_review and last_completed_review.submitted_at:
                    timeline.append({
                        "event": "Reviewed On",
                        "date": last_completed_review.submitted_at.isoformat(),
                        "icon": "rate_review",
                    })

                # Accepted On — use copyright form creation as proxy for acceptance date
                copyright_form = CopyrightForm.objects.filter(
                    paper_id=paper_for_timeline.id
                ).order_by('created_at').first()
                if copyright_form and hasattr(copyright_form, 'created_at') and copyright_form.created_at:
                    timeline.append({
                        "event": "Accepted On",
                        "date": copyright_form.created_at.isoformat(),
                        "icon": "check_circle",
                    })

                # Published On
                if article.date:
                    timeline.append({
                        "event": "Published On",
                        "date": article.date.isoformat(),
                        "icon": "publish",
                    })

        data = {
            "id": article.id,
            "title": strip_html_tags(article.title) or "Untitled",
            "abstract": strip_html_tags(article.abstract),
            "p_reference": decode_references(published_reference),
            "author": author_display,
            "date": article.date.isoformat() if article.date else None,
            "journal": article.journal,
            "journal_id": article.journal_id,
            "volume": article.volume,
            "issue": article.issue,
            "pages": strip_html_tags(article.pages),
            "keyword": strip_html_tags(article.keyword),
            "language": article.language,
            "paper": article.paper,
            "access_type": article.access_type,
            "email": article.email,
            "affiliation": strip_html_tags(article.affiliation),
            "doi": strip_html_tags(article.doi),
            "co_authors_json": co_authors_json,
            "timeline": timeline,
            "paper_code": paper.paper_code if 'paper' in dir() and paper else None,
        }
        return Response(data, status=status.HTTP_200_OK)


class ArticlePDFView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, article_id: int):
        try:
            article = PaperPublished.objects.get(id=article_id)
        except PaperPublished.DoesNotExist:
            return Response(
                {"detail": f"Article with ID {article_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not article.paper:
            return Response(
                {"detail": "No PDF file available for this article"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if article.access_type != "open":
            return Response(
                {"detail": "This article requires a subscription to access"},
                status=status.HTTP_403_FORBIDDEN,
            )

        paper_path = str(article.paper).strip()
        media_root = Path(settings.MEDIA_ROOT)
        project_root = BASE_DIR.parent
        uploads_root = project_root / "uploads"

        normalized_path = paper_path.replace("\\", "/").strip().lstrip("/")
        path_variants = [normalized_path]
        if normalized_path.startswith("media/"):
            path_variants.append(normalized_path[len("media/") :])
        if normalized_path.startswith("uploads/"):
            path_variants.append(normalized_path[len("uploads/") :])

        file_name = Path(normalized_path).name if normalized_path else ""
        if file_name:
            path_variants.append(file_name)

        # De-duplicate while preserving order
        seen_variants = set()
        unique_variants = []
        for variant in path_variants:
            if variant and variant not in seen_variants:
                unique_variants.append(variant)
                seen_variants.add(variant)

        roots = [
            media_root,
            uploads_root,
            project_root,
            PUBLISHED_PAPERS_DIR,
            PUBLISHED_PAPERS_DIR.parent / "papers",
        ]

        possible_paths = []

        # Absolute path stored in DB
        if os.path.isabs(paper_path):
            possible_paths.append(Path(paper_path))

        # Common relative forms from editor publish flow and legacy records
        for variant in unique_variants:
            variant_path = Path(variant)
            for root in roots:
                possible_paths.append(root / variant_path)

            # Handle records that only store the filename or store non-prefixed relative paths
            if file_name:
                possible_paths.append(media_root / "published" / str(article.journal_id) / file_name)
                possible_paths.append(uploads_root / "published" / str(article.journal_id) / file_name)

        file_path = None
        seen = set()
        for path in possible_paths:
            if not path:
                continue
            normalized = str(path.resolve()) if path.exists() else str(path)
            if normalized in seen:
                continue
            seen.add(normalized)
            if path and path.exists():
                file_path = path
                break

        if not file_path:
            return Response(
                {
                    "detail": "PDF file not found on server. Please contact support.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        content_type, _ = mimetypes.guess_type(str(file_path))
        if not content_type:
            content_type = "application/octet-stream"

        response = FileResponse(
            open(file_path, "rb"),
            content_type=content_type,
        )
        response["Content-Disposition"] = f'inline; filename="{Path(file_path).name}"'
        response.xframe_options_exempt = True
        return response


class ArticlesByJournalView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, journal_id: int):
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 10))

        qs = PaperPublished.objects.filter(journal_id=journal_id).order_by("-date")
        articles = qs[skip : skip + limit]

        data = []
        for article in articles:
            data.append(
                {
                    "id": article.id,
                    "title": strip_html_tags(article.title) or "Untitled",
                    "abstract": strip_html_tags(article.abstract),
                    "author": strip_html_tags(article.author),
                    "date": article.date.isoformat() if article.date else None,
                    "journal": article.journal,
                    "journal_id": article.journal_id,
                    "volume": article.volume,
                    "issue": article.issue,
                }
            )
        return Response(data, status=status.HTTP_200_OK)


class PublicNewsListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 10))
        journal_id = request.query_params.get("journal_id")

        qs = News.objects.all()
        if journal_id:
            qs = qs.filter(journal_id=int(journal_id))

        news_items = qs.order_by("-added_on")[skip : skip + limit]

        data = []
        for item in news_items:
            journal_name = None
            if item.journal_id:
                journal = Journal.objects.filter(fld_id=item.journal_id).first()
                journal_name = journal.fld_journal_name if journal else None

            data.append(
                {
                    "id": item.id,
                    "title": item.title,
                    "description": item.description,
                    "added_on": item.added_on.isoformat() if item.added_on else None,
                    "journal_id": item.journal_id,
                    "journal_name": journal_name,
                }
            )
        return Response(data, status=status.HTTP_200_OK)


class PublicNewsDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, news_id: int):
        try:
            news_item = News.objects.get(id=news_id)
        except News.DoesNotExist:
            return Response(
                {"detail": f"News item with ID {news_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        journal_name = None
        if news_item.journal_id:
            journal = Journal.objects.filter(fld_id=news_item.journal_id).first()
            journal_name = journal.fld_journal_name if journal else None

        data = {
            "id": news_item.id,
            "title": news_item.title,
            "description": news_item.description,
            "added_on": news_item.added_on.isoformat()
            if news_item.added_on
            else None,
            "journal_id": news_item.journal_id,
            "journal_name": journal_name,
        }
        return Response(data, status=status.HTTP_200_OK)


class ArticleAbstractView(APIView):
    """
    GET /api/v1/articles/{article_id}/abstract
    Return abstract text only - lighter response for list views.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, article_id: int):
        try:
            article = PaperPublished.objects.get(id=article_id)
        except PaperPublished.DoesNotExist:
            return Response(
                {"detail": f"Article with ID {article_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        return Response({
            "id": article.id,
            "title": article.title,
            "abstract": article.abstract,
            "keyword": article.keyword
        }, status=status.HTTP_200_OK)

