import logging
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from datetime import datetime

logger = logging.getLogger(__name__)


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

    plain_body = (
        f"Dear {author_name},\n\n"
        f"A decision has been made on your manuscript \"{paper.title}\" (ID: {paper.id}).\n\n"
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

    subject = f"Status Update: {paper.title}"
    plain_body = (
        f"Dear {author_name},\n\n"
        f"The status of your manuscript \"{paper.title}\" (ID: {paper.id}) "
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

    subject = f"Submission Received: {paper.title}"
    plain_body = (
        f"Dear {author_name},\n\n"
        f"Your manuscript \"{paper.title}\" (ID: {paper.id}) has been successfully submitted.\n\n"
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
