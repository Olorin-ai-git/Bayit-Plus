"""
Kids Intent Handler
Handles kids content requests with age detection and family controls
"""

import re
from typing import Any, Dict, List, Tuple

from app.core.logging_config import get_logger
from app.services.kids_content_service import kids_content_service
from ..context import VoiceContext
from ..error_messages import get_error_message

logger = get_logger(__name__)

# Age detection patterns for 3 languages
AGE_PATTERNS = {
    "he": [r'לגיל\s+(\d+)', r'בן\s+(\d+)', r'בת\s+(\d+)', r'גיל\s+(\d+)'],
    "en": [r'for\s+(\d+)\s+year', r'(\d+)\s+year\s+old', r'age\s+(\d+)', r'(\d+)\s+years\s+old'],
    "es": [r'para\s+(\d+)\s+años', r'de\s+(\d+)\s+años', r'edad\s+(\d+)']
}


async def handle_kids(
    transcript: str,
    context: VoiceContext
) -> Dict[str, Any]:
    """
    Handle kids content request with age detection and family controls.

    Args:
        transcript: User voice input
        context: Voice request context (with family_controls loaded)

    Returns:
        Dict with spoken_response and action
    """
    try:
        # Detect age from transcript
        age, age_group, is_youngsters = _detect_age_from_transcript(transcript, context.language)

        # Apply family controls override (stricter wins) with validation
        if context.family_controls:
            original_age = age
            age_limit = context.family_controls.kids_age_limit

            # Validate family controls age limit (0-18)
            if not (0 <= age_limit <= 18):
                logger.error(
                    "Invalid family controls age limit",
                    extra={
                        "user_id": context.user_id,
                        "age_limit": age_limit
                    }
                )
                age_limit = 12  # Safe default

            age = min(age, age_limit)

            if age < original_age:
                logger.info(
                    "Family controls applied",
                    extra={
                        "user_id": context.user_id,
                        "requested_age": original_age,
                        "limited_age": age
                    }
                )

        logger.info(
            "Kids content request",
            extra={
                "user_id": context.user_id,
                "age": age,
                "age_group": age_group,
                "is_youngsters": is_youngsters
            }
        )

        # Fetch content
        if is_youngsters:
            # Youngsters: ages 12-17, PG-13 content
            from app.services.youngsters_content_service import YoungstersContentService
            youngsters_service = YoungstersContentService()
            content = await youngsters_service.fetch_all_content(
                age_max=age,
                family_controls=context.family_controls
            )
        else:
            # Kids: ages 0-12
            content = await kids_content_service.fetch_all_content(
                age_max=age,
                family_controls=context.family_controls
            )

        # Format response
        spoken_response = _format_kids_response(content.items, age, context.language)

        return {
            "spoken_response": spoken_response,
            "action": {
                "type": "kids_content",
                "payload": {
                    "age": age,
                    "items": [
                        {
                            "id": item.id,
                            "title": item.title,
                            "age_rating": item.age_rating,
                            "category": item.category,
                            "thumbnail": item.thumbnail
                        }
                        for item in content.items[:5]
                    ]
                }
            }
        }

    except Exception as e:
        logger.error(
            "Kids handler failed",
            extra={"user_id": context.user_id, "error": str(e)},
            exc_info=True
        )
        return {
            "spoken_response": get_error_message("kids_content_empty", context.language),
            "action": {"type": "kids_content", "payload": {}}
        }


# Helper functions

def _detect_age_from_transcript(transcript: str, language: str) -> Tuple[int, str, bool]:
    """
    Detect age from transcript in specified language.

    Includes ReDoS protection via input length validation.

    Returns:
        (age, age_group, is_youngsters)
    """
    # ReDoS Protection: Limit input length before regex
    if len(transcript) > 500:
        logger.warning(
            "Transcript too long for age detection",
            extra={"length": len(transcript)}
        )
        return 8, "elementary", False  # Default safe value

    patterns = AGE_PATTERNS.get(language, AGE_PATTERNS["en"])

    for pattern in patterns:
        match = re.search(pattern, transcript)
        if match:
            age = int(match.group(1))

            # Determine age group and youngsters flag
            if age <= 3:
                return age, "toddler", False
            elif age <= 6:
                return age, "preschool", False
            elif age <= 11:
                return age, "elementary", False
            elif age <= 17:
                return age, "preteen", True
            else:
                return 12, "preteen", True  # Cap at 12 for kids content

    # Default to age 8 (elementary)
    return 8, "elementary", False


def _format_kids_response(items: List, age: int, language: str) -> str:
    """Format kids content response for voice (3 languages)."""
    count = len(items)

    if language == "he":
        if count == 0:
            return "לא מצאתי תוכן מתאים לגיל זה"
        else:
            return f"מצאתי {count} פריטי תוכן לגיל {age}"

    elif language == "en":
        if count == 0:
            return "No content found for that age"
        else:
            return f"Found {count} items for age {age}"

    else:  # Spanish
        if count == 0:
            return "No se encontró contenido para esa edad"
        else:
            return f"Encontré {count} elementos para edad {age}"
