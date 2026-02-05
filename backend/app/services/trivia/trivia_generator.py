"""
Trivia Generation Service.
Generates trivia facts for content using TMDB data and AI with chain support.

NEW: Always generates trivia in English, then translates to Hebrew and Spanish
using TriviaTranslationService.
"""

import logging
from typing import Optional

from anthropic import AsyncAnthropic

from app.api.routes.content.utils import is_series_content
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
from app.services.trivia.trivia_translation_service import TriviaTranslationService

logger = logging.getLogger(__name__)


class TriviaGenerationService:
    """Service for generating and enriching content trivia.

    NEW: Always generates in English, then translates to Hebrew and Spanish.
    """

    def __init__(self):
        self.tmdb_service = TMDBService()
        self._anthropic_client: Optional[AsyncAnthropic] = None
        self.translation_service = TriviaTranslationService()

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
        language: str = "en",  # DEPRECATED: Always generates in English now
    ) -> ContentTrivia:
        """Generate trivia using TMDB context -> chained AI -> fallback pipeline.

        NEW: Always generates in English, then translates to Hebrew and Spanish.
        The language parameter is deprecated and ignored.
        """
        facts: list[TriviaFactModel] = []
        sources_used: list[str] = []

        if enrich and content.tmdb_id:
            # Primary path: TMDB context fed to AI for rich chained facts
            tmdb_context = await fetch_tmdb_context(content, self.tmdb_service)
            if tmdb_context:
                try:
                    # Always generate in English
                    chained = await generate_chained_facts(
                        content,
                        self.anthropic_client,
                        tmdb_context,
                        language="en",  # Always English
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
            # Always generate in English
            tmdb_facts = await fetch_tmdb_facts(content, self.tmdb_service, language="en")
            facts.extend(tmdb_facts)
            if tmdb_facts:
                sources_used.append("tmdb")

        # Additional fallback: standalone AI facts if still under limit
        if enrich and len(facts) < settings.TRIVIA_MAX_FACTS_PER_CONTENT:
            if not any(f.chain_id for f in facts):
                try:
                    # Always generate in English
                    ai_facts = await generate_ai_facts(
                        content,
                        self.anthropic_client,
                        language="en",  # Always English
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

        # NEW: Translate all facts to Hebrew and Spanish
        facts = await self._translate_facts(facts, content.id)

        is_series = is_series_content(content.model_dump())
        content_type = "series_episode" if is_series else "vod"
        trivia = await ContentTrivia.create_or_update(
            content_id=str(content.id),
            content_type=content_type,
            facts=facts,
            sources_used=sources_used,
            tmdb_id=content.tmdb_id,
            is_enriched=enrich,
        )

        return trivia

    async def _translate_facts(
        self, facts: list[TriviaFactModel], content_id: str
    ) -> list[TriviaFactModel]:
        """Translate all facts to Hebrew and Spanish.

        Args:
            facts: List of facts with English text
            content_id: Content ID for tracking

        Returns:
            Facts with translations populated
        """
        for fact in facts:
            try:
                # Translate to both Hebrew and Spanish
                translations = await self.translation_service.translate_trivia_fact(
                    english_text=fact.text,
                    content_id=f"trivia_{content_id}_{fact.fact_id}",
                    partner_id="system"
                )

                # Update fact with translations
                fact.source_language = "en"
                fact.translations = translations

                logger.debug(
                    "Translated trivia fact",
                    extra={
                        "fact_id": fact.fact_id,
                        "translations": list(translations.keys())
                    }
                )

            except Exception as e:
                logger.warning(
                    "Failed to translate trivia fact, keeping English only",
                    extra={
                        "fact_id": fact.fact_id,
                        "error": str(e)
                    }
                )
                # Set source language but leave translations empty
                fact.source_language = "en"
                fact.translations = {}

        return facts

    async def get_or_generate_trivia(
        self,
        content: Content,
        enrich: bool = False,
        language: str = "en",  # DEPRECATED: Always generates in English now
    ) -> ContentTrivia:
        """Get existing trivia or generate new if not found.

        NEW: Always generates in English, then translates to Hebrew and Spanish.
        The language parameter is deprecated and ignored.
        """
        existing = await ContentTrivia.find_one(
            ContentTrivia.content_id == str(content.id)
        )

        if existing:
            if enrich and not existing.is_enriched:
                return await self.generate_trivia(content, enrich=True)
            return existing

        return await self.generate_trivia(content, enrich=enrich)
