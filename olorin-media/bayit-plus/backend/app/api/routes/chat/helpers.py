"""
Chat API Helpers - Utility functions for chat processing

Helper functions for media context building, Hebronics processing,
JSON extraction, content name extraction, and text processing.
"""

import difflib
import json
import re
import time
from typing import Optional

import anthropic

from app.core.config import settings
from app.models.content import (Content, LiveChannel, Podcast, PodcastEpisode,
                                RadioStation)

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# Media context cache
_media_context_cache: Optional[dict] = None
_media_context_cache_ts: float = 0
MEDIA_CONTEXT_CACHE_TTL = 300  # 5 minutes


async def build_media_context() -> dict:
    """
    Build a minimal media library context for the LLM.
    Reduced size since search_content tool handles content discovery.
    Results are cached to avoid excessive database queries.
    """
    global _media_context_cache, _media_context_cache_ts

    current_time = time.time()

    # Return cached context if fresh
    if (
        _media_context_cache
        and (current_time - _media_context_cache_ts) < MEDIA_CONTEXT_CACHE_TTL
    ):
        return _media_context_cache

    try:
        channels = (
            await LiveChannel.find(LiveChannel.is_active == True).limit(5).to_list()
        )

        podcasts = await Podcast.find(Podcast.is_active == True).limit(5).to_list()

        total_channels = await LiveChannel.find(LiveChannel.is_active == True).count()

        total_podcasts = await Podcast.find(Podcast.is_active == True).count()

        total_content = await Content.find(Content.is_published == True).count()

        categories = await Content.distinct("category_name", {"is_published": True})

        context = {
            "channels": [{"name": ch.name, "id": str(ch.id)} for ch in channels],
            "podcasts": [{"title": p.title, "id": str(p.id)} for p in podcasts],
            "summary": {
                "total_channels": total_channels,
                "total_podcasts": total_podcasts,
                "total_content_items": total_content,
                "categories": categories or [],
            },
        }

        _media_context_cache = context
        _media_context_cache_ts = current_time

        return context

    except Exception as e:
        print(f"[CHAT] Error building media context: {e}")
        return {
            "channels": [],
            "podcasts": [],
            "summary": {
                "total_channels": 0,
                "total_podcasts": 0,
                "total_content_items": 0,
                "categories": [],
            },
        }


async def process_hebronics_input(text: str) -> dict:
    """
    Process "Hebronics" - Hebrew-English mixed input common among Israeli expats.
    Uses Claude to normalize mixed language queries into coherent Hebrew search terms.
    """
    if not text or not text.strip():
        return {"original": text, "normalized": text, "intent": None}

    prompt = f"""אתה מעבד קלט קולי מישראלים שגרים בארה"ב. הם לפעמים מערבבים עברית ואנגלית ("עברנגלית" או "Hebronics").

הקלט: "{text}"

עליך לעשות:
1. לזהות את הכוונה (חיפוש, שאלה, בקשה)
2. לנרמל את הטקסט לעברית תקנית
3. לחלץ מילות מפתח לחיפוש

החזר JSON בפורמט:
{{
    "normalized": "הטקסט המנורמל בעברית",
    "intent": "search|question|browse|play",
    "keywords": ["מילה1", "מילה2"],
    "content_type": "movie|series|channel|radio|podcast|any",
    "genre": "action|comedy|drama|documentary|news|kids|null",
    "english_terms": ["original", "english", "words"]
}}"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.content[0].text.strip()

        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        result = json.loads(response_text)
        result["original"] = text
        return result

    except Exception as e:
        print(f"Hebronics processing error: {e}")
        return {
            "original": text,
            "normalized": text,
            "intent": "search",
            "keywords": text.split(),
            "content_type": "any",
            "genre": None,
            "english_terms": [],
        }


def extract_json_from_response(text: str) -> tuple[str, Optional[dict]]:
    """
    Extract JSON from Claude's response text.
    Claude includes JSON in multiple formats - code blocks or XML tags.

    Returns: (cleaned_text, json_dict)
    """
    if not text:
        return text, None

    json_data = None

    # Try XML format first: <action>{...}</action>
    xml_pattern = r"<action>\s*\n(\{[^}]+\})\s*\n</action>"
    match = re.search(xml_pattern, text, re.DOTALL)
    if match:
        try:
            json_str = match.group(1)
            json_data = json.loads(json_str)
            text = re.sub(xml_pattern, "", text, flags=re.DOTALL).strip()
            return text, json_data
        except json.JSONDecodeError:
            pass

    # Try JSON code blocks: ```json\n{...}\n```
    json_pattern = r"```(?:json)?\s*\n(\{[^}]+\})\n```"
    match = re.search(json_pattern, text, re.DOTALL)
    if match:
        try:
            json_str = match.group(1)
            json_data = json.loads(json_str)
            text = re.sub(json_pattern, "", text, flags=re.DOTALL).strip()
            return text, json_data
        except json.JSONDecodeError:
            pass

    return text, json_data


async def extract_content_name_from_query(query: str, language: str = "he") -> str:
    """
    Use Claude to extract just the content/movie name from a voice command.
    """
    if not query:
        return query

    try:
        if language == "he":
            prompt = f"""Extract just the movie/show/content name from this Hebrew voice command.
Return ONLY the content name, nothing else.

Command: "{query}"

Content name:"""
        else:
            prompt = f"""Extract just the movie/show/content name from this English voice command.
Return ONLY the content name, nothing else.

Command: "{query}"

Content name:"""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=50,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()
    except Exception as e:
        print(f"[CHAT] Error extracting content name: {e}")
        return query


def strip_markdown(text: str) -> str:
    """
    Strip markdown formatting from text for TTS readability.
    """
    if not text:
        return text

    # Remove JSON code blocks
    text = re.sub(r"```(?:json)?\s*\n\{[^}]+\}\n```", "", text, flags=re.DOTALL)

    # Remove any remaining code blocks
    text = re.sub(r"`{3}[^`]*`{3}", "", text, flags=re.DOTALL)
    text = re.sub(r"`(.+?)`", r"\1", text)

    # Remove bold
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"__(.+?)__", r"\1", text)

    # Remove italic
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"_(.+?)_", r"\1", text)

    # Remove markdown links
    text = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", text)

    # Remove HTML comments
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)

    return text.strip()


def fuzzy_match_score(query: str, target: str) -> float:
    """Calculate fuzzy match score between query and target strings."""
    query_lower = query.lower().strip()
    target_lower = target.lower().strip()

    # Exact match
    if query_lower == target_lower:
        return 1.0

    # Contains match
    if query_lower in target_lower or target_lower in query_lower:
        return 0.9

    # Use difflib for fuzzy matching
    return difflib.SequenceMatcher(None, query_lower, target_lower).ratio()
