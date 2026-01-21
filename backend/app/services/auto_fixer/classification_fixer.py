"""
Classification Fixer

Functions for fixing content misclassification issues.
"""

import logging

from app.models.content import Content
from app.models.librarian import LibrarianAction

from .models import FixResult

logger = logging.getLogger(__name__)


async def fix_misclassification(
    content_id: str, new_category_id: str, audit_id: str, dry_run: bool = False
) -> FixResult:
    """Fix misclassified content."""
    if dry_run:
        return FixResult(
            success=True, error_message="[DRY RUN] Would fix misclassification"
        )

    try:
        content = await Content.get(content_id)
        if not content:
            return FixResult(success=False, error_message="Content not found")

        from app.models.content_taxonomy import ContentSection

        category = await ContentSection.get(new_category_id)
        if not category:
            return FixResult(success=False, error_message="Category not found")

        old_category_id = content.category_id
        content.category_id = new_category_id
        content.category_name = category.name
        await content.save()

        action = LibrarianAction(
            audit_id=audit_id,
            action_type="fix_misclassification",
            content_id=content_id,
            content_type="content",
            issue_type="misclassification",
            before_state={"category_id": old_category_id},
            after_state={"category_id": new_category_id},
            auto_approved=True,
            description=f"Fixed misclassification for '{content.title}'",
        )
        await action.insert()

        return FixResult(
            success=True, action_id=str(action.id), fields_updated=["category_id"]
        )

    except Exception as e:
        logger.error(f"Error fixing misclassification: {e}")
        return FixResult(success=False, error_message=str(e))
