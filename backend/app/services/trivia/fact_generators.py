"""
Trivia Fact Generation Helpers.
Generates facts from TMDB and AI sources.
Re-exports chained generation from chained_fact_generator module.
"""

import json
import logging
from uuid import uuid4

from anthropic import AsyncAnthropic

from app.core.config import settings
from app.models.content import Content
from app.models.trivia import TriviaFactModel
from app.services.security_utils import sanitize_ai_output, sanitize_for_prompt
from app.services.tmdb_service import TMDBService
from app.services.trivia.chained_fact_generator import (  # noqa: F401
    LANGUAGE_FIELD_MAP,
    LANGUAGE_NAME_MAP,
    ChainedFactInput,
    fetch_tmdb_context,
    generate_chained_facts,
)

logger = logging.getLogger(__name__)


def _tmdb_cast_text(actor_name: str, character: str, language: str) -> str:
    """Generate cast fact text in the requested language."""
    if language == "es":
        return f"{actor_name} interpreta a {character}"
    if language == "en":
        return f"{actor_name} plays {character}"
    return f"{actor_name} מגלם את הדמות {character}"


def _tmdb_director_text(director_name: str, language: str) -> str:
    """Generate director fact text in the requested language."""
    if language == "es":
        return f"Dirigida por {director_name}"
    if language == "en":
        return f"Directed by {director_name}"
    return f"הסרט בבימויו של {director_name}"


async def fetch_tmdb_facts(
    content: Content, tmdb_service: TMDBService, language: str = "he"
) -> list[TriviaFactModel]:
    """Fetch basic trivia from TMDB (fallback when AI is unavailable)."""
    facts = []

    try:
        if content.tmdb_id:
            details = await tmdb_service.get_movie_details(content.tmdb_id)
            if not details:
                return facts

            credits = details.get("credits", {})
            cast = credits.get("cast", [])

            for actor in cast[:3]:
                actor_name = actor.get("name", "")
                character = actor.get("character", "")
                if actor_name and character:
                    text = _tmdb_cast_text(actor_name, character, language)
                    lang_fields: dict = {"text": text}
                    if language == "en":
                        lang_fields["text_en"] = text
                    elif language == "es":
                        lang_fields["text_es"] = text
                    facts.append(
                        TriviaFactModel(
                            fact_id=str(uuid4()),
                            **lang_fields,
                            category="cast",
                            source="tmdb",
                            trigger_type="random",
                            priority=7,
                        )
                    )

            crew = credits.get("crew", [])
            directors = [c for c in crew if c.get("job") == "Director"]
            for director in directors[:1]:
                director_name = director.get("name", "")
                if director_name:
                    text = _tmdb_director_text(director_name, language)
                    lang_fields = {"text": text}
                    if language == "en":
                        lang_fields["text_en"] = text
                    elif language == "es":
                        lang_fields["text_es"] = text
                    facts.append(
                        TriviaFactModel(
                            fact_id=str(uuid4()),
                            **lang_fields,
                            category="production",
                            source="tmdb",
                            trigger_type="random",
                            priority=6,
                        )
                    )

    except Exception as e:
        logger.warning(
            "Failed to fetch TMDB facts",
            extra={"content_id": str(content.id), "error": str(e)},
        )

    return facts


async def generate_ai_facts(
    content: Content,
    anthropic_client: AsyncAnthropic,
    language: str = "he",
    existing_count: int = 0,
) -> list[TriviaFactModel]:
    """Generate standalone AI facts (legacy, non-chained) in a single language."""
    from app.services.trivia.chained_fact_generator import LANGUAGE_NAME_MAP

    facts = []
    max_to_generate = min(5, settings.TRIVIA_MAX_FACTS_PER_CONTENT - existing_count)

    if max_to_generate <= 0:
        return facts

    lang_name = LANGUAGE_NAME_MAP.get(language, "English")

    try:
        safe_title = sanitize_for_prompt(
            content.title, settings.TRIVIA_SANITIZE_TITLE_MAX_LEN
        )
        safe_description = sanitize_for_prompt(
            content.description, settings.TRIVIA_SANITIZE_DESCRIPTION_MAX_LEN
        )
        safe_genre = sanitize_for_prompt(
            content.genre, settings.TRIVIA_SANITIZE_FIELD_MAX_LEN
        )
        safe_director = sanitize_for_prompt(
            content.director, settings.TRIVIA_SANITIZE_FIELD_MAX_LEN
        )

        prompt = f"""Generate {max_to_generate} interesting trivia facts about this content:
Title: {safe_title}
Description: {safe_description}
Year: {content.year or 'N/A'}
Genre: {safe_genre}
Director: {safe_director}

Write ALL text in {lang_name}.
For each fact, provide a JSON object with:
- text: the trivia fact text
- category: one of cast, production, location, cultural, historical

Return ONLY a JSON array, no other text."""

        response = await anthropic_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.TRIVIA_AI_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )

        content_text = response.content[0].text if response.content else "[]"
        content_text = _extract_json_from_response(content_text)
        parsed = json.loads(content_text.strip())

        for item in parsed[:max_to_generate]:
            if isinstance(item, dict) and item.get("text"):
                sanitized = sanitize_ai_output(item.get("text", ""))
                lang_fields: dict = {"text": sanitized}
                if language == "en":
                    lang_fields["text_en"] = sanitized
                elif language == "es":
                    lang_fields["text_es"] = sanitized
                facts.append(
                    TriviaFactModel(
                        fact_id=str(uuid4()),
                        **lang_fields,
                        category=item.get("category", "production"),
                        source="ai",
                        trigger_type="random",
                        priority=5,
                    )
                )

    except Exception as e:
        logger.warning(
            "Failed to generate AI facts",
            extra={"content_id": str(content.id), "error": str(e)},
        )

    return facts


def _extract_json_from_response(content_text: str) -> str:
    """Extract JSON from AI response, handling markdown code blocks."""
    if "```json" in content_text:
        return content_text.split("```json")[1].split("```")[0]
    elif "```" in content_text:
        return content_text.split("```")[1].split("```")[0]
    return content_text
