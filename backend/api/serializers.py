from rest_framework import serializers

from .models import (
    User, Journal, JournalDetails, PaperPublished, News,
    Book, BookSeries, BookContributor, BookChapter,
    DownloadAsset, ProceedingsProposal, BookProposal, BookGuestEditor,
)


def _build_journal_media_url(value, request=None):
    """Build a full absolute URL for journal image/logo fields.
    Always rebuilds using the current request host so URLs are correct
    in both local dev and production.
    """
    if not value:
        return None
    # If already a full URL, extract the relative media path first
    if value.startswith(('http://', 'https://')):
        import re
        match = re.search(r'/media/(.*)', value)
        if match:
            value = match.group(1)  # strip to relative path, rebuild below
        else:
            return value  # external URL, return as-is
    # New upload path (contains a slash, e.g. journals/IJMA/image_abc.png)
    if '/' in value:
        if request:
            return request.build_absolute_uri(f'/media/{value}')
        return f'/media/{value}'
    # Legacy plain filename — serve from static CDN
    return f'https://static.aacsjournals.com/images/{value}'


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    fname = serializers.CharField()
    lname = serializers.CharField()
    mname = serializers.CharField(required=False, allow_blank=True, default="")
    title = serializers.CharField(required=False, allow_blank=True, default="")
    affiliation = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    specialization = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    contact = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class TokenResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    token_type = serializers.CharField()
    expires_in = serializers.IntegerField()
    id = serializers.IntegerField(required=False)
    email = serializers.EmailField(required=False)
    role = serializers.CharField(required=False)
    fname = serializers.CharField(required=False, allow_blank=True)
    lname = serializers.CharField(required=False, allow_blank=True)
    affiliation = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    organisation = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class RefreshTokenSerializer(serializers.Serializer):
    refresh_token = serializers.CharField()


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)


class UserResponseSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "role",
            "fname",
            "lname",
            "mname",
            "title",
            "affiliation",
            "specialization",
            "contact",
            "address",
            "salutation",
            "designation",
            "department",
            "organisation",
            "profile_picture",
        ]

    def get_profile_picture(self, obj):
        pic = getattr(obj, 'profile_picture', None)
        if not pic:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/{pic}')
        return f'/{pic}'


class JournalListSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="fld_id")
    name = serializers.CharField(source="fld_journal_name")
    issn_online = serializers.CharField(source="issn_ol", allow_null=True)
    issn_print = serializers.CharField(source="issn_prt", allow_null=True)
    chief_editor = serializers.CharField(source="cheif_editor", allow_null=True)
    journal_logo = serializers.SerializerMethodField()

    class Meta:
        model = Journal
        fields = [
            "id",
            "name",
            "short_form",
            "issn_online",
            "issn_print",
            "chief_editor",
            "co_editor",
            "journal_logo",
            "description",
        ]

    def get_journal_logo(self, obj):
        return _build_journal_media_url(obj.journal_logo, self.context.get('request'))


class JournalSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="fld_id")
    name = serializers.CharField(source="fld_journal_name")
    frequency = serializers.CharField(source="freq", allow_null=True)
    issn_online = serializers.CharField(source="issn_ol", allow_null=True)
    issn_print = serializers.CharField(source="issn_prt", allow_null=True)
    chief_editor = serializers.CharField(source="cheif_editor", allow_null=True)
    abstract_indexing = serializers.CharField(source="abs_ind", allow_null=True)
    added_on = serializers.SerializerMethodField()
    journal_image = serializers.SerializerMethodField()
    journal_logo = serializers.SerializerMethodField()

    class Meta:
        model = Journal
        fields = [
            "id",
            "name",
            "frequency",
            "issn_online",
            "issn_print",
            "chief_editor",
            "co_editor",
            "abstract_indexing",
            "short_form",
            "journal_image",
            "journal_logo",
            "guidelines",
            "copyright",
            "membership",
            "subscription",
            "publication",
            "advertisement",
            "description",
            "added_on",
        ]

    def get_added_on(self, obj):
        return obj.added_on.isoformat() if obj.added_on else None

    def get_journal_image(self, obj):
        return _build_journal_media_url(obj.journal_image, self.context.get('request'))

    def get_journal_logo(self, obj):
        return _build_journal_media_url(obj.journal_logo, self.context.get('request'))


class JournalCreateUpdateSerializer(serializers.Serializer):
    # Only basic fields are required
    fld_journal_name = serializers.CharField(max_length=200)
    short_form = serializers.CharField(max_length=255)
    
    # All other fields are optional
    freq = serializers.CharField(max_length=250, required=False, allow_blank=True, default="")
    issn_ol = serializers.CharField(max_length=250, required=False, allow_blank=True, default="")
    issn_prt = serializers.CharField(max_length=250, required=False, allow_blank=True, default="")
    cheif_editor = serializers.CharField(max_length=250, required=False, allow_blank=True, default="")
    co_editor = serializers.CharField(max_length=250, required=False, allow_blank=True, default="")
    password = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    abs_ind = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")
    # journal_image and journal_logo are handled as file uploads in the view, not in serializer
    guidelines = serializers.CharField(required=False, allow_blank=True, default="")
    copyright = serializers.CharField(required=False, allow_blank=True, default="")
    membership = serializers.CharField(required=False, allow_blank=True, default="")
    subscription = serializers.CharField(required=False, allow_blank=True, default="")
    publication = serializers.CharField(required=False, allow_blank=True, default="")
    advertisement = serializers.CharField(required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    chief_editor_id = serializers.IntegerField(required=False, allow_null=True)
    co_editor_id = serializers.IntegerField(required=False, allow_null=True)
    section_editor_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_null=True
    )
    editorial_board_member_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_null=True
    )
    about_journal = serializers.CharField(required=False, allow_blank=True, default="")
    chief_say = serializers.CharField(required=False, allow_blank=True, default="")
    aim_objective = serializers.CharField(required=False, allow_blank=True, default="")
    criteria = serializers.CharField(required=False, allow_blank=True, default="")
    scope = serializers.CharField(required=False, allow_blank=True, default="")
    detailed_guidelines = serializers.CharField(required=False, allow_blank=True, default="")
    readings = serializers.CharField(required=False, allow_blank=True, default="")

    def _strip_html(self, value):
        """Strip HTML tags from text"""
        import re
        if not value:
            return value
        clean = re.sub(r"<[^>]+>", "", str(value))
        clean = re.sub(r"\s+", " ", clean)
        return clean.strip()

    def validate(self, attrs):
        """Strip HTML from all text fields"""
        text_fields = [
            'fld_journal_name', 'short_form', 'freq', 'issn_ol', 'issn_prt',
            'cheif_editor', 'co_editor', 'abs_ind',
            'guidelines', 'copyright', 'membership', 'subscription', 'publication',
            'advertisement', 'description', 'about_journal', 'chief_say',
            'aim_objective', 'criteria', 'scope', 'detailed_guidelines', 'readings'
        ]
        for field in text_fields:
            if field in attrs and attrs[field]:
                attrs[field] = self._strip_html(attrs[field])
        return attrs


class JournalDetailsSerializer(serializers.ModelSerializer):
    chief_say = serializers.CharField(source="cheif_say", allow_null=True)

    class Meta:
        model = JournalDetails
        fields = [
            "id",
            "journal_id",
            "about_journal",
            "chief_say",
            "aim_objective",
            "criteria",
            "scope",
            "guidelines",
            "readings",
            "added_on",
        ]


class ArticleListSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()

    class Meta:
        model = PaperPublished
        fields = [
            "id",
            "paper_code",
            "title",
            "abstract",
            "author",
            "date",
            "journal",
            "journal_id",
            "volume",
            "issue",
        ]

    def get_date(self, obj):
        return obj.date.isoformat() if obj.date else None


class ArticleDetailSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()

    class Meta:
        model = PaperPublished
        fields = [
            "id",
            "paper_code",
            "title",
            "abstract",
            "p_reference",
            "author",
            "date",
            "journal",
            "journal_id",
            "volume",
            "issue",
            "pages",
            "keyword",
            "language",
            "paper",
            "access_type",
            "email",
            "affiliation",
            "doi",
            "co_authors_json",
        ]

    def get_date(self, obj):
        return obj.date.isoformat() if obj.date else None


class NewsSerializer(serializers.ModelSerializer):
    added_on = serializers.SerializerMethodField()

    class Meta:
        model = News
        fields = [
            "id",
            "title",
            "description",
            "added_on",
            "journal_id",
        ]

    def get_added_on(self, obj):
        return obj.added_on.isoformat() if obj.added_on else None


class RoleRequestCreateSerializer(serializers.Serializer):
    requested_role = serializers.ChoiceField(choices=["author", "reviewer", "editor"])
    reason = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)


class RoleRequestProcessSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject"])
    admin_notes = serializers.CharField(max_length=500, required=False, allow_blank=True, allow_null=True)
    journal_id = serializers.IntegerField(required=False, allow_null=True)


class SwitchRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["author", "reviewer", "editor", "admin"])


class WebhookPayloadSerializer(serializers.Serializer):
    webhook_id = serializers.CharField()
    event_type = serializers.CharField()
    timestamp = serializers.DateTimeField()
    recipient_email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    error_code = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    error_message = serializers.CharField(required=False, allow_null=True, allow_blank=True)




# ---------------------------------------------------------------------------
# Books & Conference Proceedings
# ---------------------------------------------------------------------------


def _build_media_url(value, request=None):
    """Absolute URL for a file stored under MEDIA_ROOT.

    The SPA is served from a different origin than the API, so a bare
    "/media/..." path would resolve against the frontend and 404. Same approach
    as _build_journal_media_url above, minus the legacy-CDN fallback.
    """
    if not value:
        return None
    if value.startswith(("http://", "https://")):
        return value
    path = value.lstrip("/")
    if path.startswith("media/"):
        path = path[len("media/"):]
    if request:
        return request.build_absolute_uri(f"/media/{path}")
    return f"/media/{path}"


class BookSeriesSerializer(serializers.ModelSerializer):
    volumes = serializers.SerializerMethodField()

    class Meta:
        model = BookSeries
        fields = ["id", "abbreviation", "name", "description", "volumes"]

    def get_volumes(self, obj):
        # Annotated by the view where available, so the list endpoint stays
        # at one query instead of one per series.
        count = getattr(obj, "book_count", None)
        return count if count is not None else obj.books.filter(is_published=True).count()


class BookContributorSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookContributor
        fields = ["id", "name", "affiliation", "role", "order"]


class BookChapterSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookChapter
        fields = [
            "id", "title", "authors", "doi", "start_page", "end_page",
            "is_open_access", "order",
        ]


class BookListSerializer(serializers.ModelSerializer):
    series_abbreviation = serializers.CharField(source="series.abbreviation", default=None, read_only=True)
    cover_image = serializers.SerializerMethodField()
    series_line = serializers.SerializerMethodField()
    contributors_line = serializers.SerializerMethodField()
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    year = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            "id", "title", "subtitle", "slug", "kind", "kind_label",
            "series_abbreviation", "series_line", "volume_no",
            "contributors_line", "isbn", "doi", "pages", "year",
            "cover_image", "is_open_access",
        ]

    def get_cover_image(self, obj):
        return _build_media_url(obj.cover_image, self.context.get("request"))

    def get_year(self, obj):
        return obj.published_on.year if obj.published_on else None

    def get_series_line(self, obj):
        if obj.kind == Book.KIND_PROCEEDINGS and obj.conference_name:
            return f"Proceedings · {obj.conference_name}"
        if obj.is_open_access:
            return "Open access"
        if obj.series and obj.volume_no:
            return f"{obj.series.abbreviation} · Vol. {obj.volume_no}"
        if obj.series:
            return obj.series.abbreviation
        if obj.edition:
            return f"{obj.get_kind_display()} · {obj.edition}"
        return obj.get_kind_display()

    def get_contributors_line(self, obj):
        people = list(obj.contributors.all())
        if not people:
            return ""
        names = [p.name for p in people]
        suffix = " (eds.)" if people[0].role == BookContributor.ROLE_EDITOR else ""
        if len(names) > 3:
            return f"{names[0]} et al.{suffix}"
        return ", ".join(names) + suffix


class BookDetailSerializer(BookListSerializer):
    contributors = BookContributorSerializer(many=True, read_only=True)
    chapters = BookChapterSerializer(many=True, read_only=True)

    class Meta(BookListSerializer.Meta):
        fields = BookListSerializer.Meta.fields + [
            "abstract", "edition", "language", "published_on",
            "conference_name", "conference_acronym", "conference_start",
            "conference_end", "conference_venue", "conference_organiser",
            "conference_url", "contributors", "chapters",
        ]


class DownloadAssetSerializer(serializers.ModelSerializer):
    audience_label = serializers.CharField(source="get_audience_display", read_only=True)
    size_label = serializers.SerializerMethodField()
    file = serializers.SerializerMethodField()

    class Meta:
        model = DownloadAsset
        fields = [
            "id", "label", "audience", "audience_label", "file",
            "file_format", "size_label", "note", "revised_on",
        ]

    def get_file(self, obj):
        return _build_media_url(obj.file, self.context.get("request"))

    def get_size_label(self, obj):
        if not obj.size_bytes:
            return None
        kb = obj.size_bytes / 1024
        if kb < 1024:
            return f"{kb:.0f} KB"
        return f"{kb / 1024:.1f} MB"


class ProceedingsProposalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProceedingsProposal
        fields = [
            "id", "conference_name", "conference_type", "organising_body",
            "subject_area", "conference_start", "conference_end", "venue",
            "expected_papers", "selection_process", "website",
            "announcement_url", "message", "contact_name", "contact_email",
            "contact_phone", "contact_designation", "status", "submitted_on",
        ]
        read_only_fields = ["id", "status", "submitted_on"]

    def validate(self, attrs):
        start, end = attrs.get("conference_start"), attrs.get("conference_end")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"conference_end": "The end date cannot be before the start date."}
            )
        return attrs


class BookProposalSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookProposal
        fields = [
            "id", "title", "kind", "series", "synopsis", "outline",
            "audience", "comparable_works", "completion_status",
            "expected_delivery", "estimated_pages", "estimated_words",
            "illustration_count", "previously_published", "author_bio",
            "suggested_reviewers", "contact_name", "contact_email",
            "affiliation", "status", "submitted_on",
        ]
        read_only_fields = ["id", "status", "submitted_on"]


# ---------------------------------------------------------------------------
# Staff-facing serializers (admin / editor)
# ---------------------------------------------------------------------------


class AdminBookSeriesSerializer(serializers.ModelSerializer):
    book_count = serializers.SerializerMethodField()

    class Meta:
        model = BookSeries
        fields = ["id", "abbreviation", "name", "description", "is_active", "book_count"]

    def get_book_count(self, obj):
        count = getattr(obj, "annotated_count", None)
        return count if count is not None else obj.books.count()


class AdminBookChapterSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookChapter
        fields = [
            "id", "title", "authors", "abstract", "doi",
            "start_page", "end_page", "pdf", "is_open_access", "order",
        ]

    def validate(self, attrs):
        start = attrs.get("start_page", getattr(self.instance, "start_page", None))
        end = attrs.get("end_page", getattr(self.instance, "end_page", None))
        if start is not None and end is not None and end < start:
            raise serializers.ValidationError(
                {"end_page": "The last page cannot come before the first."}
            )
        return attrs


class AdminBookSerializer(serializers.ModelSerializer):
    """Full read/write shape for staff. Contributors and chapters are nested
    read-only; chapters have their own endpoints, contributors are written as a
    flat list via `contributor_names`."""

    series_abbreviation = serializers.CharField(
        source="series.abbreviation", default=None, read_only=True
    )
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    production_label = serializers.CharField(source="get_production_status_display", read_only=True)
    managing_editor_email = serializers.CharField(
        source="managing_editor.email", default=None, read_only=True
    )
    chapters = AdminBookChapterSerializer(many=True, read_only=True)
    contributors = BookContributorSerializer(many=True, read_only=True)
    chapter_count = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            "id", "title", "subtitle", "slug", "series", "series_abbreviation",
            "volume_no", "kind", "kind_label", "abstract", "isbn", "eisbn",
            "doi", "pages", "edition", "language", "cover_image",
            "is_open_access", "is_published", "production_status",
            "production_label", "managing_editor", "managing_editor_email",
            "source_proposal_id", "published_on",
            "conference_name", "conference_acronym", "conference_number",
            "conference_start", "conference_end", "conference_venue",
            "conference_organiser", "conference_url",
            "added_on", "updated_on", "chapters", "contributors", "chapter_count",
        ]
        read_only_fields = ["id", "added_on", "updated_on", "source_proposal_id"]

    def get_chapter_count(self, obj):
        return obj.chapters.count()

    def validate_slug(self, value):
        qs = Book.objects.filter(slug=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("Another title already uses this slug.")
        return value


class AdminDownloadAssetSerializer(serializers.ModelSerializer):
    audience_label = serializers.CharField(source="get_audience_display", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = DownloadAsset
        fields = [
            "id", "label", "audience", "audience_label", "file", "file_url",
            "file_format", "size_bytes", "note", "revised_on", "is_active", "order",
        ]
        read_only_fields = ["id", "file", "file_format", "size_bytes"]

    def get_file_url(self, obj):
        return _build_media_url(obj.file, self.context.get("request"))


class BookGuestEditorSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    account_email = serializers.CharField(source="user.email", default=None, read_only=True)
    invited_by_email = serializers.CharField(source="invited_by.email", default=None, read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = BookGuestEditor
        fields = [
            "id", "name", "email", "affiliation", "status", "status_label",
            "account_email", "invited_by_email", "invitation_message",
            "decline_reason", "invited_on", "responded_on", "is_expired", "order",
        ]
        read_only_fields = ["id", "status", "invited_on", "responded_on"]

    def get_is_expired(self, obj):
        from django.utils import timezone
        return obj.status == BookGuestEditor.STATUS_INVITED and obj.token_expiry < timezone.now()
