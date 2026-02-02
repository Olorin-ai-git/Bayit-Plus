"""
Intent Handler Functions
Individual handlers for each voice intent type with full implementations
"""

import re
from typing import Any, Dict, List, Optional, Tuple

from app.core.logging_config import get_logger
from app.services.kids_content_service import kids_content_service
from app.services.unified_search_service import SearchFilters, UnifiedSearchService
from app.services.vod_llm_search_service import VODLLMSearchService
from app.services.llm_search_service import LLMSearchService
from .context import VoiceContext
from .wizard_chat_service import WizardChatService
from .error_messages import get_error_message

logger = get_logger(__name__)


# Age detection patterns for 3 languages
AGE_PATTERNS = {
    "he": [r'לגיל\s+(\d+)', r'בן\s+(\d+)', r'בת\s+(\d+)', r'גיל\s+(\d+)'],
    "en": [r'for\s+(\d+)\s+year', r'(\d+)\s+year\s+old', r'age\s+(\d+)', r'(\d+)\s+years\s+old'],
    "es": [r'para\s+(\d+)\s+años', r'de\s+(\d+)\s+años', r'edad\s+(\d+)']
}


async def handle_chat(
    transcript: str,
    context: VoiceContext
) -> Dict[str, Any]:
    """
    Handle natural language chat using Claude AI.

    Args:
        transcript: User voice input
        context: Voice request context

    Returns:
        Dict with spoken_response and action
    """
    try:
        wizard_service = WizardChatService()

        result = await wizard_service.process_chat(
            transcript=transcript,
            language=context.language,
            conversation_id=context.conversation_id,
            media_context=None
        )

        logger.info(
            "Chat handled successfully",
            extra={
                "user_id": context.user_id,
                "language": context.language,
                "conversation_id": context.conversation_id
            }
        )

        return result

    except Exception as e:
        logger.error(
            "Chat handler failed",
            extra={"user_id": context.user_id, "error": str(e)},
            exc_info=True
        )
        return {
            "spoken_response": get_error_message("claude_api_failure", context.language),
            "action": {"type": "chat", "payload": {"message": transcript}}
        }


async def handle_search(
    transcript: str,
    context: VoiceContext
) -> Dict[str, Any]:
    """
    Handle search with intelligent routing between services.

    Routes:
    - Live/EPG keywords → LLMSearchService
    - Complex natural language → VODLLMSearchService
    - Simple keyword → UnifiedSearchService

    Args:
        transcript: Search query
        context: Voice request context

    Returns:
        Dict with spoken_response and action
    """
    try:
        # Classify search type
        search_type = _classify_search_type(transcript, context.language)

        logger.info(
            "Search request",
            extra={
                "user_id": context.user_id,
                "query": transcript,
                "search_type": search_type,
                "language": context.language
            }
        )

        # Route to appropriate search service
        if search_type == "live":
            results = await _execute_live_search(transcript, context)
        elif search_type == "complex_vod":
            results = await _execute_complex_vod_search(transcript, context)
        else:
            results = await _execute_simple_vod_search(transcript, context)

        # Format for voice
        spoken_response = _format_voice_search_results(results, context.language)

        return {
            "spoken_response": spoken_response,
            "action": {
                "type": "search",
                "payload": {"query": transcript, "results": results[:10]}
            }
        }

    except Exception as e:
        logger.error(
            "Search handler failed",
            extra={"user_id": context.user_id, "error": str(e)},
            exc_info=True
        )
        return {
            "spoken_response": get_error_message("search_failure", context.language),
            "action": {"type": "search", "payload": {"query": transcript}}
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

        # Apply family controls override (stricter wins)
        if context.family_controls:
            original_age = age
            age = min(age, context.family_controls.kids_age_limit)
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


async def handle_navigation(transcript: str) -> Dict[str, Any]:
    """Handle navigation command."""

    # Map Hebrew navigation commands to paths
    navigation_map = {
        'בית': {'path': '/', 'spoken': 'עובר לעמוד הבית'},
        'ערוצים': {'path': '/live', 'spoken': 'עובר לטלוויזיה בשידור חי'},
        'סרטים': {'path': '/vod', 'spoken': 'עובר לסרטים וסדרות'},
        'רדיו': {'path': '/radio', 'spoken': 'עובר לרדיו'},
        'פודקאסטים': {'path': '/podcasts', 'spoken': 'עובר לפודקאסטים'},
        'מועדפים': {'path': '/favorites', 'spoken': 'עובר למועדפים'},
    }

    for keyword, nav_info in navigation_map.items():
        if keyword in transcript.lower():
            return {
                "spoken_response": nav_info['spoken'],
                "action": {
                    "type": "navigate",
                    "payload": {"path": nav_info['path']}
                }
            }

    # Default home navigation
    return {
        "spoken_response": "עובר לעמוד הבית",
        "action": {
            "type": "navigate",
            "payload": {"path": "/"}
        }
    }


async def handle_playback(transcript: str) -> Dict[str, Any]:
    """Handle playback command."""

    playback_map = {
        'נגן': {'action': 'play', 'spoken': 'מפעיל הנגן'},
        'הפעל': {'action': 'play', 'spoken': 'מפעיל הנגן'},
        'השהה': {'action': 'pause', 'spoken': 'משהה'},
        'עצור': {'action': 'stop', 'spoken': 'עוצר'},
        'המשך': {'action': 'resume', 'spoken': 'ממשיך'},
    }

    for keyword, play_info in playback_map.items():
        if keyword in transcript.lower():
            return {
                "spoken_response": play_info['spoken'],
                "action": {
                    "type": "playback",
                    "payload": {"action": play_info['action']}
                }
            }

    # Default play
    return {
        "spoken_response": "מפעיל הנגן",
        "action": {
            "type": "playback",
            "payload": {"action": "play"}
        }
    }


async def handle_scroll(transcript: str) -> Dict[str, Any]:
    """Handle scroll command."""

    direction = "down"
    spoken = "גולל למטה"

    if any(kw in transcript.lower() for kw in ['למעלה', 'הקודם']):
        direction = "up"
        spoken = "גולל למעלה"

    return {
        "spoken_response": spoken,
        "action": {
            "type": "scroll",
            "payload": {"direction": direction}
        }
    }


async def handle_control(transcript: str) -> Dict[str, Any]:
    """Handle system control command."""

    control_map = {
        'חזק': {'control': 'volume_up', 'spoken': 'הגברת הקול'},
        'שקט': {'control': 'volume_down', 'spoken': 'הנמכת הקול'},
        'השתק': {'control': 'mute', 'spoken': 'השתקת הקול'},
        'שפה': {'control': 'toggle_language', 'spoken': 'החלפת שפה'},
        'עזרה': {'control': 'show_help', 'spoken': 'מציג עזרה'},
    }

    for keyword, ctrl_info in control_map.items():
        if keyword in transcript.lower():
            return {
                "spoken_response": ctrl_info['spoken'],
                "action": {
                    "type": "control",
                    "payload": {"control": ctrl_info['control']}
                }
            }

    # Default help
    return {
        "spoken_response": "מציג עזרה",
        "action": {
            "type": "control",
            "payload": {"control": "show_help"}
        }
    }


def get_intent_gesture(intent: str) -> Optional[Dict[str, Any]]:
    """Get wizard gesture for intent."""

    gesture_map = {
        "SEARCH": {"gesture": "browsing", "duration": 2000},
        "CHAT": {"gesture": "conjuring", "duration": None},
        "KIDS": {"gesture": "browsing", "duration": 2000},
        "NAVIGATION": None,
        "PLAYBACK": None,
        "SCROLL": None,
        "CONTROL": None,
    }

    return gesture_map.get(intent)


# Helper functions

def _classify_search_type(query: str, language: str) -> str:
    """
    Classify search query type for routing.

    Returns:
        'live', 'complex_vod', or 'simple_vod'
    """
    query_lower = query.lower()

    # Live/EPG keywords (3 languages)
    live_keywords = {
        "he": ["עכשיו", "הלילה", "ערוץ", "שידור חי", "טלוויזיה"],
        "en": ["now", "tonight", "channel", "live tv", "on tv"],
        "es": ["ahora", "esta noche", "canal", "tv en vivo"]
    }

    if any(kw in query_lower for kw in live_keywords.get(language, [])):
        return "live"

    # Complex query indicators (multi-criteria, thematic)
    if len(query.split()) > 5:
        return "complex_vod"

    # Check for multiple criteria
    has_year = bool(re.search(r'\d{4}', query))
    has_genre = any(genre in query_lower for genre in [
        "action", "comedy", "drama", "documentary", "אקשן", "קומדיה", "דרמה"
    ])

    if has_year and has_genre:
        return "complex_vod"

    # Default to simple search
    return "simple_vod"


async def _execute_live_search(query: str, context: VoiceContext) -> List[Dict]:
    """Execute live TV/EPG search using LLMSearchService."""
    try:
        llm_service = LLMSearchService()
        results = await llm_service.search(query=query, limit=10)
        return results.get("results", [])
    except Exception as e:
        logger.error(f"Live search failed: {e}", exc_info=True)
        return []


async def _execute_complex_vod_search(query: str, context: VoiceContext) -> List[Dict]:
    """Execute complex VOD search using VODLLMSearchService."""
    try:
        vod_llm_service = VODLLMSearchService()
        results = await vod_llm_service.search(
            query=query,
            subscription_tier=context.subscription_tier,
            is_beta_user=context.is_beta_user,
            limit=10
        )
        return results.get("results", [])
    except Exception as e:
        logger.error(f"Complex VOD search failed: {e}", exc_info=True)
        return []


async def _execute_simple_vod_search(query: str, context: VoiceContext) -> List[Dict]:
    """Execute simple VOD search using UnifiedSearchService."""
    try:
        search_service = UnifiedSearchService()
        filters = SearchFilters(
            content_types=["vod"],
            subscription_tier=context.subscription_tier,
            is_kids_content=False
        )
        results = await search_service.search(query=query, filters=filters, limit=10)
        return results.get("results", [])
    except Exception as e:
        logger.error(f"Simple VOD search failed: {e}", exc_info=True)
        return []


def _format_voice_search_results(results: List[Dict], language: str) -> str:
    """Format search results for voice output (3 languages)."""
    total = len(results)

    if language == "he":
        if total == 0:
            return "מצטער, לא מצאתי תוצאות"
        elif total == 1:
            title = results[0].get("title", "")
            year = results[0].get("year", "")
            return f"מצאתי: {title}" + (f" משנת {year}" if year else "")
        else:
            titles = ", ".join([r.get("title", "") for r in results[:3]])
            return f"מצאתי {total} תוצאות. הנה 3 הראשונות: {titles}"

    elif language == "en":
        if total == 0:
            return "Sorry, I found no results"
        elif total == 1:
            title = results[0].get("title", "")
            year = results[0].get("year", "")
            return f"Found: {title}" + (f" from {year}" if year else "")
        else:
            titles = ", ".join([r.get("title", "") for r in results[:3]])
            return f"Found {total} results. Here are the top 3: {titles}"

    else:  # Spanish
        if total == 0:
            return "Lo siento, no encontré resultados"
        elif total == 1:
            title = results[0].get("title", "")
            year = results[0].get("year", "")
            return f"Encontré: {title}" + (f" del año {year}" if year else "")
        else:
            titles = ", ".join([r.get("title", "") for r in results[:3]])
            return f"Encontré {total} resultados. Aquí están los 3 mejores: {titles}"


def _detect_age_from_transcript(transcript: str, language: str) -> Tuple[int, str, bool]:
    """
    Detect age from transcript in specified language.

    Returns:
        (age, age_group, is_youngsters)
    """
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
