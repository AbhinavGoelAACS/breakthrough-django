import logging
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from datetime import datetime

logger = logging.getLogger(__name__)


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

    plain_body = (
        f"Dear {author_name},\n\n"
        f"A decision has been made on your manuscript \"{paper.title}\" (ID: {paper_id_display}).\n\n"
        f"Decision: {decision_label}\n\n"
        f"Editor Comments:\n{editor_comments}\n\n"
    )

    if decision == "correction":
        deadline = ""
        if paper.revision_deadline:
            deadline = paper.revision_deadline.strftime("%B %d, %Y")
        plain_body += (
            f"Please submit your revised manuscript by {deadline}.\n"
            f"You can submit your revision through your author dashboard.\n\n"
        )
    elif decision == "accepted":
        plain_body += "Congratulations! Your manuscript has been accepted for publication.\n\n"

    plain_body += (
        "If you have any questions, please contact the editorial office.\n\n"
        "Best regards,\n"
        "BreakThrough Publishers"
    )

    success, _ = send_email(
        recipient_email=author.email,
        subject=subject,
        plain_body=plain_body,
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
        f"The status of your manuscript \"{paper.title}\" (ID: {paper_id_display}) "
        f"has been updated from \"{old_status}\" to \"{new_status}\".\n\n"
        f"You can check the latest status in your author dashboard.\n\n"
        "Best regards,\n"
        "BreakThrough Publishers"
    )

    success, _ = send_email(
        recipient_email=author.email,
        subject=subject,
        plain_body=plain_body,
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

    subject = f"Submission Received: {paper.title}"
    plain_body = (
        f"Dear {author_name},\n\n"
        f"Your manuscript \"{paper.title}\" (ID: {paper_id_display}) has been successfully submitted.\n\n"
        f"Our editorial team will review your submission and get back to you shortly.\n\n"
        "Best regards,\n"
        "BreakThrough Publishers"
    )

    success, _ = send_email(
        recipient_email=author.email,
        subject=subject,
        plain_body=plain_body,
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
        f"Paper Title: {paper.title}\n"
        f"Paper ID: {paper_id_display}\n"
    )

    if paper.abstract:
        plain_body += f"\nAbstract:\n{paper.abstract}\n"

    if invitation.token_expiry:
        deadline = invitation.token_expiry.strftime("%B %d, %Y")
        plain_body += f"\nPlease respond by: {deadline}\n"

    plain_body += f"\nTo accept or decline this invitation, please visit:\n{invitation_url}\n\n"

    if is_external:
        plain_body += (
            "Since you do not yet have an account with BreakThrough Publishers, "
            "you will be asked to create one when you accept the invitation.\n\n"
        )

    plain_body += (
        "If you are unable to review this manuscript, please decline the invitation "
        "using the link above so we can find an alternative reviewer.\n\n"
        "Thank you for your contribution to the peer review process.\n\n"
        "Best regards,\n"
        f"{journal_name}\n"
        "BreakThrough Publishers"
    )

    success, error = send_email(
        recipient_email=invitation.reviewer_email,
        subject=subject,
        plain_body=plain_body,
    )
    if not success:
        logger.error("Failed to send reviewer invitation email to %s: %s", invitation.reviewer_email, error)
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

    subject = f"New Submission: {paper.title}"

    any_sent = False
    for editor in editors:
        plain_body = (
            f"Dear {editor.editor_name or 'Editor'},\n\n"
            f"A new manuscript has been submitted to {journal_name}.\n\n"
            f"Title: {paper.title}\n"
            f"Paper ID: {paper_id_display}\n"
            f"Author: {author_name}\n"
        )

        if paper.abstract:
            plain_body += f"\nAbstract:\n{paper.abstract}\n"

        plain_body += (
            f"\nPlease log in to your editor dashboard to review this submission.\n"
            f"{_get_frontend_url()}/editor/papers/{paper.id}\n\n"
            "Best regards,\n"
            "BreakThrough Publishers"
        )

        success, _ = send_email(
            recipient_email=editor.editor_email,
            subject=subject,
            plain_body=plain_body,
        )
        if success:
            any_sent = True

    return any_sent
