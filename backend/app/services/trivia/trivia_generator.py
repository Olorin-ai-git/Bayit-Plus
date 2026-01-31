"""
Trivia Generation Service.
Generates trivia facts for content using TMDB data and AI with chain support.
"""

import logging
from typing import Optional

from anthropic import AsyncAnthropic

from app.core.config import settings
from app.models.content import Content
from app.models.trivia import ContentTrivia, TriviaFactModel
from app.services.tmdb_service import TMDBService
from app.services.trivia.fact_generators import (
    fetch_tmdb_context,
    fetch_tmdb_facts,
    generate_ai_facts,
    generate_chained_facts,
)

logger = logging.getLogger(__name__)


class TriviaGenerationService:
    """Service for generating and enriching content trivia."""

    def __init__(self):
        self.tmdb_service = TMDBService()
        self._anthropic_client: Optional[AsyncAnthropic] = None

    @property
    def anthropic_client(self) -> AsyncAnthropic:
        """Lazy initialization of Anthropic client with API key validation."""
        if self._anthropic_client is None:
            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("ANTHROPIC_API_KEY not configured")
            self._anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._anthropic_client

    async def generate_trivia(
        self,
        content: Content,
        enrich: bool = False,
    ) -> ContentTrivia:
        """Generate trivia using TMDB context -> chained AI -> fallback pipeline."""
        facts: list[TriviaFactModel] = []
        sources_used: list[str] = []

        if enrich and content.tmdb_id:
            # Primary path: TMDB context fed to AI for rich chained facts
            tmdb_context = await fetch_tmdb_context(content, self.tmdb_service)
            if tmdb_context:
                try:
                    chained = await generate_chained_facts(
                        content,
                        self.anthropic_client,
                        tmdb_context,
                        existing_count=len(facts),
                    )
                    if chained:
                        facts.extend(chained)
                        sources_used.append("ai")
                        sources_used.append("tmdb")
                except (ValueError, Exception) as e:
                    logger.warning(
                        "Chained fact generation failed, falling back",
                        extra={"content_id": str(content.id), "error": str(e)},
                    )

        # Fallback: basic TMDB facts if no AI facts generated
        if not facts and content.tmdb_id:
            tmdb_facts = await fetch_tmdb_facts(content, self.tmdb_service)
            facts.extend(tmdb_facts)
            if tmdb_facts:
                sources_used.append("tmdb")

        # Additional fallback: standalone AI facts if still under limit
        if enrich and len(facts) < settings.TRIVIA_MAX_FACTS_PER_CONTENT:
            if not any(f.chain_id for f in facts):
                try:
                    ai_facts = await generate_ai_facts(
                        content,
                        self.anthropic_client,
                        existing_count=len(facts),
                    )
                    facts.extend(ai_facts)
                    if ai_facts and "ai" not in sources_used:
                        sources_used.append("ai")
                except (ValueError, Exception) as e:
                    logger.warning(
                        "Standalone AI fact generation failed",
                        extra={"content_id": str(content.id), "error": str(e)},
                    )

        content_type = "series_episode" if content.is_series else "vod"
        trivia = await ContentTrivia.create_or_update(
            content_id=str(content.id),
            content_type=content_type,
            facts=facts,
            sources_used=sources_used,
            tmdb_id=content.tmdb_id,
            is_enriched=enrich,
        )

        return trivia

    async def get_or_generate_trivia(
        self,
        content: Content,
        enrich: bool = False,
    ) -> ContentTrivia:
        """Get existing trivia or generate new if not found."""
        existing = await ContentTrivia.find_one(
            ContentTrivia.content_id == str(content.id)
        )

        if existing:
            if enrich and not existing.is_enriched:
                return await self.generate_trivia(content, enrich=True)
            return existing

        return await self.generate_trivia(content, enrich=enrich)
