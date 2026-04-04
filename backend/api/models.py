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
    terms_accepted = models.BooleanField(default=False)


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
    assigned_on = models.DateField(null=True, blank=True)
    submitted_on = models.DateTimeField(null=True, blank=True)
    date_submitted = models.DateTimeField(null=True, blank=True)
    review_status = models.CharField(max_length=50, default="pending")
    review_submission_id = models.IntegerField(null=True, blank=True)
    invitation_id = models.IntegerField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)


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


