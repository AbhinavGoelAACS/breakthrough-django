import os
import re
import uuid
from datetime import date

from django.conf import settings
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Editor, Issue, Journal, JournalDetails, Paper, PaperCoAuthor, PaperPublished, User, UserRole, Volume
from .serializers import (
    JournalCreateUpdateSerializer,
    JournalDetailsSerializer,
    JournalListSerializer,
    JournalSerializer,
)


def _is_admin_or_editor(user):
    """Check if user is an admin or editor."""
    role = (user.role or "").lower()
    if role == "admin":
        return True
    if role == "editor":
        return True
    if UserRole.objects.filter(user=user, role="editor", status="approved").exists():
        return True
    return False


def save_journal_image(file, journal_short_form, field_name):
    """Save uploaded image file and return the relative path."""
    if not file:
        return ""
    
    # Validate file extension
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed_extensions:
        raise ValueError(f"Invalid file type. Allowed: {', '.join(allowed_extensions)}")
    
    # Create directory
    upload_dir = os.path.join(settings.MEDIA_ROOT, 'journals', journal_short_form)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    filename = f"{field_name}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    # Save file
    with open(filepath, 'wb+') as dest:
        for chunk in file.chunks():
            dest.write(chunk)
    
    # Return relative path for database
    return f"journals/{journal_short_form}/{filename}"


def strip_html_tags(text: str) -> str:
    if not text:
        return text
    clean = re.sub(r"<[^>]+>", "", text)
    clean = re.sub(r"\s+", " ", clean)
    return clean.strip()


class JournalListView(APIView):
    """
    GET: list journals (public)
    POST: create journal (admin only)
    """
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 10))
        journals = Journal.objects.all()[skip : skip + limit]
        serializer = JournalListSerializer(journals, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if getattr(request.user, "role", "").lower() != "admin":
            return Response(
                {"detail": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = JournalCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if Journal.objects.filter(
            fld_journal_name=data["fld_journal_name"]
        ).exists():
            return Response(
                {
                    "detail": f"Journal '{data['fld_journal_name']}' already exists"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Handle file uploads for journal_image and journal_logo
        journal_image_path = ""
        journal_logo_path = ""
        short_form = data["short_form"]
        
        try:
            if 'journal_image' in request.FILES:
                journal_image_path = save_journal_image(
                    request.FILES['journal_image'], short_form, 'image'
                )
            if 'journal_logo' in request.FILES:
                journal_logo_path = save_journal_image(
                    request.FILES['journal_logo'], short_form, 'logo'
                )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        journal = Journal.objects.create(
            fld_journal_name=data["fld_journal_name"],
            freq=data.get("freq") or "",
            issn_ol=data.get("issn_ol") or "",
            issn_prt=data.get("issn_prt") or "",
            cheif_editor=data.get("cheif_editor") or "",
            co_editor=data.get("co_editor") or "",
            password=data.get("password") or "",
            abs_ind=data.get("abs_ind") or "",
            short_form=short_form,
            journal_image=journal_image_path,
            journal_logo=journal_logo_path,
            guidelines=data.get("guidelines") or "",
            copyright=data.get("copyright") or "",
            membership=data.get("membership") or "",
            subscription=data.get("subscription") or "",
            publication=data.get("publication") or "",
            advertisement=data.get("advertisement") or "",
            description=data.get("description") or "",
            added_on=date.today(),
        )

        chief_editor_id = data.get("chief_editor_id")
        if chief_editor_id:
            role = (
                UserRole.objects.filter(
                    id=chief_editor_id,
                    role="editor",
                )
                .first()
            )
            if role:
                role.journal_id = journal.fld_id
                role.editor_type = "chief_editor"
                role.save(update_fields=["journal_id", "editor_type"])

        co_editor_id = data.get("co_editor_id")
        if co_editor_id:
            role = (
                UserRole.objects.filter(
                    id=co_editor_id,
                    role="editor",
                )
                .first()
            )
            if role:
                role.journal_id = journal.fld_id
                role.editor_type = "co_editor"
                role.save(update_fields=["journal_id", "editor_type"])

        section_ids = data.get("section_editor_ids") or []
        if section_ids:
            for rid in section_ids:
                role = (
                    UserRole.objects.filter(
                        id=rid,
                        role="editor",
                    )
                    .first()
                )
                if role:
                    role.journal_id = journal.fld_id
                    role.editor_type = "section_editor"
                    role.save(update_fields=["journal_id", "editor_type"])

        if any(
            [
                data.get("about_journal"),
                data.get("chief_say"),
                data.get("aim_objective"),
                data.get("criteria"),
                data.get("scope"),
                data.get("detailed_guidelines"),
                data.get("readings"),
            ]
        ):
            JournalDetails.objects.create(
                journal_id=str(journal.fld_id),
                about_journal=data.get("about_journal"),
                cheif_say=data.get("chief_say"),
                aim_objective=data.get("aim_objective"),
                criteria=data.get("criteria"),
                scope=data.get("scope"),
                guidelines=data.get("detailed_guidelines"),
                readings=data.get("readings"),
                added_on=date.today(),
            )

        response = JournalSerializer(journal, context={'request': request})
        return Response(response.data, status=status.HTTP_201_CREATED)


class JournalByShortFormView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, short_form: str):
        try:
            journal = Journal.objects.get(short_form__iexact=short_form)
        except Journal.DoesNotExist:
            return Response(
                {"detail": f"Journal with short_form '{short_form}' not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = JournalSerializer(journal, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class JournalDetailView(APIView):
    """
    GET: retrieve journal (public)
    PUT/DELETE: update/delete (admin only)
    """
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_object(self, journal_id: int):
        try:
            return Journal.objects.get(fld_id=journal_id)
        except Journal.DoesNotExist:
            return None

    def get(self, request, journal_id: int):
        journal = self.get_object(journal_id)
        if not journal:
            return Response(
                {"detail": f"Journal with ID {journal_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = JournalSerializer(journal, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, journal_id: int):
        if not _is_admin_or_editor(request.user):
            return Response(
                {"detail": "Admin or editor access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if (getattr(request.user, "role", "") or "").lower() != "admin":
            has_journal_access = UserRole.objects.filter(
                user=request.user,
                journal_id=journal_id,
                role="editor",
                status="approved",
            ).exists()
            if not has_journal_access:
                return Response(
                    {"detail": "You don't have access to update this journal"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        journal = self.get_object(journal_id)
        if not journal:
            return Response(
                {"detail": f"Journal with ID {journal_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"[JOURNAL PUT] Content-Type: {request.content_type}")
        logger.warning(f"[JOURNAL PUT] request.FILES keys: {list(request.FILES.keys())}")
        logger.warning(f"[JOURNAL PUT] request.data keys: {list(request.data.keys())}")

        serializer = JournalCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Handle file uploads for journal_image and journal_logo
        short_form = data["short_form"]
        try:
            if 'journal_image' in request.FILES:
                journal.journal_image = save_journal_image(
                    request.FILES['journal_image'], short_form, 'image'
                )
            if 'journal_logo' in request.FILES:
                journal.journal_logo = save_journal_image(
                    request.FILES['journal_logo'], short_form, 'logo'
                )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        journal.fld_journal_name = data["fld_journal_name"]
        journal.freq = data.get("freq", journal.freq)
        journal.issn_ol = data.get("issn_ol", journal.issn_ol)
        journal.issn_prt = data.get("issn_prt", journal.issn_prt)
        journal.cheif_editor = data.get("cheif_editor", journal.cheif_editor)
        journal.co_editor = data.get("co_editor", journal.co_editor)
        journal.password = data.get("password") or journal.password
        journal.abs_ind = data.get("abs_ind", journal.abs_ind)
        journal.short_form = short_form
        journal.guidelines = data.get("guidelines", journal.guidelines)
        journal.copyright = data.get("copyright", journal.copyright)
        journal.membership = data.get("membership", journal.membership)
        journal.subscription = data.get("subscription", journal.subscription)
        journal.publication = data.get("publication", journal.publication)
        journal.advertisement = data.get("advertisement", journal.advertisement)
        journal.description = data.get("description", journal.description)
        journal.save()

        # Handle editor assignments via UserRole
        chief_editor_id = data.get("chief_editor_id")
        co_editor_id = data.get("co_editor_id")
        section_editor_ids = data.get("section_editor_ids") or []
        editorial_board_member_ids = data.get("editorial_board_member_ids") or []

        if chief_editor_id is not None or co_editor_id is not None or section_editor_ids or editorial_board_member_ids:
            from .models import User as UserModel
            # Remove existing editor assignments for this journal
            UserRole.objects.filter(
                journal_id=journal_id,
                role="editor",
            ).delete()


            from django.utils import timezone
            # Assign chief editor
            if chief_editor_id:
                if UserModel.objects.filter(id=chief_editor_id).exists():
                    UserRole.objects.create(
                        user_id=chief_editor_id,
                        journal_id=journal_id,
                        role="editor",
                        editor_type="chief_editor",
                        status="approved",
                        requested_at=timezone.now(),
                    )

            # Assign co-editor
            if co_editor_id:
                if UserModel.objects.filter(id=co_editor_id).exists():
                    UserRole.objects.create(
                        user_id=co_editor_id,
                        journal_id=journal_id,
                        role="editor",
                        editor_type="co_editor",
                        status="approved",
                        requested_at=timezone.now(),
                    )

            # Assign section editors
            for se_id in section_editor_ids:
                if UserModel.objects.filter(id=se_id).exists():
                    UserRole.objects.create(
                        user_id=se_id,
                        journal_id=journal_id,
                        role="editor",
                        editor_type="section_editor",
                        status="approved",
                        requested_at=timezone.now(),
                    )

            # Assign editorial board members
            for ebm_id in editorial_board_member_ids:
                if UserModel.objects.filter(id=ebm_id).exists():
                    UserRole.objects.create(
                        user_id=ebm_id,
                        journal_id=journal_id,
                        role="editor",
                        editor_type="editorial_board_member",
                        status="approved",
                        requested_at=timezone.now(),
                    )

        if any(
            [
                data.get("about_journal"),
                data.get("chief_say"),
                data.get("aim_objective"),
                data.get("criteria"),
                data.get("scope"),
                data.get("detailed_guidelines"),
                data.get("readings"),
            ]
        ):
            details, _ = JournalDetails.objects.get_or_create(
                journal_id=str(journal_id),
                defaults={"added_on": date.today()},
            )
            if data.get("about_journal") is not None:
                details.about_journal = data.get("about_journal")
            if data.get("chief_say") is not None:
                details.cheif_say = data.get("chief_say")
            if data.get("aim_objective") is not None:
                details.aim_objective = data.get("aim_objective")
            if data.get("criteria") is not None:
                details.criteria = data.get("criteria")
            if data.get("scope") is not None:
                details.scope = data.get("scope")
            if data.get("detailed_guidelines") is not None:
                details.guidelines = data.get("detailed_guidelines")
            if data.get("readings") is not None:
                details.readings = data.get("readings")
            details.save()

        response = JournalSerializer(journal, context={'request': request})
        return Response(response.data, status=status.HTTP_200_OK)

    def delete(self, request, journal_id: int):
        if getattr(request.user, "role", "").lower() != "admin":
            return Response(
                {"detail": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        journal = self.get_object(journal_id)
        if not journal:
            return Response(
                {"detail": f"Journal with ID {journal_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        JournalDetails.objects.filter(journal_id=str(journal_id)).delete()
        journal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JournalExtendedDetailsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, journal_id: int):
        try:
            Journal.objects.get(fld_id=journal_id)
        except Journal.DoesNotExist:
            return Response(
                {"detail": f"Journal with ID {journal_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        from django.utils import timezone
        details, _ = JournalDetails.objects.get_or_create(
            journal_id=str(journal_id),
            defaults={"added_on": timezone.now()},
        )

        serializer = JournalDetailsSerializer(details)
        data = serializer.data
        # align field name to original schema
        data["chief_say"] = data.pop("chief_say", None)
        return Response(data, status=status.HTTP_200_OK)


class JournalVolumesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, journal_id: int):
        try:
            journal = Journal.objects.get(fld_id=journal_id)
        except Journal.DoesNotExist:
            return Response(
                {"detail": f"Journal with ID {journal_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        volumes = (
            Volume.objects.filter(journal=str(journal_id))
            .order_by("-volume_no")
            .all()
        )

        volumes_list = []
        for vol in volumes:
            issue_count = Issue.objects.filter(volume=vol.id).count()
            volumes_list.append(
                {
                    "id": vol.id,
                    "volume_no": vol.volume_no,
                    "year": vol.year,
                    "issue_count": issue_count,
                    "added_on": vol.added_on.isoformat() if vol.added_on else None,
                }
            )

        return Response(
            {
                "journal_id": journal_id,
                "journal_name": journal.fld_journal_name,
                "total_volumes": len(volumes_list),
                "volumes": volumes_list,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, journal_id: int):
        if not request.user.is_authenticated or not _is_admin_or_editor(request.user):
            return Response({"detail": "Admin or editor access required"}, status=status.HTTP_403_FORBIDDEN)

        try:
            journal = Journal.objects.get(fld_id=journal_id)
        except Journal.DoesNotExist:
            return Response({"detail": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)

        volume_no = request.data.get("volume_no")
        year = request.data.get("year", "")

        if not volume_no:
            return Response({"detail": "volume_no is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            volume_no = int(volume_no)
        except (ValueError, TypeError):
            return Response({"detail": "volume_no must be a number"}, status=status.HTTP_400_BAD_REQUEST)

        if Volume.objects.filter(journal=str(journal_id), volume_no=volume_no).exists():
            return Response({"detail": f"Volume {volume_no} already exists"}, status=status.HTTP_400_BAD_REQUEST)

        vol = Volume.objects.create(
            journal=str(journal_id),
            volume_no=volume_no,
            year=str(year) if year else "",
            added_on=date.today(),
        )

        return Response({
            "id": vol.id,
            "volume_no": vol.volume_no,
            "year": vol.year,
            "issue_count": 0,
            "added_on": vol.added_on.isoformat() if vol.added_on else None,
        }, status=status.HTTP_201_CREATED)

    def delete(self, request, journal_id: int):
        if not request.user.is_authenticated or not _is_admin_or_editor(request.user):
            return Response({"detail": "Admin or editor access required"}, status=status.HTTP_403_FORBIDDEN)

        volume_id = request.query_params.get("volume_id")
        if not volume_id:
            return Response({"detail": "volume_id query param required"}, status=status.HTTP_400_BAD_REQUEST)

        vol = Volume.objects.filter(id=volume_id, journal=str(journal_id)).first()
        if not vol:
            return Response({"detail": "Volume not found"}, status=status.HTTP_404_NOT_FOUND)

        # Delete related issues first
        Issue.objects.filter(volume=vol.id).delete()
        vol.delete()

        return Response({"detail": "Volume deleted"}, status=status.HTTP_200_OK)


class VolumeIssuesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, journal_id: int, volume_no: int):
        try:
            journal = Journal.objects.get(fld_id=journal_id)
        except Journal.DoesNotExist:
            return Response(
                {"detail": f"Journal with ID {journal_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        volume = Volume.objects.filter(
            volume_no=volume_no, journal=str(journal_id)
        ).first()
        if not volume:
            return Response(
                {
                    "detail": f"Volume {volume_no} not found for this journal",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        issues = Issue.objects.filter(volume=volume.id).order_by("issue_no").all()
        issues_list = []
        for issue in issues:
            paper_count = PaperPublished.objects.filter(
                journal_id=journal_id,
                volume=str(volume.volume_no),
                issue=str(issue.issue_no),
            ).count()
            issues_list.append(
                {
                    "id": issue.id,
                    "issue_no": issue.issue_no,
                    "month": issue.month,
                    "pages": issue.pages,
                    "paper_count": paper_count,
                    "complete_issue": issue.complete_issue,
                }
            )

        return Response(
            {
                "journal_id": journal_id,
                "journal_name": journal.fld_journal_name,
                "volume_id": volume.id,
                "volume_no": volume.volume_no,
                "year": volume.year,
                "total_issues": len(issues_list),
                "issues": issues_list,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, journal_id: int, volume_no: int):
        if not request.user.is_authenticated or not _is_admin_or_editor(request.user):
            return Response({"detail": "Admin or editor access required"}, status=status.HTTP_403_FORBIDDEN)

        try:
            journal = Journal.objects.get(fld_id=journal_id)
        except Journal.DoesNotExist:
            return Response({"detail": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)

        volume = Volume.objects.filter(volume_no=volume_no, journal=str(journal_id)).first()
        if not volume:
            return Response({"detail": f"Volume {volume_no} not found"}, status=status.HTTP_404_NOT_FOUND)

        issue_no = request.data.get("issue_no")
        month = request.data.get("month", "")
        pages = request.data.get("pages", "")

        if not issue_no:
            return Response({"detail": "issue_no is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            issue_no = int(issue_no)
        except (ValueError, TypeError):
            return Response({"detail": "issue_no must be a number"}, status=status.HTTP_400_BAD_REQUEST)

        if Issue.objects.filter(volume=volume.id, issue_no=issue_no).exists():
            return Response({"detail": f"Issue {issue_no} already exists in Volume {volume_no}"}, status=status.HTTP_400_BAD_REQUEST)

        issue = Issue.objects.create(
            volume=volume.id,
            journal=journal_id,
            issue_no=issue_no,
            month=str(month)[:16] if month else "",
            pages=str(pages)[:7] if pages else "",
            add_on=date.today().isoformat(),
            complete_issue="",
        )

        return Response({
            "id": issue.id,
            "issue_no": issue.issue_no,
            "month": issue.month,
            "pages": issue.pages,
            "paper_count": 0,
            "complete_issue": issue.complete_issue,
        }, status=status.HTTP_201_CREATED)

    def delete(self, request, journal_id: int, volume_no: int):
        if not request.user.is_authenticated or not _is_admin_or_editor(request.user):
            return Response({"detail": "Admin or editor access required"}, status=status.HTTP_403_FORBIDDEN)

        issue_id = request.query_params.get("issue_id")
        if not issue_id:
            return Response({"detail": "issue_id query param required"}, status=status.HTTP_400_BAD_REQUEST)

        volume = Volume.objects.filter(volume_no=volume_no, journal=str(journal_id)).first()
        if not volume:
            return Response({"detail": "Volume not found"}, status=status.HTTP_404_NOT_FOUND)

        issue = Issue.objects.filter(id=issue_id, volume=volume.id).first()
        if not issue:
            return Response({"detail": "Issue not found"}, status=status.HTTP_404_NOT_FOUND)

        issue.delete()
        return Response({"detail": "Issue deleted"}, status=status.HTTP_200_OK)


class JournalAllIssuesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, journal_id: int):
        try:
            journal = Journal.objects.get(fld_id=journal_id)
        except Journal.DoesNotExist:
            return Response(
                {"detail": f"Journal with ID {journal_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        volumes = (
            Volume.objects.filter(journal=str(journal_id))
            .order_by("-volume_no")
            .all()
        )

        result = []
        for vol in volumes:
            issues = Issue.objects.filter(volume=vol.id).order_by("issue_no").all()
            issues_list = []
            for issue in issues:
                paper_count = PaperPublished.objects.filter(
                    journal_id=journal_id,
                    volume=str(vol.volume_no),
                    issue=str(issue.issue_no),
                ).count()
                issues_list.append(
                    {
                        "id": issue.id,
                        "issue_no": issue.issue_no,
                        "month": issue.month,
                        "pages": issue.pages,
                        "paper_count": paper_count,
                        "complete_issue": issue.complete_issue,
                    }
                )
            result.append(
                {
                    "volume_id": vol.id,
                    "volume_no": vol.volume_no,
                    "year": vol.year,
                    "issues": issues_list,
                }
            )

        return Response(
            {
                "journal_id": journal_id,
                "journal_name": journal.fld_journal_name,
                "journal_short": journal.short_form,
                "volumes": result,
            },
            status=status.HTTP_200_OK,
        )


class IssuePapersView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, journal_id: int, volume_no: int, issue_no: int):
        try:
            journal = Journal.objects.get(fld_id=journal_id)
        except Journal.DoesNotExist:
            return Response(
                {"detail": f"Journal with ID {journal_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        volume = Volume.objects.filter(
            journal=str(journal_id), volume_no=volume_no
        ).first()
        if not volume:
            return Response(
                {
                    "detail": f"Volume {volume_no} not found for journal {journal_id}",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        issue = Issue.objects.filter(volume=volume.id, issue_no=issue_no).first()
        if not issue:
            return Response(
                {
                    "detail": f"Issue {issue_no} not found in volume {volume_no}",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        papers = (
            PaperPublished.objects.filter(
                journal_id=journal_id,
                volume=str(volume.volume_no),
                issue=str(issue.issue_no),
            )
            .order_by("pages")
            .all()
        )

        papers_list = []
        for paper in papers:
            clean_title = strip_html_tags(paper.title)
            clean_abstract = strip_html_tags(paper.abstract)
            clean_author = strip_html_tags(paper.author)
            clean_keyword = strip_html_tags(paper.keyword)
            clean_pages = strip_html_tags(paper.pages) if paper.pages else None
            clean_doi = strip_html_tags(paper.doi) if paper.doi else None

            if clean_abstract and len(clean_abstract) > 300:
                clean_abstract = clean_abstract[:300] + "..."

            # Build co_authors_json dynamically if not stored
            co_authors_json = paper.co_authors_json
            author_display = clean_author

            if not co_authors_json and paper.paper_submission_id:
                import json
                sub_paper = Paper.objects.filter(id=paper.paper_submission_id).first()
                if sub_paper:
                    authors_list_built = []
                    author_user = User.objects.filter(id=int(sub_paper.added_by)).first() if sub_paper.added_by and str(sub_paper.added_by).isdigit() else None
                    if author_user:
                        authors_list_built.append({
                            "name": f"{author_user.fname or ''} {author_user.lname or ''}".strip() or author_user.email,
                            "email": author_user.email,
                            "affiliation": author_user.affiliation or author_user.organisation or "",
                            "is_primary": True,
                            "is_corresponding": True,
                        })
                    try:
                        co_authors = PaperCoAuthor.objects.filter(paper_id=sub_paper.id).defer('user_id', 'invitation_token')
                        for ca in co_authors:
                            authors_list_built.append({
                                "name": f"{ca.first_name or ''} {ca.middle_name or ''} {ca.last_name or ''}".strip(),
                                "email": ca.email or "",
                                "affiliation": ca.organisation or "",
                                "is_primary": False,
                                "is_corresponding": bool(ca.is_corresponding),
                            })
                    except Exception:
                        pass
                    if authors_list_built:
                        co_authors_json = json.dumps(authors_list_built)
                        author_display = ", ".join(a["name"] for a in authors_list_built)

            papers_list.append(
                {
                    "id": paper.id,
                    "title": clean_title,
                    "author": author_display,
                    "co_authors_json": co_authors_json,
                    "pages": clean_pages,
                    "doi": clean_doi,
                    "doi_url": f"https://doi.org/{clean_doi}" if clean_doi else None,
                    "access_type": paper.access_type,
                    "keyword": clean_keyword,
                    "date": paper.date.isoformat() if paper.date else None,
                }
            )

        return Response(
            {
                "journal_id": journal_id,
                "journal_name": journal.fld_journal_name,
                "volume_no": volume_no,
                "year": volume.year if volume else None,
                "issue_no": issue_no,
                "month": issue.month if issue else None,
                "total_papers": len(papers_list),
                "papers": papers_list,
            },
            status=status.HTTP_200_OK,
        )


class JournalRecommendationView(APIView):
    """
    POST /api/v1/journals/recommend/
    
    Get journal recommendations based on paper content using NLP matching.
    
    Request body:
    {
        "research_area": "Computer Science",
        "keywords": ["machine learning", "deep learning", "neural networks", ...],
        "abstract": "This paper presents..."
    }
    
    Recommendations are based on:
    - TF-IDF cosine similarity between abstract and journal scope/description
    - Keyword overlap between paper keywords and journal text
    - Research area matching
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        research_area = request.data.get("research_area", "")
        keywords = request.data.get("keywords", [])
        abstract = request.data.get("abstract", "")

        # Validate keywords
        if not keywords or len(keywords) < 5:
            return Response(
                {"error": "At least 5 keywords are required for accurate recommendations"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ensure keywords is a list
        if isinstance(keywords, str):
            keywords = [k.strip() for k in keywords.split(",") if k.strip()]

        try:
            from .services.journal_recommendation_service import JournalRecommendationService
            service = JournalRecommendationService()
            recommendations = service.get_recommendations(
                research_area=research_area,
                keywords=keywords,
                abstract=abstract
            )
            
            return Response({
                "recommendations": recommendations,
                "total": len(recommendations),
                "research_area": research_area,
                "keywords_count": len(keywords)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Journal recommendation failed: {e}")
            return Response(
                {"error": "Failed to generate recommendations", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class JournalEditorialBoardView(APIView):
    """
    GET /api/v1/journals/{short_form}/editorial-board
    Public endpoint returning the editorial board for a journal.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, short_form: str):
        try:
            journal = Journal.objects.get(short_form__iexact=short_form)
        except Journal.DoesNotExist:
            return Response(
                {"detail": f"Journal with short_form '{short_form}' not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        roles = (
            UserRole.objects.filter(
                journal_id=journal.fld_id,
                role="editor",
                status="approved",
            )
            .select_related("user")
            .order_by("editor_type", "user__fname")
        )

        chief_editor = None
        co_editors = []
        section_editors = []
        editorial_board_members = []
        seen_emails = set()

        for ur in roles:
            u = ur.user
            seen_emails.add((u.email or '').lower())
            pic = getattr(u, 'profile_picture', None)
            if pic:
                pic = request.build_absolute_uri(f'/{pic}')
            entry = {
                "name": f"{u.fname or ''} {u.lname or ''}".strip() or u.email,
                "email": u.email,
                "designation": u.designation,
                "department": u.department,
                "affiliation": u.affiliation,
                "organisation": u.organisation,
                "editor_type": ur.editor_type or "section_editor",
                "profile_picture": pic,
            }
            if ur.editor_type == "chief_editor":
                chief_editor = entry
            elif ur.editor_type == "co_editor":
                co_editors.append(entry)
            elif ur.editor_type == "editorial_board_member":
                editorial_board_members.append(entry)
            else:
                section_editors.append(entry)

        # Local import guards against stale module state during partial deploy/reload.
        from .models import Editor as LegacyEditor
        legacy_editors = LegacyEditor.objects.filter(journal_id=journal.fld_id).order_by('editor_type', 'editor_name')
        for editor in legacy_editors:
            email_lower = (editor.editor_email or '').lower()
            if email_lower and email_lower in seen_emails:
                continue
            seen_emails.add(email_lower)

            entry = {
                "name": editor.editor_name or editor.editor_email or "",
                "email": editor.editor_email,
                "designation": None,
                "department": editor.editor_department,
                "affiliation": editor.editor_affiliation,
                "organisation": editor.editor_college,
                "editor_type": editor.editor_type or "section_editor",
                "profile_picture": None,
            }

            if editor.editor_type == "chief_editor":
                if not chief_editor:
                    chief_editor = entry
                else:
                    section_editors.append(entry)
            elif editor.editor_type == "co_editor":
                co_editors.append(entry)
            elif editor.editor_type == "editorial_board_member":
                editorial_board_members.append(entry)
            else:
                section_editors.append(entry)

        return Response({
            "chief_editor": chief_editor,
            "co_editors": co_editors,
            "section_editors": section_editors,
            "editorial_board_members": editorial_board_members,
        })


