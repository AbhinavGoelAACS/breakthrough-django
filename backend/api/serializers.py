from rest_framework import serializers

from .models import User, Journal, JournalDetails, PaperPublished, News


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


