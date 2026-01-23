"""
Trivia Fact Generation Helpers.
Generates facts from TMDB and AI sources.
"""

import json
import logging
from typing import Optional
from uuid import uuid4

from anthropic import AsyncAnthropic

from app.core.config import settings
from app.models.content import Content
from app.models.trivia import TriviaFactModel
from app.services.security_utils import sanitize_ai_output, sanitize_for_prompt
from app.services.tmdb_service import TMDBService

logger = logging.getLogger(__name__)


async def fetch_tmdb_facts(
    content: Content, tmdb_service: TMDBService
) -> list[TriviaFactModel]:
    """Fetch trivia from TMDB using get_movie_details."""
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
                    facts.append(
                        TriviaFactModel(
                            fact_id=str(uuid4()),
                            text=f"{actor_name} מגלם את הדמות {character}",
                            text_en=f"{actor_name} plays {character}",
                            text_es=f"{actor_name} interpreta a {character}",
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
                    facts.append(
                        TriviaFactModel(
                            fact_id=str(uuid4()),
                            text=f"הסרט בבימויו של {director_name}",
                            text_en=f"Directed by {director_name}",
                            text_es=f"Dirigida por {director_name}",
                            category="production",
                            source="tmdb",
                            trigger_type="random",
                            priority=6,
                        )
                    )

    except Exception as e:
        logger.warning(f"Failed to fetch TMDB facts for {content.id}: {e}")

    return facts


async def generate_ai_facts(
    content: Content,
    anthropic_client: AsyncAnthropic,
    existing_count: int = 0,
) -> list[TriviaFactModel]:
    """Generate AI facts using Anthropic client with security fixes."""
    facts = []
    max_to_generate = min(5, settings.TRIVIA_MAX_FACTS_PER_CONTENT - existing_count)

    if max_to_generate <= 0:
        return facts

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

For each fact, provide a JSON object with:
- text: Hebrew text
- text_en: English text
- text_es: Spanish text
- category: one of cast, production, location, cultural, historical

Return ONLY a JSON array, no other text."""

        response = await anthropic_client.messages.create(
            model=settings.CLAUDE_MODEL or "claude-3-haiku-20240307",
            max_tokens=settings.TRIVIA_AI_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )

        content_text = response.content[0].text if response.content else "[]"
        content_text = _extract_json_from_response(content_text)
        parsed = json.loads(content_text.strip())

        for item in parsed[:max_to_generate]:
            if isinstance(item, dict) and item.get("text"):
                facts.append(
                    TriviaFactModel(
                        fact_id=str(uuid4()),
                        text=sanitize_ai_output(item.get("text", "")),
                        text_en=sanitize_ai_output(
                            item.get("text_en", item.get("text", ""))
                        ),
                        text_es=sanitize_ai_output(
                            item.get("text_es", item.get("text", ""))
                        ),
                        category=item.get("category", "production"),
                        source="ai",
                        trigger_type="random",
                        priority=5,
                    )
                )

    except Exception as e:
        logger.warning(f"Failed to generate AI facts for {content.id}: {e}")

    return facts


def _extract_json_from_response(content_text: str) -> str:
    """Extract JSON from AI response, handling markdown code blocks."""
    if "```json" in content_text:
        return content_text.split("```json")[1].split("```")[0]
    elif "```" in content_text:
        return content_text.split("```")[1].split("```")[0]
    return content_text
