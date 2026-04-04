import html
import os
import re
from pathlib import Path

from django.http import FileResponse, Http404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import News, PaperPublished, Journal, Paper, User, PaperCoAuthor, OnlineReview, ReviewSubmission, PaperVersion
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
    decoded = re.sub(r"</div>\s*", "\n", decoded, flags=re.IGNORECASE)
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

    def get(self, request, article_id: int):
        try:
            article = PaperPublished.objects.get(id=article_id)
        except PaperPublished.DoesNotExist:
            return Response(
                {"detail": f"Article with ID {article_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Build co_authors_json dynamically if not stored
        co_authors_json = article.co_authors_json
        author_display = strip_html_tags(article.author)

        if not co_authors_json and article.paper_submission_id:
            import json
            paper = Paper.objects.filter(id=article.paper_submission_id).first()
            if paper:
                authors_list = []
                author_user = User.objects.filter(id=int(paper.added_by)).first() if paper.added_by and str(paper.added_by).isdigit() else None
                if author_user:
                    authors_list.append({
                        "name": f"{author_user.fname or ''} {author_user.lname or ''}".strip() or author_user.email,
                        "email": author_user.email,
                        "affiliation": author_user.affiliation or author_user.organisation or "",
                        "is_primary": True,
                        "is_corresponding": True,
                    })
                try:
                    co_authors = PaperCoAuthor.objects.filter(paper_id=paper.id).defer('user_id', 'invitation_token')
                    for ca in co_authors:
                        authors_list.append({
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

        # Build paper timeline from submission data
        timeline = []
        if article.paper_submission_id:
            paper_for_timeline = paper if 'paper' in dir() and paper else Paper.objects.filter(id=article.paper_submission_id).first()
            if paper_for_timeline:
                # Submitted
                if paper_for_timeline.added_on:
                    timeline.append({
                        "event": "Submitted",
                        "date": paper_for_timeline.added_on.isoformat(),
                        "icon": "upload_file",
                    })

                # Under review (first reviewer assigned)
                first_review = OnlineReview.objects.filter(
                    paper_id=str(paper_for_timeline.id)
                ).order_by('assigned_on').first()
                if first_review and first_review.assigned_on:
                    timeline.append({
                        "event": "Under Review",
                        "date": first_review.assigned_on.isoformat(),
                        "icon": "rate_review",
                    })

                # Revision requested
                if paper_for_timeline.revision_requested_date:
                    rev_label = "Revision Requested"
                    if paper_for_timeline.revision_type:
                        rev_label = f"{paper_for_timeline.revision_type.title()} Revision Requested"
                    timeline.append({
                        "event": rev_label,
                        "date": paper_for_timeline.revision_requested_date.isoformat(),
                        "icon": "edit_note",
                    })

                # Revision submitted (latest version upload after v1)
                if paper_for_timeline.version_number and paper_for_timeline.version_number > 1:
                    latest_version = PaperVersion.objects.filter(
                        paper_id=paper_for_timeline.id,
                        version_number=paper_for_timeline.version_number
                    ).first()
                    if latest_version and latest_version.uploaded_on:
                        timeline.append({
                            "event": "Revised Manuscript Submitted",
                            "date": latest_version.uploaded_on.isoformat(),
                            "icon": "description",
                        })

                # Accepted — use the last review completion or revision_requested_date as proxy
                # For accepted papers, the acceptance date is typically just before publish date
                last_completed_review = ReviewSubmission.objects.filter(
                    paper_id=paper_for_timeline.id,
                    status="submitted"
                ).order_by('-submitted_at').first()
                accepted_date = None
                if last_completed_review and last_completed_review.submitted_at:
                    accepted_date = last_completed_review.submitted_at.isoformat()

                if accepted_date:
                    timeline.append({
                        "event": "Accepted",
                        "date": accepted_date,
                        "icon": "check_circle",
                    })

                # Published
                if article.date:
                    timeline.append({
                        "event": "Published",
                        "date": article.date.isoformat(),
                        "icon": "publish",
                    })

        data = {
            "id": article.id,
            "title": strip_html_tags(article.title) or "Untitled",
            "abstract": strip_html_tags(article.abstract),
            "p_reference": decode_references(article.p_reference),
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

        possible_paths = [
            PUBLISHED_PAPERS_DIR / article.paper,
            PUBLISHED_PAPERS_DIR / str(article.journal_id) / article.paper,
            (PUBLISHED_PAPERS_DIR.parent / "papers" / article.paper),
            Path(article.paper) if os.path.isabs(article.paper) else None,
        ]

        file_path = None
        for path in possible_paths:
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

        response = FileResponse(
            open(file_path, "rb"),
            content_type="application/pdf",
        )
        response["Content-Disposition"] = f'inline; filename="{article.paper}"'
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

