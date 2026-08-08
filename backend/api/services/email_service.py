import logging
import threading
import queue as _queue
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Background email queue — fire-and-forget email delivery
# ---------------------------------------------------------------------------
_email_queue = _queue.Queue()


def _email_worker():
    """Daemon thread that drains the email queue and sends each message."""
    while True:
        task = _email_queue.get()
        if task is None:
            break
        fn, args, kwargs = task
        try:
            fn(*args, **kwargs)
        except Exception as exc:
            logger.error("Background email task failed: %s", exc)
        finally:
            _email_queue.task_done()


_email_thread = threading.Thread(target=_email_worker, daemon=True)
_email_thread.start()


def queue_email_task(fn, *args, **kwargs):
    """
    Schedule an email-sending callable to run in the background thread.
    The caller returns immediately (fire-and-forget).
    """
    _email_queue.put((fn, args, kwargs))


def _get_frontend_url():
    """Get frontend URL from Django settings, evaluated at call time."""
    return getattr(settings, 'FRONTEND_URL', 'https://dev.breakthroughpublishers.com')


def send_email(recipient_email, subject, plain_body, html_body=None, from_email=None):
    """
    Send an email and return (success, error_message).
    """
    sender = from_email or settings.DEFAULT_FROM_EMAIL
    try:
        if html_body:
            msg = EmailMultiAlternatives(subject, plain_body, sender, [recipient_email])
            msg.attach_alternative(html_body, "text/html")
            sent_count = msg.send(fail_silently=False)
        else:
            sent_count = send_mail(subject, plain_body, sender, [recipient_email], fail_silently=False)

        if sent_count < 1:
            logger.error(
                "Email backend reported zero deliveries to %s for subject %s",
                recipient_email,
                subject,
            )
            return False, "Email backend reported zero deliveries"

        logger.info("Email accepted for delivery to %s with subject %s", recipient_email, subject)
        return True, None
    except Exception as e:
        logger.error("Failed to send email to %s: %s", recipient_email, e)
        return False, str(e)


def send_correspondence_email(correspondence):
    """
    Send actual email for a PaperCorrespondence record and update its delivery status.
    """
    success, error = send_email(
        recipient_email=correspondence.recipient_email,
        subject=correspondence.subject,
        plain_body=correspondence.body,
    )
    if success:
        correspondence.delivery_status = "sent"
        correspondence.sent_at = timezone.now()
    else:
        correspondence.delivery_status = "failed"
        correspondence.error_message = error
        correspondence.retry_count = (correspondence.retry_count or 0) + 1
    correspondence.save()
    return success


def _log_correspondence(paper_id, recipient_email, recipient_name, subject, body,
                        email_type, sender_id=None, sender_role=None,
                        status_at_send=None, delivery_status="sent"):
    """
    Create a PaperCorrespondence record to log an automated email.
    Fails silently so it never breaks email delivery.
    """
    try:
        from api.models import PaperCorrespondence
        PaperCorrespondence.objects.create(
            paper_id=paper_id,
            sender_id=sender_id,
            sender_role=sender_role or 'system',
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            subject=subject,
            body=body,
            email_type=email_type,
            status_at_send=status_at_send,
            is_read=False,
            delivery_status=delivery_status,
            created_at=timezone.now(),
            sent_at=timezone.now() if delivery_status == "sent" else None,
        )
    except Exception as e:
        logger.error("Failed to log correspondence for paper %s: %s", paper_id, e)


def send_decision_notification(paper, decision, editor_comments, author):
    """
    Send an email to the author notifying them of an editor decision.
    """
    if not author or not author.email:
        return False

    author_name = f"{author.fname or ''} {author.lname or ''}".strip() or "Author"

    decision_labels = {
        "accepted": "Accepted",
        "rejected": "Rejected",
        "correction": "Revision Required",
    }
    decision_label = decision_labels.get(decision, decision.title())

    subject = f"Decision on Your Manuscript: {paper.title}"

    paper_id_display = paper.paper_code or paper.id


    # --- Reviewer Comments Section ---
    from backend.api.models import ReviewSubmission, User
    review_submissions = ReviewSubmission.objects.filter(paper_id=paper.id, status="submitted")
    reviewer_comments = []
    for idx, review in enumerate(review_submissions, 1):
        rec = review.recommendation or "--"
        comments = review.author_comments or "No comments provided."
        reviewer_comments.append(f"Reviewer #{idx} ({rec.title().replace('_', ' ')}):\n{comments}\n")
    reviewer_comments_text = "\n".join(reviewer_comments) if reviewer_comments else "No reviewer comments available."

    plain_body = (
        f"Dear {author_name},\n\n"
        f"We have completed the review of your manuscript, \"{paper.title}\" (ID: {paper_id_display}).\n\n"
        f"Decision: {decision_label}\n\n"
        f"Editor Comments:\n{editor_comments}\n\n"
        f"--- Reviewer Comments ---\n{reviewer_comments_text}\n\n"
    )

    if decision == "correction":
        deadline = ""
        if paper.revision_deadline:
            deadline = paper.revision_deadline.strftime("%B %d, %Y")
        plain_body += (
            f"Please submit your revised manuscript by {deadline}.\n"
            "When preparing your revision, please:\n"
            "- Carefully address each reviewer comment in a separate response letter.\n"
            "- Highlight all changes in the revised manuscript.\n"
            "- Upload only editable source files (Word, LaTeX). PDF is not allowed at this stage.\n"
            "- Check the website for possible reviewer attachments.\n\n"
            f"To submit your revision, log in to your author dashboard: {_get_frontend_url()}/login\n"
        )
        plain_body += (
            f"If you forgot your password, you can reset it using the 'Forgot Password' link on the login page.\n\n"
        )
    elif decision == "accepted":
        plain_body += "Congratulations! Your manuscript has been accepted for publication.\n\n"

    plain_body += (
        "If you have any questions, please contact the editorial office.\n\n"
        "Best regards,\n"
        "The Editorial Team\n"
        f"BreakThrough Publishers\n"
        f"{getattr(paper, 'journal', 'Journal')}\n"
        "\nThis letter contains confidential information for the author only.\n"
        "For privacy and data policy, see: https://breakthroughpublishers.com/privacy-policy\n"
    )

    success, _ = send_email(
        recipient_email=author.email,
        subject=subject,
        plain_body=plain_body,
    )
    _log_correspondence(
        paper_id=paper.id,
        recipient_email=author.email,
        recipient_name=author_name,
        subject=subject,
        body=plain_body,
        email_type='decision_notification',
        sender_role='editor',
        status_at_send=decision,
        delivery_status='sent' if success else 'failed',
    )
    return success


def send_status_update_notification(paper, old_status, new_status, author):
    """
    Send an email to the author notifying them of a paper status change.
    """
    if not author or not author.email:
        return False

    author_name = f"{author.fname or ''} {author.lname or ''}".strip() or "Author"

    paper_id_display = paper.paper_code or paper.id

    subject = f"Status Update: {paper.title}"
    plain_body = (
        f"Dear {author_name},\n\n"
        f"This is to inform you that the status of your manuscript has changed.\n\n"
        f"Title: {paper.title}\n"
        f"Manuscript ID: {paper_id_display}\n"
        f"Previous Status: {old_status}\n"
        f"Current Status: {new_status}\n\n"
        f"You can view the latest status and respond to any requests by logging in to your author dashboard: {_get_frontend_url()}/login\n\n"
        "If you have any questions, please contact the editorial office.\n\n"
        "Best regards,\n"
        "The Editorial Team\n"
        "BreakThrough Publishers\n"
        "\nThis letter contains confidential information for the author only.\n"
        "For privacy and data policy, see: https://breakthroughpublishers.com/privacy-policy\n"
    )

    success, _ = send_email(
        recipient_email=author.email,
        subject=subject,
        plain_body=plain_body,
    )
    _log_correspondence(
        paper_id=paper.id,
        recipient_email=author.email,
        recipient_name=author_name,
        subject=subject,
        body=plain_body,
        email_type='status_update',
        sender_role='system',
        status_at_send=new_status,
        delivery_status='sent' if success else 'failed',
    )
    return success


def send_submission_confirmation(paper, author):
    """
    Send a confirmation email to the author after a new paper submission.
    """
    if not author or not author.email:
        return False

    author_name = f"{author.fname or ''} {author.lname or ''}".strip() or "Author"

    paper_id_display = paper.paper_code or paper.id

    subject = f"Submission Confirmation: {paper.title}"
    plain_body = (
        f"Dear {author_name},\n\n"
        f"Thank you for submitting your manuscript to BreakThrough Publishers.\n\n"
        f"Title: {paper.title}\n"
        f"Manuscript ID: {paper_id_display}\n\n"
        "Our editorial team will review your submission and notify you of the next steps.\n\n"
        f"You can track your submission and respond to editorial requests by logging in to your author dashboard: {_get_frontend_url()}/login\n\n"
        "If you have any questions, please contact the editorial office.\n\n"
        "Best regards,\n"
        "The Editorial Team\n"
        "BreakThrough Publishers\n"
        "\nThis letter contains confidential information for the author only.\n"
        "For privacy and data policy, see: https://breakthroughpublishers.com/privacy-policy\n"
    )

    success, _ = send_email(
        recipient_email=author.email,
        subject=subject,
        plain_body=plain_body,
    )
    _log_correspondence(
        paper_id=paper.id,
        recipient_email=author.email,
        recipient_name=author_name,
        subject=subject,
        body=plain_body,
        email_type='submission_confirmation',
        sender_role='system',
        status_at_send=getattr(paper, 'status', None),
        delivery_status='sent' if success else 'failed',
    )
    return success


def send_reviewer_invitation_email(invitation, paper, journal_name, is_external=False):
    """
    Send an invitation email to a reviewer (existing or external).
    """
    if not invitation.reviewer_email:
        return False

    reviewer_name = invitation.reviewer_name or "Reviewer"
    invitation_url = f"{_get_frontend_url()}/invitations/{invitation.invitation_token}"

    paper_id_display = paper.paper_code or paper.id

    subject = f"Invitation to Review: {paper.title}"

    plain_body = (
        f"Dear {reviewer_name},\n\n"
        f"You have been invited to review a manuscript for {journal_name}.\n\n"
        f"Title: {paper.title}\n"
        f"Manuscript ID: {paper_id_display}\n"
        f"Abstract: {paper.abstract or 'N/A'}\n\n"
        f"To accept or decline this invitation, please use the following link:\n{invitation_url}\n\n"
    )
    if invitation.token_expiry:
        plain_body += f"Please respond by: {invitation.token_expiry.strftime('%B %d, %Y')}\n\n"
    if is_external:
        plain_body += "Since you do not yet have an account with BreakThrough Publishers, you will be asked to create one when you accept the invitation.\n\n"
    plain_body += (
        "By accepting this invitation, you agree to provide a fair, confidential, and timely review. If you are unable to review, please decline promptly so we can find an alternative reviewer.\n\n"
        "If you have any questions or require additional information, please contact the editorial office.\n\n"
        "Thank you for your contribution to the peer review process.\n\n"
        "Best regards,\n"
        "The Editorial Team\n"
        f"{journal_name}\n"
        "BreakThrough Publishers\n"
        "\nThis invitation and manuscript details are confidential.\n"
        "For privacy and data policy, see: https://breakthroughpublishers.com/privacy-policy\n"
    )

    success, error = send_email(
        recipient_email=invitation.reviewer_email,
        subject=subject,
        plain_body=plain_body,
    )
    if not success:
        logger.error("Failed to send reviewer invitation email to %s: %s", invitation.reviewer_email, error)
    _log_correspondence(
        paper_id=paper.id,
        recipient_email=invitation.reviewer_email,
        recipient_name=reviewer_name,
        subject=subject,
        body=plain_body,
        email_type='reviewer_invitation',
        sender_role='editor',
        status_at_send=getattr(paper, 'status', None),
        delivery_status='sent' if success else 'failed',
    )
    return success


def send_reviewer_invitation_reminder(invitation, paper, journal_name, is_final=False):
    """
    Remind a reviewer who has not yet responded to a pending review invitation.

    *is_final* marks the last reminder before the invitation expires.
    """
    if not invitation.reviewer_email:
        return False

    reviewer_name = invitation.reviewer_name or "Reviewer"
    invitation_url = f"{_get_frontend_url()}/invitations/{invitation.invitation_token}"
    paper_id_display = paper.paper_code or paper.id

    if is_final:
        subject = f"Final reminder — please respond to review invitation: {paper.title}"
        opening = (
            "This is a final reminder that your invitation to review the manuscript below is about to expire. "
            "If you are able to review, please accept soon so we can grant you access to the paper."
        )
    else:
        subject = f"Reminder — invitation to review: {paper.title}"
        opening = (
            "We recently invited you to review the manuscript below and have not yet received your response. "
            "We would be grateful if you could let us know whether you are able to review."
        )

    plain_body = (
        f"Dear {reviewer_name},\n\n"
        f"{opening}\n\n"
        f"Journal: {journal_name}\n"
        f"Title: {paper.title}\n"
        f"Manuscript ID: {paper_id_display}\n\n"
        f"To accept or decline this invitation, please use the following link:\n{invitation_url}\n\n"
    )
    if invitation.token_expiry:
        plain_body += f"Please respond by: {invitation.token_expiry.strftime('%B %d, %Y')}\n\n"
    plain_body += (
        "If you are unable to review, please decline promptly so we can find an alternative reviewer.\n\n"
        "Thank you for your contribution to the peer review process.\n\n"
        "Best regards,\n"
        "The Editorial Team\n"
        f"{journal_name}\n"
        "BreakThrough Publishers\n"
        "\nThis invitation and manuscript details are confidential.\n"
        "For privacy and data policy, see: https://breakthroughpublishers.com/privacy-policy\n"
    )

    success, error = send_email(
        recipient_email=invitation.reviewer_email,
        subject=subject,
        plain_body=plain_body,
    )
    if not success:
        logger.error("Failed to send invitation reminder to %s: %s", invitation.reviewer_email, error)
    _log_correspondence(
        paper_id=paper.id,
        recipient_email=invitation.reviewer_email,
        recipient_name=reviewer_name,
        subject=subject,
        body=plain_body,
        email_type='reviewer_invitation_reminder',
        sender_role='system',
        status_at_send=getattr(paper, 'status', None),
        delivery_status='sent' if success else 'failed',
    )
    return success


def send_review_due_reminder(paper, journal_name, reviewer_email, reviewer_name,
                             due_date=None, is_overdue=False):
    """
    Remind a reviewer who accepted an assignment but has not yet submitted the review.

    *is_overdue* switches wording between an upcoming-deadline nudge and an
    overdue nudge.
    """
    if not reviewer_email:
        return False

    reviewer_name = reviewer_name or "Reviewer"
    dashboard_url = f"{_get_frontend_url()}/reviewer-dashboard"
    paper_id_display = paper.paper_code or paper.id

    if is_overdue:
        subject = f"Overdue — review pending for: {paper.title}"
        opening = (
            "Our records show that your review for the manuscript below is now past its due date and "
            "has not yet been submitted. Please complete it at your earliest convenience."
        )
    else:
        subject = f"Reminder — review due soon for: {paper.title}"
        opening = (
            "This is a friendly reminder that your review for the manuscript below is due soon "
            "and has not yet been submitted."
        )

    plain_body = (
        f"Dear {reviewer_name},\n\n"
        f"{opening}\n\n"
        f"Journal: {journal_name}\n"
        f"Title: {paper.title}\n"
        f"Manuscript ID: {paper_id_display}\n"
    )
    if due_date:
        plain_body += f"Due date: {due_date.strftime('%B %d, %Y')}\n"
    plain_body += (
        f"\nTo access the manuscript and submit your review, please log in to your reviewer dashboard:\n{dashboard_url}\n\n"
        "If you are no longer able to complete this review, please contact the editorial office so we can make alternative arrangements.\n\n"
        "Thank you for your contribution to the peer review process.\n\n"
        "Best regards,\n"
        "The Editorial Team\n"
        f"{journal_name}\n"
        "BreakThrough Publishers\n"
        "\nThis manuscript and its details are confidential.\n"
        "For privacy and data policy, see: https://breakthroughpublishers.com/privacy-policy\n"
    )

    success, error = send_email(
        recipient_email=reviewer_email,
        subject=subject,
        plain_body=plain_body,
    )
    if not success:
        logger.error("Failed to send review-due reminder to %s: %s", reviewer_email, error)
    _log_correspondence(
        paper_id=paper.id,
        recipient_email=reviewer_email,
        recipient_name=reviewer_name,
        subject=subject,
        body=plain_body,
        email_type='review_due_reminder',
        sender_role='system',
        status_at_send=getattr(paper, 'status', None),
        delivery_status='sent' if success else 'failed',
    )
    return success


def notify_editors_new_submission(paper, author, journal):
    """
    Notify all editors of a journal that a new paper has been submitted.
    """
    from api.models import Editor

    journal_id = paper.journal
    if not journal_id:
        return False

    editors = Editor.objects.filter(journal_id=journal_id).exclude(
        editor_email__isnull=True
    ).exclude(editor_email="")

    if not editors.exists():
        return False

    author_name = "Unknown Author"
    if author:
        author_name = f"{author.fname or ''} {author.lname or ''}".strip() or author.email

    journal_name = journal.fld_journal_name if journal else "BreakThrough Publishers"

    paper_id_display = paper.paper_code or paper.id

    subject = f"New Manuscript Submitted: {paper.title}"

    any_sent = False
    for editor in editors:
        plain_body = (
            f"Dear {editor.editor_name or 'Editor'},\n\n"
            f"A new manuscript has been submitted to {journal_name}.\n\n"
            f"Title: {paper.title}\n"
            f"Manuscript ID: {paper_id_display}\n"
            f"Author: {author_name}\n"
            f"Abstract: {paper.abstract or 'N/A'}\n\n"
            f"To review this submission, please log in to your editor dashboard: {_get_frontend_url()}/editor/papers/{paper.id}\n\n"
            "If you have any questions or require additional information, please contact the managing editor.\n\n"
            "Best regards,\n"
            "The Editorial Team\n"
            f"{journal_name}\n"
            "BreakThrough Publishers\n"
            "\nThis notification and manuscript details are confidential.\n"
            "For privacy and data policy, see: https://breakthroughpublishers.com/privacy-policy\n"
        )
        success, _ = send_email(
            recipient_email=editor.editor_email,
            subject=subject,
            plain_body=plain_body,
        )
        _log_correspondence(
            paper_id=paper.id,
            recipient_email=editor.editor_email,
            recipient_name=editor.editor_name or 'Editor',
            subject=subject,
            body=plain_body,
            email_type='editor_notification',
            sender_role='system',
            status_at_send=getattr(paper, 'status', None),
            delivery_status='sent' if success else 'failed',
        )
        if success:
            any_sent = True

    return any_sent


def send_copyright_form_email(paper, author, deadline):
    """
    Send an email to the author notifying them to complete the copyright transfer form.
    """
    if not author or not author.email:
        return False

    author_name = f"{author.fname or ''} {author.lname or ''}".strip() or "Author"
    paper_id_display = paper.paper_code or paper.id
    dashboard_url = f"{_get_frontend_url()}/author"
    deadline_str = deadline.strftime("%B %d, %Y at %I:%M %p") if deadline else "48 hours from now"

    subject = f"Action Required: Copyright Transfer Form – {paper.title}"
    plain_body = (
        f"Dear {author_name},\n\n"
        f"Congratulations! Your manuscript has been accepted for publication.\n\n"
        f"Title: {paper.title}\n"
        f"Manuscript ID: {paper_id_display}\n"
        f"To proceed with publication, you must complete the Copyright Transfer Form by the deadline below.\n\n"
        f"Deadline: {deadline_str}\n\n"
        f"Please log in to your Author Dashboard to complete the form: {dashboard_url}\n\n"
        "The form requires you to:\n"
        "  - Confirm that the work is original\n"
        "  - Declare no conflicts of interest\n"
        "  - Transfer copyright to the publisher\n"
        "  - Confirm all co-authors have consented\n"
        "  - Provide your digital signature\n\n"
        "If the form is not completed by the deadline, your publication may be delayed.\n\n"
        "If you have any questions, please contact the editorial office.\n\n"
        "Best regards,\n"
        "The Editorial Team\n"
        "BreakThrough Publishers\n"
        "\nThis letter contains confidential information for the author only.\n"
        "For privacy and data policy, see: https://breakthroughpublishers.com/privacy-policy\n"
    )

    success, _ = send_email(
        recipient_email=author.email,
        subject=subject,
        plain_body=plain_body,
    )
    _log_correspondence(
        paper_id=paper.id,
        recipient_email=author.email,
        recipient_name=author_name,
        subject=subject,
        body=plain_body,
        email_type='copyright_form',
        sender_role='system',
        status_at_send=getattr(paper, 'status', None),
        delivery_status='sent' if success else 'failed',
    )
    return success


def send_coauthor_notification_email(coauthor_record, paper, submitting_author):
    """
    Send an email to a co-author notifying them they have been added to a paper.
    Includes a link to complete their profile and set their password.
    If the co-author is marked as corresponding author, the email reflects that.
    """
    if not coauthor_record.email:
        return False

    ca_name = f"{coauthor_record.first_name or ''} {coauthor_record.last_name or ''}".strip() or "Co-Author"
    submitter_name = f"{submitting_author.fname or ''} {submitting_author.lname or ''}".strip() or submitting_author.email
    paper_id_display = paper.paper_code or paper.id
    profile_url = f"{_get_frontend_url()}/complete-profile/{coauthor_record.invitation_token}"
    is_corresponding = getattr(coauthor_record, 'is_corresponding', False)

    role_label = "corresponding author" if is_corresponding else "co-author"

    subject = f"You have been added as {'corresponding author' if is_corresponding else 'a co-author'}: {paper.title}"

    corresponding_note = ""
    corresponding_note_html = ""
    if is_corresponding:
        corresponding_note = (
            "As the corresponding author, all editorial correspondence regarding this manuscript "
            "will be addressed to you.\n\n"
        )
        corresponding_note_html = (
            "<p><strong>As the corresponding author, all editorial correspondence regarding this manuscript "
            "will be addressed to you.</strong></p>"
        )

    plain_body = (
        f"Dear {ca_name},\n\n"
        f"You have been added as the {role_label} on the following manuscript submitted to BreakThrough Publishers.\n\n"
        f"Title: {paper.title}\n"
        f"Manuscript ID: {paper_id_display}\n"
        f"Submitted by: {submitter_name}\n\n"
        f"{corresponding_note}"
        "An account has been created for you on our platform. Please use the link below to set your password and complete your profile:\n{profile_url}\n\n"
        "Once your profile is complete, you can log in to view the submission and track its progress.\n\n"
        "If you have any questions or believe this was sent in error, please contact the editorial office.\n\n"
        "Best regards,\n"
        "The Editorial Team\n"
        "BreakThrough Publishers\n"
        "\nThis letter contains confidential information for the recipient only.\n"
        "For privacy and data policy, see: https://breakthroughpublishers.com/privacy-policy\n"
    )

    html_body = (
        f"<p>Dear {ca_name},</p>"
        f"<p>You have been added as the <strong>{role_label}</strong> on the following manuscript submitted to BreakThrough Publishers:</p>"
        f"<table style='border-collapse:collapse;margin:16px 0;'>"
        f"<tr><td style='padding:4px 12px 4px 0;font-weight:bold;'>Paper Title:</td><td>{paper.title}</td></tr>"
        f"<tr><td style='padding:4px 12px 4px 0;font-weight:bold;'>Paper ID:</td><td>{paper_id_display}</td></tr>"
        f"<tr><td style='padding:4px 12px 4px 0;font-weight:bold;'>Submitted by:</td><td>{submitter_name}</td></tr>"
        f"</table>"
        f"{corresponding_note_html}"
        f"<p>An account has been created for you on our platform. "
        f"Please click the button below to set your password and complete your profile:</p>"
        f"<p style='margin:24px 0;'>"
        f"<a href='{profile_url}' style='background-color:#2563eb;color:#fff;padding:12px 24px;"
        f"text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;'>"
        f"Complete Your Profile</a></p>"
        f"<p>Once your profile is complete, you can log in to view the submission and track its progress.</p>"
        f"<p>If you believe this was sent in error, please contact the editorial office.</p>"
        f"<p>Best regards,<br/>BreakThrough Publishers</p>"
    )

    success, error = send_email(
        recipient_email=coauthor_record.email,
        subject=subject,
        plain_body=plain_body,
        html_body=html_body,
    )
    if not success:
        logger.error("Failed to send co-author notification to %s: %s", coauthor_record.email, error)
    _log_correspondence(
        paper_id=paper.id,
        recipient_email=coauthor_record.email,
        recipient_name=ca_name,
        subject=subject,
        body=plain_body,
        email_type='coauthor_notification',
        sender_role='system',
        status_at_send=getattr(paper, 'status', None),
        delivery_status='sent' if success else 'failed',
    )
    return success


# ---------------------------------------------------------------------------
# Book & conference-proceedings proposals
# ---------------------------------------------------------------------------


def _proposal_reference(proposal, kind):
    """Human-quotable reference, e.g. BP-2026-000014 / CP-2026-000007."""
    prefix = "BP" if kind == "book" else "CP"
    year = proposal.submitted_on.year if proposal.submitted_on else "----"
    return f"{prefix}-{year}-{proposal.id:06d}"


def send_proposal_confirmation(proposal, kind):
    """Acknowledge a proposal to the person who submitted it.

    Deliberately states no turnaround time — the review timelines live on the
    public /books and /proceedings pages so there is a single place to change
    them, and so this email never becomes a commitment we have not agreed.
    """
    reference = _proposal_reference(proposal, kind)
    frontend = _get_frontend_url()

    if kind == "book":
        what = f'your book proposal, "{proposal.title}"'
        where = f"{frontend}/books"
    else:
        what = f'your proposal to publish the proceedings of {proposal.conference_name}'
        where = f"{frontend}/proceedings"

    subject = f"We received your proposal ({reference})"
    plain_body = (
        f"Dear {proposal.contact_name},\n\n"
        f"Thank you for sending us {what}.\n\n"
        f"Your reference number is {reference}. Please quote it in any "
        f"correspondence about this proposal.\n\n"
        f"A commissioning editor will read your proposal and get back to you. "
        f"You can find what happens next, and how long each stage takes, at "
        f"{where}.\n\n"
        f"If you need to add anything to your proposal, reply to this email "
        f"with the reference number in the subject line.\n\n"
        f"Best regards,\n"
        f"The Editorial Team\n"
        f"Breakthrough Publishers India"
    )

    return send_email(proposal.contact_email, subject, plain_body)


def notify_editorial_new_proposal(proposal, kind):
    """Alert the editorial inbox that a proposal has arrived."""
    reference = _proposal_reference(proposal, kind)
    recipient = getattr(settings, "EDITORIAL_EMAIL", None)
    if not recipient:
        logger.warning("EDITORIAL_EMAIL is not configured; proposal %s not notified", reference)
        return False, "EDITORIAL_EMAIL not configured"

    submitter = proposal.submitted_by
    account = submitter.email if submitter else "(no account)"

    if kind == "book":
        subject = f"New book proposal: {proposal.title} ({reference})"
        detail = (
            f"Title: {proposal.title}\n"
            f"Type: {proposal.get_kind_display()}\n"
            f"Series: {proposal.series.name if proposal.series else 'Not specified'}\n"
            f"Completion: {proposal.get_completion_status_display() if proposal.completion_status else 'Not specified'}\n"
            f"Expected delivery: {proposal.expected_delivery or 'Not specified'}\n"
            f"Estimated words: {proposal.estimated_words or 'Not specified'}\n"
            f"Illustrations: {proposal.illustration_count if proposal.illustration_count is not None else 'Not specified'}\n\n"
            f"Synopsis:\n{proposal.synopsis}\n\n"
            f"Audience:\n{proposal.audience or 'Not specified'}\n\n"
            f"Comparable works:\n{proposal.comparable_works or 'Not specified'}\n\n"
            f"Suggested reviewers:\n{proposal.suggested_reviewers or 'None suggested'}\n\n"
            f"CV attached: {'yes' if proposal.cv_file else 'no'}\n"
            f"Sample chapter attached: {'yes' if proposal.sample_chapter_file else 'no'}\n"
        )
    else:
        subject = f"New proceedings proposal: {proposal.conference_name} ({reference})"
        detail = (
            f"Conference: {proposal.conference_name}\n"
            f"Type: {proposal.get_conference_type_display() if proposal.conference_type else 'Not specified'}\n"
            f"Organiser: {proposal.organising_body or 'Not specified'}\n"
            f"Dates: {proposal.conference_start or '?'} to {proposal.conference_end or '?'}\n"
            f"Venue: {proposal.venue or 'Not specified'}\n"
            f"Subject area: {proposal.subject_area or 'Not specified'}\n"
            f"Expected papers: {proposal.expected_papers or 'Not specified'}\n"
            f"Paper selection: {proposal.get_selection_process_display() if proposal.selection_process else 'Not specified'}\n"
            f"Website: {proposal.website or 'Not provided'}\n"
            f"Announcement page: {proposal.announcement_url or 'Not provided'}\n\n"
            f"Message:\n{proposal.message or '(none)'}\n"
        )

    plain_body = (
        f"A new proposal has been submitted.\n\n"
        f"Reference: {reference}\n"
        f"Submitted: {proposal.submitted_on:%d %b %Y %H:%M} UTC\n\n"
        f"{detail}\n"
        f"--- Contact ---\n"
        f"Name: {proposal.contact_name}\n"
        f"Email: {proposal.contact_email}\n"
        f"Account: {account}\n"
    )

    if kind == "book":
        plain_body += f"Affiliation: {proposal.affiliation or 'Not specified'}\n"
    else:
        plain_body += (
            f"Designation: {proposal.contact_designation or 'Not specified'}\n"
            f"Phone: {proposal.contact_phone or 'Not provided'}\n"
        )

    return send_email(recipient, subject, plain_body)
