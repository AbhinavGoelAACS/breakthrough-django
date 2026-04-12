from .models import PaperAccessAuditLog


VALID_ACCESS_TYPES = {"open", "subscription"}


def validate_access_type(access_type):
    if access_type not in VALID_ACCESS_TYPES:
        raise ValueError("Invalid access type")


def serialize_access_audit_entry(audit):
    if not audit:
        return None

    return {
        "id": audit.id,
        "published_paper_id": audit.published_paper_id,
        "paper_submission_id": audit.paper_submission_id,
        "journal_id": audit.journal_id,
        "old_access_type": audit.old_access_type,
        "new_access_type": audit.new_access_type,
        "changed_by_id": audit.changed_by_id,
        "changed_by_email": audit.changed_by_email,
        "changed_by_role": audit.changed_by_role,
        "changed_at": audit.changed_at.isoformat() if audit.changed_at else None,
    }


def serialize_published_paper_access(published_paper, latest_audit=None):
    return {
        "id": published_paper.id,
        "paper_submission_id": published_paper.paper_submission_id,
        "title": published_paper.title,
        "author": published_paper.author,
        "journal": published_paper.journal,
        "journal_id": published_paper.journal_id,
        "doi": published_paper.doi,
        "doi_status": published_paper.doi_status,
        "access_type": published_paper.access_type,
        "date": published_paper.date.isoformat() if published_paper.date else None,
        "volume": published_paper.volume,
        "issue": published_paper.issue,
        "pages": published_paper.pages,
        "latest_access_audit": serialize_access_audit_entry(latest_audit),
    }


def update_published_paper_access(published_paper, access_type, actor=None):
    validate_access_type(access_type)

    old_access_type = (published_paper.access_type or "subscription").strip()
    if old_access_type == access_type:
        return None

    published_paper.access_type = access_type
    published_paper.save(update_fields=["access_type"])

    return PaperAccessAuditLog.objects.create(
        published_paper_id=published_paper.id,
        paper_submission_id=published_paper.paper_submission_id,
        journal_id=published_paper.journal_id,
        old_access_type=old_access_type,
        new_access_type=access_type,
        changed_by_id=getattr(actor, "id", None),
        changed_by_email=getattr(actor, "email", None),
        changed_by_role=getattr(actor, "role", None),
    )