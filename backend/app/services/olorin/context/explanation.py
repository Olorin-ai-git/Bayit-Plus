"""
Reference Explanation

Get and format explanations for cultural references.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.models.cultural_reference import CulturalReference, ReferenceExplanation

logger = logging.getLogger(__name__)


async def get_explanation(
    reference_id: str,
    language: str = "en",
) -> Optional[ReferenceExplanation]:
    """
    Get explanation for a specific reference.

    Args:
        reference_id: Reference identifier
        language: Language for explanation

    Returns:
        Reference explanation or None if not found
    """
    ref = await CulturalReference.find_one(
        CulturalReference.reference_id == reference_id
    )
    if not ref:
        return None

    # Increment lookup count
    ref.lookup_count += 1
    ref.last_accessed_at = datetime.now(timezone.utc)
    await ref.save()

    # Get explanation in requested language
    if language == "en":
        short_exp = ref.short_explanation_en or ref.short_explanation
        detailed_exp = ref.detailed_explanation_en or ref.detailed_explanation
    elif language == "es":
        short_exp = ref.short_explanation_es or ref.short_explanation_en or ref.short_explanation
        detailed_exp = ref.detailed_explanation_es or ref.detailed_explanation_en or ref.detailed_explanation
    else:
        short_exp = ref.short_explanation
        detailed_exp = ref.detailed_explanation

    return ReferenceExplanation(
        reference_id=ref.reference_id,
        canonical_name=ref.canonical_name,
        canonical_name_en=ref.canonical_name_en,
        category=ref.category,
        subcategory=ref.subcategory,
        short_explanation=short_exp,
        detailed_explanation=detailed_exp,
        wikipedia_url=ref.wikipedia_url,
        image_url=ref.image_url,
        related_references=ref.related_references,
    )


def get_localized_explanation(
    ref: CulturalReference,
    language: str,
) -> tuple[Optional[str], Optional[str]]:
    """
    Get localized short and detailed explanations.

    Args:
        ref: Cultural reference document
        language: Target language code

    Returns:
        Tuple of (short_explanation, detailed_explanation)
    """
    if language == "en":
        return (
            ref.short_explanation_en or ref.short_explanation,
            ref.detailed_explanation_en or ref.detailed_explanation,
        )
    elif language == "es":
        return (
            ref.short_explanation_es or ref.short_explanation_en or ref.short_explanation,
            ref.detailed_explanation_es or ref.detailed_explanation_en or ref.detailed_explanation,
        )
    else:
        return ref.short_explanation, ref.detailed_explanation
