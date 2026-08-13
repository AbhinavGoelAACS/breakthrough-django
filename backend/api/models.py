from django.db import models


class User(models.Model):
    class Meta:
        db_table = "user"
        managed = False

    id = models.AutoField(primary_key=True)
    email = models.CharField(max_length=255, unique=True)
    password = models.CharField(max_length=255)
    role = models.CharField(max_length=50, null=True, blank=True, default="User")
    fname = models.CharField(max_length=100, null=True, blank=True)
    lname = models.CharField(max_length=100, null=True, blank=True)
    mname = models.CharField(max_length=100, null=True, blank=True)
    title = models.CharField(max_length=100, null=True, blank=True)
    affiliation = models.CharField(max_length=255, null=True, blank=True)
    specialization = models.TextField(null=True, blank=True)
    contact = models.CharField(max_length=20, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    added_on = models.DateTimeField(null=True, blank=True)
    salutation = models.CharField(max_length=20, null=True, blank=True)
    designation = models.CharField(max_length=100, null=True, blank=True)
    department = models.CharField(max_length=200, null=True, blank=True)
    organisation = models.CharField(max_length=255, null=True, blank=True)
    profile_picture = models.CharField(max_length=500, null=True, blank=True)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_active(self):
        return True

    @property
    def status(self):
        return "active"

    def __str__(self) -> str:
        return self.email


class Journal(models.Model):
    class Meta:
        db_table = "journal"
        managed = False

    fld_id = models.AutoField(primary_key=True)
    fld_journal_name = models.CharField(max_length=200, null=True, blank=True)
    freq = models.CharField(max_length=250, null=True, blank=True)
    issn_ol = models.CharField(max_length=250, null=True, blank=True)
    issn_prt = models.CharField(max_length=250, null=True, blank=True)
    cheif_editor = models.CharField(max_length=250, null=True, blank=True)
    co_editor = models.CharField(max_length=250, null=True, blank=True)
    password = models.CharField(max_length=100)
    abs_ind = models.CharField(max_length=300, null=True, blank=True)
    short_form = models.CharField(max_length=255)
    journal_image = models.CharField(max_length=255)
    journal_logo = models.CharField(max_length=200)
    guidelines = models.TextField(null=True, blank=True)
    copyright = models.TextField(null=True, blank=True)
    membership = models.TextField(null=True, blank=True)
    subscription = models.TextField(null=True, blank=True)
    publication = models.TextField(null=True, blank=True)
    advertisement = models.TextField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    added_on = models.DateField()


class JournalDetails(models.Model):
    class Meta:
        db_table = "journal_details"
        managed = False

    id = models.AutoField(primary_key=True)
    journal_id = models.CharField(max_length=50)
    about_journal = models.TextField(null=True, blank=True)
    cheif_say = models.TextField(null=True, blank=True)
    aim_objective = models.TextField(null=True, blank=True)
    criteria = models.TextField(null=True, blank=True)
    scope = models.TextField(null=True, blank=True)
    guidelines = models.TextField(null=True, blank=True)
    readings = models.TextField(null=True, blank=True)
    added_on = models.DateTimeField()


class Volume(models.Model):
    class Meta:
        db_table = "volume"
        managed = False

    id = models.AutoField(primary_key=True)
    journal = models.CharField(max_length=250)
    volume_no = models.IntegerField()
    year = models.CharField(max_length=200, null=True, blank=True)
    added_on = models.DateField(null=True, blank=True)


class Issue(models.Model):
    class Meta:
        db_table = "issue"
        managed = False

    id = models.AutoField(primary_key=True)
    pages = models.CharField(max_length=7, null=True, blank=True)
    month = models.CharField(max_length=16, null=True, blank=True)
    volume = models.IntegerField(null=True, blank=True)
    journal = models.IntegerField(null=True, blank=True)
    add_on = models.CharField(max_length=10, null=True, blank=True)
    issue_no = models.IntegerField(null=True, blank=True)
    complete_issue = models.CharField(max_length=10, null=True, blank=True)


class PaperPublished(models.Model):
    class Meta:
        db_table = "paper_published"
        managed = False

    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=250)
    abstract = models.CharField(max_length=2000)
    p_reference = models.TextField(null=True, blank=True)
    author = models.CharField(max_length=1000)
    journal = models.CharField(max_length=250)
    journal_id = models.IntegerField()
    volume = models.CharField(max_length=250)
    issue = models.CharField(max_length=250)
    date = models.DateTimeField()
    pages = models.CharField(max_length=250)
    keyword = models.CharField(max_length=300)
    language = models.CharField(max_length=20)
    paper = models.CharField(max_length=200, null=True, blank=True)
    access_type = models.CharField(max_length=20)
    email = models.CharField(max_length=100, null=True, blank=True)
    affiliation = models.CharField(max_length=500, null=True, blank=True)
    co_authors_json = models.TextField(null=True, blank=True)
    doi = models.CharField(max_length=100, null=True, blank=True)
    doi_status = models.CharField(max_length=50)
    doi_registered_at = models.DateTimeField(null=True, blank=True)
    crossref_batch_id = models.CharField(max_length=100, null=True, blank=True)
    paper_submission_id = models.IntegerField(null=True, blank=True)


class PaperAccessAuditLog(models.Model):
    class Meta:
        db_table = "paper_access_audit_log"
        managed = True
        ordering = ["-changed_at"]

    id = models.AutoField(primary_key=True)
    published_paper_id = models.IntegerField()
    paper_submission_id = models.IntegerField(null=True, blank=True)
    journal_id = models.IntegerField(null=True, blank=True)
    old_access_type = models.CharField(max_length=20)
    new_access_type = models.CharField(max_length=20)
    changed_by_id = models.IntegerField(null=True, blank=True)
    changed_by_email = models.CharField(max_length=255, null=True, blank=True)
    changed_by_role = models.CharField(max_length=50, null=True, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)


class News(models.Model):
    class Meta:
        db_table = "news"
        managed = False

    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=300)
    description = models.TextField(null=True, blank=True)
    added_on = models.DateField(null=True, blank=True)
    journal_id = models.IntegerField(null=True, blank=True)


class UserRole(models.Model):
    class Meta:
        db_table = "user_role"
        managed = False

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    role = models.CharField(max_length=50)
    status = models.CharField(max_length=20)
    requested_at = models.DateTimeField()
    approved_by = models.IntegerField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_reason = models.TextField(null=True, blank=True)
    journal_id = models.IntegerField(null=True, blank=True)
    editor_type = models.CharField(max_length=50, null=True, blank=True)


class RoleRequest(models.Model):
    class Meta:
        db_table = "role_request"
        managed = False

    id = models.AutoField(primary_key=True)
    user_id = models.IntegerField()
    requested_role = models.CharField(max_length=50)
    status = models.CharField(max_length=20, default="pending")
    reason = models.TextField(null=True, blank=True)
    requested_at = models.DateTimeField()
    processed_by = models.IntegerField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(null=True, blank=True)


class Paper(models.Model):
    class Meta:
        db_table = "paper"
        managed = False

    id = models.AutoField(primary_key=True)
    paper_code = models.CharField(max_length=200, blank=True)
    journal = models.IntegerField(null=True, blank=True)
    title = models.CharField(max_length=500, default="")
    abstract = models.CharField(max_length=2500, default="")
    keyword = models.CharField(max_length=1000, default="")
    file = models.CharField(max_length=200, default="")
    title_page = models.CharField(max_length=200, null=True, blank=True, default="")
    blinded_manuscript = models.CharField(
        max_length=200, null=True, blank=True, default=""
    )
    revised_track_changes = models.CharField(
        max_length=200, null=True, blank=True, default=""
    )
    revised_clean = models.CharField(
        max_length=200, null=True, blank=True, default=""
    )
    response_to_reviewer = models.CharField(
        max_length=200, null=True, blank=True, default=""
    )
    added_on = models.DateTimeField(null=True, blank=True)
    added_by = models.CharField(max_length=100, default="")
    status = models.CharField(max_length=50, default="submitted")
    mailstatus = models.CharField(max_length=10, default="0")
    volume = models.CharField(max_length=100, default="")
    issue = models.CharField(max_length=100, default="")
    author = models.CharField(max_length=100, default="")
    coauth = models.CharField(max_length=200, default="")
    rev = models.CharField(max_length=200, default="")
    version_number = models.IntegerField(default=1)
    revision_count = models.IntegerField(default=0)
    revision_deadline = models.DateTimeField(null=True, blank=True)
    revision_notes = models.TextField(null=True, blank=True)
    revision_requested_date = models.DateTimeField(null=True, blank=True)
    revision_type = models.CharField(max_length=20, null=True, blank=True)
    editor_comments = models.TextField(null=True, blank=True)
    research_area = models.CharField(max_length=200, null=True, blank=True)
    message_to_editor = models.TextField(null=True, blank=True)
    paper_references = models.TextField(null=True, blank=True)
    terms_accepted = models.BooleanField(default=False)
    accepted_on = models.DateTimeField(null=True, blank=True)


class PaperComment(models.Model):
    class Meta:
        db_table = "paper_comment"
        managed = False

    id = models.AutoField(primary_key=True)
    paper_id = models.IntegerField(null=True, blank=True)
    comment_by = models.CharField(max_length=255, null=True, blank=True)
    comment_text = models.TextField(null=True, blank=True)
    added_on = models.DateTimeField(null=True, blank=True)


class OnlineReview(models.Model):
    class Meta:
        db_table = "online_review"
        managed = False

    id = models.AutoField(primary_key=True)
    paper_id = models.IntegerField(null=True, blank=True)
    reviewer_id = models.CharField(max_length=100, null=True, blank=True)
    assigned_on = models.DateTimeField(null=True, blank=True)
    submitted_on = models.DateTimeField(null=True, blank=True)
    date_submitted = models.DateTimeField(null=True, blank=True)
    review_status = models.CharField(max_length=50, default="pending")
    review_submission_id = models.IntegerField(null=True, blank=True)
    invitation_id = models.IntegerField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    # Automated review reminders (see management command send_review_reminders)
    reminder_count = models.IntegerField(default=0)
    last_reminder_at = models.DateTimeField(null=True, blank=True)


class Editor(models.Model):
    class Meta:
        db_table = "editor"
        managed = False

    id = models.AutoField(primary_key=True)
    editor_name = models.CharField(max_length=100, null=True, blank=True)
    editor_email = models.CharField(max_length=100, null=True, blank=True)
    editor_address = models.CharField(max_length=200, null=True, blank=True)
    editor_contact = models.CharField(max_length=100, null=True, blank=True)
    editor_affiliation = models.CharField(max_length=200, null=True, blank=True)
    editor_department = models.CharField(max_length=200, null=True, blank=True)
    editor_college = models.CharField(max_length=200, null=True, blank=True)
    password = models.CharField(max_length=200, null=True, blank=True)
    journal_id = models.IntegerField(null=True, blank=True)
    role = models.CharField(max_length=50, null=True, blank=True)
    editor_type = models.CharField(max_length=50, null=True, blank=True)
    added_on = models.DateTimeField(null=True, blank=True)


class ReviewerInvitation(models.Model):
    class Meta:
        db_table = "reviewer_invitation"
        managed = False

    id = models.AutoField(primary_key=True)
    paper_id = models.IntegerField()
    reviewer_id = models.IntegerField(null=True, blank=True)
    reviewer_email = models.CharField(max_length=255)
    reviewer_name = models.CharField(max_length=255, null=True, blank=True)
    journal_id = models.CharField(max_length=100, null=True, blank=True)
    invitation_token = models.CharField(max_length=255)
    token_expiry = models.DateTimeField()
    status = models.CharField(max_length=50, default="pending")
    invited_on = models.DateTimeField(null=True, blank=True)
    accepted_on = models.DateTimeField(null=True, blank=True)
    declined_on = models.DateTimeField(null=True, blank=True)
    invitation_message = models.TextField(null=True, blank=True)
    decline_reason = models.TextField(null=True, blank=True)
    is_external = models.BooleanField(default=False)
    auto_assign = models.BooleanField(default=False)
    for_version = models.IntegerField(null=True, blank=True)
    # Automated invitation reminders (see management command send_review_reminders)
    reminder_count = models.IntegerField(default=0)
    last_reminder_at = models.DateTimeField(null=True, blank=True)


class ReviewSubmission(models.Model):
    class Meta:
        db_table = "review_submission"
        managed = False

    id = models.AutoField(primary_key=True)
    paper_id = models.IntegerField()
    reviewer_id = models.CharField(max_length=100)
    assignment_id = models.IntegerField(null=True, blank=True)
    paper_version = models.IntegerField(default=1)
    technical_quality = models.IntegerField(null=True, blank=True)
    clarity = models.IntegerField(null=True, blank=True)
    originality = models.IntegerField(null=True, blank=True)
    significance = models.IntegerField(null=True, blank=True)
    overall_rating = models.IntegerField(null=True, blank=True)
    author_comments = models.TextField(null=True, blank=True)
    confidential_comments = models.TextField(null=True, blank=True)
    recommendation = models.CharField(max_length=50, null=True, blank=True)
    review_report_file = models.CharField(max_length=500, null=True, blank=True)
    file_version = models.IntegerField(default=1)
    status = models.CharField(max_length=50, default="draft")
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)


class PaperCoAuthor(models.Model):
    class Meta:
        db_table = "paper_co_author"
        managed = False

    id = models.AutoField(primary_key=True)
    paper_id = models.IntegerField()
    user_id = models.IntegerField(null=True, blank=True)
    salutation = models.CharField(max_length=20, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100)
    email = models.CharField(max_length=255, null=True, blank=True)
    designation = models.CharField(max_length=100, null=True, blank=True)
    department = models.CharField(max_length=200, null=True, blank=True)
    organisation = models.CharField(max_length=255, null=True, blank=True)
    author_order = models.IntegerField(default=1)
    is_corresponding = models.BooleanField(default=False)
    invitation_token = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)


class EmailTemplate(models.Model):
    class Meta:
        db_table = "email_template"
        managed = False

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    slug = models.CharField(max_length=50, unique=True)
    subject = models.CharField(max_length=500)
    body_template = models.TextField()
    placeholders = models.TextField(null=True, blank=True)
    category = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField(null=True, blank=True)


class PaperCorrespondence(models.Model):
    class Meta:
        db_table = "paper_correspondence"
        managed = False

    id = models.AutoField(primary_key=True)
    paper_id = models.IntegerField()
    sender_id = models.IntegerField(null=True, blank=True)
    sender_role = models.CharField(max_length=50, null=True, blank=True)
    recipient_email = models.CharField(max_length=255)
    recipient_name = models.CharField(max_length=255, null=True, blank=True)
    subject = models.CharField(max_length=500)
    body = models.TextField()
    template_id = models.IntegerField(null=True, blank=True)
    email_type = models.CharField(max_length=50)
    status_at_send = models.CharField(max_length=50, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    delivery_status = models.CharField(max_length=50, default="pending")
    webhook_id = models.CharField(max_length=100, null=True, blank=True)
    webhook_received_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)


class PaperVersion(models.Model):
    class Meta:
        db_table = "paper_version"
        managed = False

    id = models.AutoField(primary_key=True)
    paper_id = models.IntegerField()
    version_number = models.IntegerField()
    file = models.CharField(max_length=200)
    file_size = models.IntegerField(null=True, blank=True)
    uploaded_on = models.DateTimeField(null=True, blank=True)
    revision_reason = models.TextField(null=True, blank=True)
    change_summary = models.TextField(null=True, blank=True)
    uploaded_by = models.CharField(max_length=100)


class CopyrightForm(models.Model):
    """
    Model for copyright transfer forms required after paper acceptance.
    Authors must complete this form within 48 hours of acceptance.
    """
    class Meta:
        db_table = "copyright_form"
        managed = True

    id = models.AutoField(primary_key=True)
    paper_id = models.IntegerField()
    author_id = models.IntegerField()
    
    # Status tracking
    status = models.CharField(max_length=20, default="pending")  # pending, completed, expired
    
    # Deadline and reminders
    deadline = models.DateTimeField(null=True, blank=True)  # 48 hours from acceptance
    reminder_count = models.IntegerField(default=0)  # 0, 1, 2
    last_reminder_at = models.DateTimeField(null=True, blank=True)
    
    # Form data
    author_name = models.CharField(max_length=255, null=True, blank=True)
    author_affiliation = models.CharField(max_length=500, null=True, blank=True)
    co_authors_consent = models.BooleanField(null=True, default=False)  # Confirms co-authors agreed
    copyright_agreed = models.BooleanField(null=True, default=False)  # Agrees to transfer
    signature = models.CharField(max_length=255, null=True, blank=True)  # Digital signature (typed name)
    signed_date = models.DateTimeField(null=True, blank=True)
    
    # Additional declarations
    original_work = models.BooleanField(null=True, default=False)  # Work is original
    no_conflict = models.BooleanField(null=True, default=False)  # No conflict of interest
    rights_transfer = models.BooleanField(null=True, default=False)  # Agrees to rights transfer
    
    # Timestamps
    created_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)



# ---------------------------------------------------------------------------
# Books & Conference Proceedings
#
# These are new tables, so unlike the legacy models above they are
# managed = True and created by a real Django migration.
# ---------------------------------------------------------------------------


class BookSeries(models.Model):
    class Meta:
        db_table = "book_series"
        managed = True
        ordering = ["name"]
        verbose_name_plural = "book series"

    id = models.AutoField(primary_key=True)
    abbreviation = models.CharField(max_length=16, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    series_editor = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True,
        db_column="series_editor_id", related_name="edited_series",
    )
    is_active = models.BooleanField(default=True)
    added_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.abbreviation} — {self.name}"


class Book(models.Model):
    KIND_MONOGRAPH = "monograph"
    KIND_EDITED = "edited"
    KIND_TEXTBOOK = "textbook"
    KIND_PROCEEDINGS = "proceedings"
    KIND_CHOICES = [
        (KIND_MONOGRAPH, "Monograph"),
        (KIND_EDITED, "Edited volume"),
        (KIND_TEXTBOOK, "Textbook"),
        (KIND_PROCEEDINGS, "Proceedings"),
    ]

    # The standard sequential production pipeline. Ordered — a title moves
    # down this list and does not skip back except by explicit editor action.
    PRODUCTION_CHOICES = [
        ("commissioned", "Commissioned"),
        ("manuscript", "Manuscript delivered"),
        ("copyediting", "Copyediting"),
        ("typesetting", "Typesetting"),
        ("proofs", "Proofs with author"),
        ("published", "Published"),
    ]

    class Meta:
        db_table = "book"
        managed = True
        ordering = ["-published_on", "-id"]

    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=500)
    subtitle = models.CharField(max_length=500, null=True, blank=True)
    slug = models.SlugField(max_length=255, unique=True)
    series = models.ForeignKey(
        BookSeries, on_delete=models.SET_NULL, null=True, blank=True,
        db_column="series_id", related_name="books",
    )
    volume_no = models.IntegerField(null=True, blank=True)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default=KIND_MONOGRAPH)
    abstract = models.TextField(null=True, blank=True)
    isbn = models.CharField(max_length=32, null=True, blank=True)
    doi = models.CharField(max_length=100, null=True, blank=True)
    pages = models.IntegerField(null=True, blank=True)
    edition = models.CharField(max_length=50, null=True, blank=True)
    language = models.CharField(max_length=32, default="English")
    cover_image = models.CharField(max_length=500, null=True, blank=True)
    eisbn = models.CharField(max_length=32, null=True, blank=True)
    is_open_access = models.BooleanField(default=False)
    # Public visibility. Separate from production_status on purpose: a title can
    # be at "proofs" and still hidden, or published and temporarily withdrawn.
    is_published = models.BooleanField(default=True)
    production_status = models.CharField(
        max_length=20, choices=PRODUCTION_CHOICES, default="commissioned",
    )
    managing_editor = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True,
        db_column="managing_editor_id", related_name="managed_books",
    )
    # Set when the title was created from an accepted proposal
    source_proposal_id = models.IntegerField(null=True, blank=True)
    published_on = models.DateField(null=True, blank=True)
    # Conference metadata, for volumes from the proceedings programme.
    # Crossref registers proceedings as a distinct record type and wants event
    # metadata (name required; acronym, number, location and date encouraged) —
    # a single conference_name string cannot produce that deposit.
    conference_name = models.CharField(max_length=500, null=True, blank=True)
    conference_acronym = models.CharField(max_length=64, null=True, blank=True)
    conference_number = models.IntegerField(null=True, blank=True)
    conference_start = models.DateField(null=True, blank=True)
    conference_end = models.DateField(null=True, blank=True)
    conference_venue = models.CharField(max_length=500, null=True, blank=True)
    conference_organiser = models.CharField(max_length=500, null=True, blank=True)
    conference_url = models.CharField(max_length=500, null=True, blank=True)
    added_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class BookContributor(models.Model):
    ROLE_AUTHOR = "author"
    ROLE_EDITOR = "editor"
    ROLE_CHOICES = [(ROLE_AUTHOR, "Author"), (ROLE_EDITOR, "Editor")]

    class Meta:
        db_table = "book_contributor"
        managed = True
        ordering = ["book_id", "order"]

    id = models.AutoField(primary_key=True)
    book = models.ForeignKey(
        Book, on_delete=models.CASCADE, db_column="book_id", related_name="contributors",
    )
    user = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True, db_column="user_id",
    )
    name = models.CharField(max_length=255)
    affiliation = models.CharField(max_length=500, null=True, blank=True)
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default=ROLE_AUTHOR)
    order = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} ({self.role})"


class BookChapter(models.Model):
    class Meta:
        db_table = "book_chapter"
        managed = True
        ordering = ["book_id", "order"]

    id = models.AutoField(primary_key=True)
    book = models.ForeignKey(
        Book, on_delete=models.CASCADE, db_column="book_id", related_name="chapters",
    )
    title = models.CharField(max_length=500)
    authors = models.CharField(max_length=1000, null=True, blank=True)
    abstract = models.TextField(null=True, blank=True)
    doi = models.CharField(max_length=100, null=True, blank=True)
    start_page = models.IntegerField(null=True, blank=True)
    end_page = models.IntegerField(null=True, blank=True)
    pdf = models.CharField(max_length=500, null=True, blank=True)
    # Needed to check the open-choice ceiling: above 40% of papers, the whole
    # volume should be published open access instead.
    is_open_access = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    def __str__(self):
        return self.title


class DownloadAsset(models.Model):
    """Templates, guidelines and forms listed on the proceedings page.

    Kept in the database so a revised template does not need a frontend
    release — only the file and its revision date change.
    """

    AUDIENCE_AUTHOR = "author"
    AUDIENCE_EDITOR = "editor"
    AUDIENCE_FORMS = "forms"
    AUDIENCE_REFERENCE = "reference"
    AUDIENCE_CHOICES = [
        (AUDIENCE_AUTHOR, "Authors"),
        (AUDIENCE_EDITOR, "Editors"),
        (AUDIENCE_FORMS, "Forms"),
        (AUDIENCE_REFERENCE, "Reference"),
    ]

    class Meta:
        db_table = "download_asset"
        managed = True
        ordering = ["audience", "order", "label"]

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=255)
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default=AUDIENCE_AUTHOR)
    file = models.CharField(max_length=500)
    file_format = models.CharField(max_length=16, null=True, blank=True)
    size_bytes = models.BigIntegerField(null=True, blank=True)
    note = models.CharField(max_length=255, null=True, blank=True)
    revised_on = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    def __str__(self):
        return self.label


class ProceedingsProposal(models.Model):
    CONFERENCE_TYPE_CHOICES = [
        ("national", "National"),
        ("international", "International"),
    ]
    SELECTION_PROCESS_CHOICES = [
        ("peer_reviewed", "Peer-reviewed"),
        ("non_reviewed", "Not peer-reviewed"),
    ]
    STATUS_CHOICES = [
        ("submitted", "Submitted"),
        ("under_review", "Under review"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
    ]

    class Meta:
        db_table = "proceedings_proposal"
        managed = True
        ordering = ["-submitted_on"]

    id = models.AutoField(primary_key=True)
    conference_name = models.CharField(max_length=500)
    organising_body = models.CharField(max_length=500, null=True, blank=True)
    subject_area = models.CharField(max_length=255, null=True, blank=True)
    conference_start = models.DateField(null=True, blank=True)
    conference_end = models.DateField(null=True, blank=True)
    expected_papers = models.IntegerField(null=True, blank=True)
    website = models.CharField(max_length=500, null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    # Conference detail (asked for by every proceedings publisher we surveyed)
    conference_type = models.CharField(
        max_length=20, choices=CONFERENCE_TYPE_CHOICES, null=True, blank=True,
    )
    venue = models.CharField(max_length=500, null=True, blank=True)
    # A real conference has a public announcement page — cheap authenticity check
    announcement_url = models.CharField(max_length=500, null=True, blank=True)
    selection_process = models.CharField(
        max_length=20, choices=SELECTION_PROCESS_CHOICES, null=True, blank=True,
    )

    contact_name = models.CharField(max_length=255)
    contact_email = models.EmailField(max_length=255)
    contact_phone = models.CharField(max_length=32, null=True, blank=True)
    contact_designation = models.CharField(max_length=255, null=True, blank=True)
    consent_given = models.BooleanField(default=False)

    submitted_by = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True, db_column="submitted_by_id",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="submitted")
    submitted_on = models.DateTimeField(auto_now_add=True)

    # Editorial decision
    decided_by = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True,
        db_column="decided_by_id", related_name="decided_proceedings_proposals",
    )
    decided_on = models.DateTimeField(null=True, blank=True)
    decision_note = models.TextField(null=True, blank=True)
    # Set once an editor turns this proposal into a catalogue volume
    converted_book = models.ForeignKey(
        "Book", on_delete=models.SET_NULL, null=True, blank=True,
        db_column="converted_book_id", related_name="+",
    )

    def __str__(self):
        return self.conference_name


class BookProposal(models.Model):
    COMPLETION_CHOICES = [
        ("idea", "Idea stage"),
        ("partial", "Partially drafted"),
        ("substantially", "Substantially complete"),
        ("complete", "Complete manuscript"),
    ]
    STATUS_CHOICES = [
        ("submitted", "Submitted"),
        ("under_review", "Under review"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
    ]

    class Meta:
        db_table = "book_proposal"
        managed = True
        ordering = ["-submitted_on"]

    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=500)
    kind = models.CharField(max_length=20, choices=Book.KIND_CHOICES, default=Book.KIND_MONOGRAPH)
    series = models.ForeignKey(
        BookSeries, on_delete=models.SET_NULL, null=True, blank=True, db_column="series_id",
    )
    synopsis = models.TextField()
    outline = models.TextField(null=True, blank=True)
    audience = models.TextField(null=True, blank=True)
    estimated_pages = models.IntegerField(null=True, blank=True)
    # What acquisitions editors actually decide on
    comparable_works = models.TextField(null=True, blank=True)
    completion_status = models.CharField(
        max_length=24, choices=COMPLETION_CHOICES, null=True, blank=True,
    )
    expected_delivery = models.DateField(null=True, blank=True)
    estimated_words = models.IntegerField(null=True, blank=True)
    illustration_count = models.IntegerField(null=True, blank=True)
    previously_published = models.TextField(null=True, blank=True)
    author_bio = models.TextField(null=True, blank=True)
    suggested_reviewers = models.TextField(null=True, blank=True)

    # Optional attachments, stored under MEDIA_ROOT/proposals/<id>/
    outline_file = models.CharField(max_length=500, null=True, blank=True)
    cv_file = models.CharField(max_length=500, null=True, blank=True)
    sample_chapter_file = models.CharField(max_length=500, null=True, blank=True)

    contact_name = models.CharField(max_length=255)
    contact_email = models.EmailField(max_length=255)
    affiliation = models.CharField(max_length=500, null=True, blank=True)
    consent_given = models.BooleanField(default=False)

    submitted_by = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True, db_column="submitted_by_id",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="submitted")
    submitted_on = models.DateTimeField(auto_now_add=True)

    # Editorial decision
    decided_by = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True,
        db_column="decided_by_id", related_name="decided_book_proposals",
    )
    decided_on = models.DateTimeField(null=True, blank=True)
    decision_note = models.TextField(null=True, blank=True)
    # Set once an editor turns this proposal into a catalogue title
    converted_book = models.ForeignKey(
        "Book", on_delete=models.SET_NULL, null=True, blank=True,
        db_column="converted_book_id", related_name="+",
    )

    def __str__(self):
        return self.title


class BookGuestEditor(models.Model):
    """A guest editor invited to work on one specific volume.

    Distinct from BookContributor on purpose:
      - BookContributor is *bibliographic* — the public byline, and may name
        people who have no account here at all.
      - BookGuestEditor is *authorisation* — who may sign in and actually edit
        this volume's metadata, contributors and chapters.

    A volume can have any number of them, which is the normal case for an
    edited collection or a conference proceedings volume. Accepting an
    invitation also creates the matching BookContributor row, so the byline
    stays correct without anyone having to type the name twice.
    """

    STATUS_INVITED = "invited"
    STATUS_ACTIVE = "active"
    STATUS_DECLINED = "declined"
    STATUS_REMOVED = "removed"
    STATUS_CHOICES = [
        (STATUS_INVITED, "Invited"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_DECLINED, "Declined"),
        (STATUS_REMOVED, "Removed"),
    ]

    class Meta:
        db_table = "book_guest_editor"
        managed = True
        ordering = ["book_id", "order", "id"]
        # The same person cannot be invited to the same volume twice.
        unique_together = [("book", "email")]

    id = models.AutoField(primary_key=True)
    book = models.ForeignKey(
        Book, on_delete=models.CASCADE, db_column="book_id", related_name="guest_editors",
    )
    # Null until they sign in and accept — we invite by email address.
    user = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True,
        db_column="user_id", related_name="guest_editorships",
    )
    email = models.EmailField(max_length=255)
    name = models.CharField(max_length=255)
    affiliation = models.CharField(max_length=500, null=True, blank=True)

    invitation_token = models.CharField(max_length=255, unique=True)
    token_expiry = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_INVITED)
    invitation_message = models.TextField(null=True, blank=True)
    decline_reason = models.TextField(null=True, blank=True)

    invited_by = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True,
        db_column="invited_by_id", related_name="+",
    )
    invited_on = models.DateTimeField(auto_now_add=True)
    responded_on = models.DateTimeField(null=True, blank=True)
    order = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} — {self.book_id} ({self.status})"

    @property
    def is_active(self):
        return self.status == self.STATUS_ACTIVE
