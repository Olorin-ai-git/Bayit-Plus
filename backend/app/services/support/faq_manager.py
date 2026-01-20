"""
FAQ Manager
Handles FAQ entry retrieval and feedback recording.
"""

import logging
from typing import Optional, List

from app.models.support import FAQEntry

logger = logging.getLogger(__name__)


async def get_faq_by_category(
    category: Optional[str] = None,
    language: str = 'en',
) -> List[dict]:
    """Get FAQ entries, optionally filtered by category."""
    query = FAQEntry.find(FAQEntry.is_active == True)  # noqa: E712

    if category:
        query = query.find(FAQEntry.category == category)

    entries = await query.sort(FAQEntry.order).to_list()

    result = []
    for entry in entries:
        trans = entry.translations.get(language, {})
        result.append({
            'id': str(entry.id),
            'question': trans.get('question', entry.question_key),
            'answer': trans.get('answer', entry.answer_key),
            'category': entry.category,
            'views': entry.views,
            'helpful_yes': entry.helpful_yes,
            'helpful_no': entry.helpful_no,
        })

    return result


async def record_faq_view(faq_id: str) -> None:
    """Record a view for an FAQ entry."""
    try:
        entry = await FAQEntry.get(faq_id)
        if entry:
            entry.views += 1
            await entry.save()
    except Exception as e:
        logger.error(f'[Support] Error recording FAQ view: {e}')


async def record_faq_feedback(
    faq_id: str,
    helpful: bool,
) -> None:
    """Record feedback for an FAQ entry."""
    try:
        entry = await FAQEntry.get(faq_id)
        if entry:
            if helpful:
                entry.helpful_yes += 1
            else:
                entry.helpful_no += 1
            await entry.save()
    except Exception as e:
        logger.error(f'[Support] Error recording FAQ feedback: {e}')
