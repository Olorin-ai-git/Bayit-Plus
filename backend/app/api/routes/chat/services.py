"""
Chat API Services - Business logic and service functions

Service-layer functions for recommendations, action extraction,
content resolution, webhook processing, and signature verification.
"""

import hashlib
import hmac
import json
from datetime import datetime
from typing import Any, Optional

import anthropic

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import (Content, LiveChannel, Podcast, PodcastEpisode,
                                RadioStation)

logger = get_logger(__name__)

from .helpers import extract_content_name_from_query, fuzzy_match_score
from .models import ResolvedContentItem

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# In-memory store for pending transcriptions (use Redis in production)
pending_transcriptions: dict[str, dict] = {}


async def get_recommendations_from_response(
    response: str, query: str, media_context: Optional[dict] = None
) -> Optional[list]:
    """
    Extract and recommend relevant content based on the conversation.
    Uses media context for smarter recommendations aligned with available catalog.
    """
    keywords = [
        "סרט",
        "סדרה",
        "ערוץ",
        "פודקאסט",
        "תוכנית",
        "רדיו",
        "recommend",
        "suggest",
        "תמליץ",
    ]

    if not any(kw in query.lower() or kw in response.lower() for kw in keywords):
        return None

    recommendations = []

    if media_context:
        if any(w in query.lower() for w in ["סרט", "movie", "film"]):
            for item in media_context.get("featured_content", [])[:4]:
                if "type" in item:
                    recommendations.append(
                        {
                            "title": item["title"],
                            "type": item.get("type", "vod"),
                            "genre": item.get("genre", ""),
                            "year": item.get("year", ""),
                        }
                    )
        elif any(w in query.lower() for w in ["פודקאסט", "podcast"]):
            for item in media_context.get("podcasts", [])[:4]:
                recommendations.append(
                    {
                        "title": item["title"],
                        "type": "podcast",
                        "author": item.get("author", ""),
                        "category": item.get("category", ""),
                    }
                )
        elif any(w in query.lower() for w in ["ערוץ", "channel", "tv"]):
            for item in media_context.get("channels", [])[:4]:
                recommendations.append(
                    {
                        "title": item["name"],
                        "type": "channel",
                        "description": item.get("description", ""),
                    }
                )
        else:
            for item in media_context.get("featured_content", [])[:2]:
                recommendations.append(
                    {
                        "title": item["title"],
                        "type": item.get("type", "vod"),
                        "genre": item.get("genre", ""),
                    }
                )
            for item in media_context.get("podcasts", [])[:1]:
                recommendations.append(
                    {
                        "title": item["title"],
                        "type": "podcast",
                        "author": item.get("author", ""),
                    }
                )
            for item in media_context.get("channels", [])[:1]:
                recommendations.append({"title": item["name"], "type": "channel"})

    if not recommendations:
        content = await Content.find(Content.is_published == True).limit(4).to_list()

        if content:
            recommendations = [
                {
                    "id": str(item.id),
                    "title": item.title,
                    "thumbnail": item.thumbnail,
                    "type": "vod",
                }
                for item in content
            ]

    return recommendations if recommendations else None


async def extract_action_from_response(
    response: str, query: str, language: str = "he"
) -> Optional[dict]:
    """
    Ask Claude to determine if an action is needed based on the user's request.
    The LLM is responsible for understanding context and deciding on actions.
    """
    try:
        action_prompt = f"""Based on this user request: "{query}"

Should the app take an action? Return ONLY a JSON response (no other text).

If NO action needed, return: {{"action": null}}

If action IS needed, return ONE of these formats:
- Navigation: {{"action": "navigate", "target": "movies|series|channels|radio|podcasts|judaism|children|home|chess"}}
- Play: {{"action": "play"}}
- Search: {{"action": "search", "query": "search terms"}}
- Pause/Resume/Skip: {{"action": "pause"|"resume"|"skip"}}
- Show Multiple: {{"action": "show_multiple", "items": [{{"name": "content name", "type": "channel|movie|podcast|radio"}}]}}
- Chess Invite: {{"action": "chess_invite", "friend_name": "name of friend to invite"}}

Rules:
- "תמליץ לי על סרט" (recommend a movie) = NO action
- "עבור לסרטים" (go to movies) = navigate to movies
- "תנגן את X" (play X) = play action (we'll check if X exists)
- "חפש סרטי אקשן" (search action movies) = search action
- "תראה לי ערוצים כאן 11 וכאן 12" (show me channels Kan11 and Kan12) = show_multiple with items
- "Show me Kan11, Kan12" = show_multiple action with channel items
- "הפעל את כאן 11 וכאן 12 ביחד" (play Kan11 and Kan12 together) = show_multiple
- "התחל משחק שחמט עם דוד" (start chess game with David) = chess_invite with friend_name
- "Start a chess game and invite David" = chess_invite with friend_name

For show_multiple:
- Extract ALL content names mentioned
- Detect type from context (channels if TV names, movies if film titles, etc.)
- Default to "channel" for Israeli channel names like Kan11, Keshet, Reshet

Return ONLY valid JSON, nothing else."""

        action_response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=100,
            messages=[{"role": "user", "content": action_prompt}],
        )

        action_text = action_response.content[0].text.strip()
        logger.info("Claude action decision", extra={"action_text": action_text})

        try:
            action_data = json.loads(action_text)
            if action_data.get("action"):
                action_type = action_data["action"]

                # Handle show_multiple action
                if action_type == "show_multiple":
                    items = action_data.get("items", [])
                    if items:
                        logger.info("show_multiple action", extra={"item_count": len(items)})
                        return {
                            "type": "show_multiple",
                            "payload": {"items": items},
                            "confidence": 0.9,
                        }
                    else:
                        logger.info("show_multiple action but no items found")
                        return None

                # Handle chess_invite action
                if action_type == "chess_invite":
                    friend_name = action_data.get("friend_name")
                    if friend_name:
                        logger.info("chess_invite action", extra={"friend_name": friend_name})
                        return {
                            "type": "chess_invite",
                            "payload": {"friend_name": friend_name},
                            "confidence": 0.9,
                        }
                    else:
                        logger.info("chess_invite without friend name, converting to navigate")
                        return {
                            "type": "navigate",
                            "payload": {"target": "chess"},
                            "confidence": 0.8,
                        }

                # If it's a play action, validate the content exists in our library
                if action_type == "play":
                    try:
                        logger.info("Validating play action", extra={"query": query})
                        content_found = await Content.find(
                            Content.is_published == True
                        ).to_list()

                        logger.debug("Content library search", extra={"count": len(content_found)})

                        query_lower = query.lower()
                        found = None
                        for c in content_found:
                            title = str(c.title).lower()
                            logger.debug("Checking content match", extra={"title": title, "query": query_lower})
                            if query_lower in title:
                                found = c
                                logger.debug("Content match found in title")
                                break
                            if hasattr(c, "name"):
                                name = str(c.name).lower()
                                if query_lower in name:
                                    found = c
                                    logger.debug("Content match found in name")
                                    break

                        if not found:
                            logger.info("Content not found, converting play to search", extra={"query": query})
                            return {
                                "type": "search",
                                "payload": {"query": query},
                                "confidence": 0.8,
                            }
                        else:
                            logger.info("Content found in library, keeping play action", extra={"query": query})
                    except Exception as e:
                        logger.error("Error validating content in library", extra={"error": str(e)})
                        pass

                # Build payload based on action type
                payload = action_data.get("payload") or {}
                if action_data.get("target"):
                    payload["target"] = action_data.get("target")
                if action_data.get("query"):
                    payload["query"] = action_data.get("query")
                if action_data.get("items"):
                    payload["items"] = action_data.get("items")
                if action_data.get("friend_name"):
                    payload["friend_name"] = action_data.get("friend_name")

                return {
                    "type": action_type,
                    "payload": payload,
                    "confidence": 0.9,
                }
        except json.JSONDecodeError:
            logger.warning("Failed to parse action JSON", extra={"action_text": action_text})
            return None

        return None

    except Exception as e:
        logger.error("Error extracting action", extra={"error": str(e)})
        return None


async def resolve_single_content(
    name: str, content_type: str, language: str = "he"
) -> Optional[ResolvedContentItem]:
    """
    Resolve a single content item by name using fuzzy matching.
    Searches across channels, VOD, podcasts, and radio based on type.
    """
    best_match: Optional[ResolvedContentItem] = None
    best_score = 0.0
    min_score = 0.5

    # Search in live channels
    if content_type in ["any", "channel"]:
        channels = await LiveChannel.find(LiveChannel.is_active == True).to_list()
        for ch in channels:
            names_to_check = [ch.name]
            if ch.name_en:
                names_to_check.append(ch.name_en)
            if ch.name_es:
                names_to_check.append(ch.name_es)

            for check_name in names_to_check:
                score = fuzzy_match_score(name, check_name)
                if score > best_score and score >= min_score:
                    best_score = score
                    best_match = ResolvedContentItem(
                        id=str(ch.id),
                        name=ch.name,
                        type="channel",
                        thumbnail=ch.logo or ch.thumbnail,
                        stream_url=ch.stream_url,
                        matched_name=name,
                        confidence=score,
                    )

    # Search in VOD content (movies/series)
    if content_type in ["any", "movie", "series", "vod"]:
        content_items = (
            await Content.find(Content.is_published == True).limit(500).to_list()
        )
        for item in content_items:
            names_to_check = [item.title]
            if item.title_en:
                names_to_check.append(item.title_en)
            if item.title_es:
                names_to_check.append(item.title_es)

            for check_name in names_to_check:
                score = fuzzy_match_score(name, check_name)
                if score > best_score and score >= min_score:
                    best_score = score
                    from app.api.routes.content.utils import is_series_content
                    item_type = "series" if is_series_content(item.model_dump()) else "movie"
                    best_match = ResolvedContentItem(
                        id=str(item.id),
                        name=item.title,
                        type=item_type,
                        thumbnail=item.thumbnail or item.poster_url,
                        stream_url=item.stream_url,
                        matched_name=name,
                        confidence=score,
                    )

    # Search in podcasts
    if content_type in ["any", "podcast"]:
        podcasts = await Podcast.find(Podcast.is_active == True).to_list()
        for pod in podcasts:
            names_to_check = [pod.title]
            if pod.title_en:
                names_to_check.append(pod.title_en)
            if pod.title_es:
                names_to_check.append(pod.title_es)

            for check_name in names_to_check:
                score = fuzzy_match_score(name, check_name)
                if score > best_score and score >= min_score:
                    best_score = score
                    latest_ep = await PodcastEpisode.find_one(
                        PodcastEpisode.podcast_id == str(pod.id),
                        sort=[("published_at", -1)],
                    )
                    stream_url = latest_ep.audio_url if latest_ep else None
                    best_match = ResolvedContentItem(
                        id=str(pod.id),
                        name=pod.title,
                        type="podcast",
                        thumbnail=pod.cover,
                        stream_url=stream_url,
                        matched_name=name,
                        confidence=score,
                    )

    # Search in radio stations
    if content_type in ["any", "radio"]:
        stations = await RadioStation.find(RadioStation.is_active == True).to_list()
        for station in stations:
            names_to_check = [station.name]
            if station.name_en:
                names_to_check.append(station.name_en)
            if station.name_es:
                names_to_check.append(station.name_es)

            for check_name in names_to_check:
                score = fuzzy_match_score(name, check_name)
                if score > best_score and score >= min_score:
                    best_score = score
                    best_match = ResolvedContentItem(
                        id=str(station.id),
                        name=station.name,
                        type="radio",
                        thumbnail=station.logo,
                        stream_url=station.stream_url,
                        matched_name=name,
                        confidence=score,
                    )

    return best_match


def verify_elevenlabs_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify ElevenLabs webhook signature using HMAC-SHA256.

    ElevenLabs signs webhooks with: HMAC-SHA256(webhook_secret, raw_body)
    The signature is sent in the 'elevenlabs-signature' header.
    """
    if not secret:
        return False

    try:
        expected_signature = hmac.new(
            secret.encode("utf-8"), payload, hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)
    except Exception:
        return False


async def process_transcription_completed(
    transcription_id: Optional[str],
    text: Optional[str],
    language_code: Optional[str],
    audio_duration: Optional[float],
    metadata: Optional[dict],
):
    """
    Background task to process completed transcription.
    """
    from .helpers import process_hebronics_input

    logger.info("Processing transcription", extra={
        "transcription_id": transcription_id, "text_preview": text[:100] if text else None,
        "language_code": language_code, "audio_duration": audio_duration,
    })

    if not text:
        return

    if transcription_id and transcription_id in pending_transcriptions:
        pending_transcriptions[transcription_id].update(
            {
                "status": "completed",
                "text": text,
                "language_code": language_code,
                "audio_duration": audio_duration,
                "completed_at": datetime.utcnow().isoformat(),
            }
        )

    if language_code in ["he", "iw"]:
        try:
            processed = await process_hebronics_input(text)
            logger.info("Hebronics processed", extra={
                "normalized": processed.get("normalized"), "intent": processed.get("intent"),
            })

            if transcription_id and transcription_id in pending_transcriptions:
                pending_transcriptions[transcription_id]["processed"] = processed
        except Exception as e:
            logger.error("Hebronics processing error", extra={"error": str(e)})


async def align_message_with_action(
    message: str, action: Optional[dict], query: str, language: str
) -> str:
    """
    Ensure message and action are aligned for voice responses.
    If message says 'playing' but action is 'search', fix the message.
    """
    if not action:
        return message

    action_type = action.get("type")
    msg_lower = message.lower()

    logger.debug("Action alignment check", extra={"action_type": action_type})

    if action_type == "search":
        playback_words = [
            "מנגן",
            "נוגן",
            "תנגן",
            "משדרת",
            "צופה",
            "מפעיל",
            "תפעל",
            "מנסה לנגן",
            "מנסה",
            "playing",
            "attempting",
            "trying to play",
        ]
        if any(word in msg_lower for word in playback_words):
            logger.info("Message/action mismatch, correcting", extra={"original_message": message})
            content_name = await extract_content_name_from_query(query, language)
            logger.debug("Extracted content name", extra={"content_name": content_name})
            if language == "he":
                corrected = f"מחפשת את {content_name}..."
            else:
                corrected = f"Searching for {content_name}..."
            logger.debug("Corrected message", extra={"corrected": corrected})
            return corrected

    return message
