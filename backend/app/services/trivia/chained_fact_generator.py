"""Chained Trivia Fact Generator - follow-up chain trivia from TMDB context via LLM."""

import json
import logging
from typing import Optional
from uuid import uuid4

from anthropic import AsyncAnthropic
from pydantic import BaseModel, Field, field_validator

from app.core.config import settings
from app.models.content import Content
from app.models.trivia import TriviaFactModel
from app.services.security_utils import sanitize_ai_output, sanitize_for_prompt
from app.services.tmdb_service import TMDBService

logger = logging.getLogger(__name__)

ALLOWED_CATEGORIES = {"cast", "production", "location", "cultural", "historical"}


class ChainedFactInput(BaseModel, extra="forbid"):
    """Strict Pydantic model to validate each fact from LLM output."""

    text: str = Field(..., min_length=1, max_length=500)
    text_en: str = Field(..., min_length=1, max_length=500)
    text_es: str = Field(..., min_length=1, max_length=500)
    category: str
    related_person: Optional[str] = Field(None, max_length=200)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in ALLOWED_CATEGORIES:
            raise ValueError(f"Invalid category: {v}")
        return v


async def fetch_tmdb_context(
    content: Content, tmdb_service: TMDBService
) -> Optional[dict]:
    """Fetch rich TMDB data as context for the AI prompt."""
    try:
        if not content.tmdb_id:
            return None
        details = await tmdb_service.get_movie_details(content.tmdb_id)
        if not details:
            return None

        credits = details.get("credits", {})
        cast_list = credits.get("cast", [])
        crew_list = credits.get("crew", [])
        max_cast = settings.TRIVIA_AI_CONTEXT_MAX_CAST

        return {
            "title": details.get("title", content.title),
            "original_title": details.get("original_title", ""),
            "year": (details.get("release_date") or "")[:4],
            "genres": [g.get("name", "") for g in details.get("genres", [])],
            "tagline": details.get("tagline", ""),
            "budget": details.get("budget", 0),
            "revenue": details.get("revenue", 0),
            "runtime": details.get("runtime"),
            "original_language": details.get("original_language", ""),
            "production_countries": [
                c.get("name", "") for c in details.get("production_countries", [])
            ],
            "production_companies": [
                c.get("name", "") for c in details.get("production_companies", [])[:5]
            ],
            "vote_average": details.get("vote_average"),
            "cast": [
                {"name": a.get("name", ""), "character": a.get("character", "")}
                for a in cast_list[:max_cast] if a.get("name")
            ],
            "directors": [
                c.get("name", "") for c in crew_list
                if c.get("job") == "Director" and c.get("name")
            ],
            "writers": [
                c.get("name", "") for c in crew_list
                if c.get("job") in ("Writer", "Screenplay") and c.get("name")
            ],
        }
    except Exception as e:
        logger.warning(
            "Failed to fetch TMDB context",
            extra={"content_id": str(content.id), "error": str(e)},
        )
        return None


async def generate_chained_facts(
    content: Content,
    anthropic_client: AsyncAnthropic,
    tmdb_context: dict,
    existing_count: int = 0,
) -> list[TriviaFactModel]:
    """Generate chained AI facts using TMDB context."""
    max_chains = settings.TRIVIA_AI_MAX_CHAINS_PER_CONTENT
    chain_depth = settings.TRIVIA_AI_MAX_CHAIN_DEPTH
    max_total = settings.TRIVIA_MAX_FACTS_PER_CONTENT - existing_count
    if max_total <= 0:
        return []

    safe_title = sanitize_for_prompt(
        tmdb_context.get("title", content.title), settings.TRIVIA_SANITIZE_TITLE_MAX_LEN
    )
    context_json = sanitize_for_prompt(
        json.dumps(tmdb_context, ensure_ascii=False, default=str),
        settings.TRIVIA_SANITIZE_DESCRIPTION_MAX_LEN * 3,
    )
    prompt = _build_prompt(safe_title, context_json, max_chains, chain_depth)

    try:
        response = await anthropic_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.TRIVIA_AI_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        content_text = response.content[0].text if response.content else "[]"
        content_text = _extract_json(content_text)
        parsed = json.loads(content_text.strip())

        if not isinstance(parsed, list):
            logger.warning("LLM returned non-list for chained facts")
            return []
        return _parse_chains(parsed, max_chains, chain_depth, max_total)
    except Exception as e:
        logger.warning(
            "Failed to generate chained AI facts",
            extra={"content_id": str(content.id), "error": str(e)},
        )
        return []


def _build_prompt(title: str, context: str, chains: int, depth: int) -> str:
    """Build the LLM prompt for chained trivia generation."""
    return (
        f"You are a trivia writer for a streaming platform. "
        f"Generate {chains} chains of fun facts about this content.\n\n"
        f"CONTENT: {title}\n"
        f"CONTEXT DATA (use as background knowledge, do NOT just restate it):\n{context}\n\n"
        f"RULES:\n"
        f"- NEVER state obvious things like \"X plays Y\" or \"Directed by Z\".\n"
        f"- Focus on: behind-the-scenes stories, near-miss casting, production disasters, "
        f"cultural impact, hidden references, actor preparation, surprising budget facts.\n"
        f"- Each chain has a hook fact and {depth - 1} follow-ups that deepen the story.\n"
        f"- Each fact is 1-2 sentences, conversational tone, genuinely surprising.\n"
        f"- Provide text in Hebrew (text), English (text_en), Spanish (text_es).\n"
        f"- category: cast, production, location, cultural, or historical\n"
        f"- related_person: optional, name of person the fact is about\n\n"
        f"Return ONLY a JSON array of chains (array of arrays of fact objects)."
    )


def _parse_chains(
    parsed: list, max_chains: int, chain_depth: int, max_total: int
) -> list[TriviaFactModel]:
    """Parse and validate LLM chain output into TriviaFactModel list."""
    facts: list[TriviaFactModel] = []
    for chain_data in parsed[:max_chains]:
        if not isinstance(chain_data, list) or not chain_data:
            continue
        chain_id = str(uuid4())
        chain_facts: list[TriviaFactModel] = []
        for order, raw in enumerate(chain_data[:chain_depth]):
            if not isinstance(raw, dict):
                continue
            try:
                v = ChainedFactInput(**raw)
            except Exception as e:
                logger.warning("Skipping invalid chained fact", extra={"error": str(e)})
                continue
            chain_facts.append(TriviaFactModel(
                fact_id=str(uuid4()),
                text=sanitize_ai_output(v.text),
                text_en=sanitize_ai_output(v.text_en),
                text_es=sanitize_ai_output(v.text_es),
                category=v.category, source="ai", trigger_type="random",
                priority=8 if order == 0 else 5,
                related_person=sanitize_ai_output(v.related_person) if v.related_person else None,
                chain_id=chain_id, chain_order=order, has_follow_up=False,
            ))
        for i in range(len(chain_facts) - 1):
            chain_facts[i].has_follow_up = True
        facts.extend(chain_facts)
        if len(facts) >= max_total:
            break
    return facts[:max_total]


def _extract_json(content_text: str) -> str:
    """Extract JSON from AI response, handling markdown code blocks."""
    if "```json" in content_text:
        return content_text.split("```json")[1].split("```")[0]
    elif "```" in content_text:
        return content_text.split("```")[1].split("```")[0]
    return content_text
