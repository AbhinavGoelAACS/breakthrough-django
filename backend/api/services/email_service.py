import logging
import threading
import queue as _queue
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from datetime import datetime

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
            msg.send(fail_silently=False)
        else:
            send_mail(subject, plain_body, sender, [recipient_email], fail_silently=False)
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
        correspondence.sent_at = datetime.utcnow()
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
            created_at=datetime.utcnow(),
            sent_at=datetime.utcnow() if delivery_status == "sent" else None,
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
