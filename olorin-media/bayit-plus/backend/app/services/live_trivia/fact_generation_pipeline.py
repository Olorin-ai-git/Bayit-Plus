"""
Fact Generation Pipeline

Orchestrates the complete fact generation process: search → extract → validate → cache → track.
"""

import logging
from typing import List

from app.models.trivia import TriviaFactModel
from app.services.live_trivia.fact_cache import FactCache
from app.services.live_trivia.fact_extractor import FactExtractionService
from app.services.live_trivia.topic_tracker import TopicTracker
from app.services.live_trivia.web_search_service import WebSearchService

logger = logging.getLogger(__name__)


class FactGenerationPipeline:
    """Pipeline for generating trivia facts from topics."""

    def __init__(
        self,
        web_search: WebSearchService,
        fact_extractor: FactExtractionService,
        fact_cache: FactCache,
        topic_tracker: TopicTracker
    ):
        """
        Initialize fact generation pipeline.

        Args:
            web_search: Web search service
            fact_extractor: Fact extraction service
            fact_cache: Fact cache manager
            topic_tracker: Topic tracker
        """
        self.web_search = web_search
        self.fact_extractor = fact_extractor
        self.fact_cache = fact_cache
        self.topic_tracker = topic_tracker

    async def generate_facts(
        self,
        topic_text: str,
        entity_type: str,
        topic_hash: str,
        channel_id: str
    ) -> List[TriviaFactModel]:
        """
        Generate facts for a topic through the complete pipeline.

        Args:
            topic_text: Topic name
            entity_type: Entity type (person|place|event|organization)
            topic_hash: Topic hash for caching
            channel_id: Channel ID for tracking

        Returns:
            List of generated trivia facts (may be empty if generation fails)
        """
        try:
            # Search for information
            search_result = await self.web_search.search(topic_text)
            if not search_result:
                logger.warning(f"No search results for '{topic_text}'")
                return []

            # Extract facts from search results
            facts = await self.fact_extractor.extract_facts(
                topic_text,
                entity_type,
                search_result
            )
            if not facts:
                logger.warning(f"No facts extracted for '{topic_text}'")
                return []

            # Validate fact quality
            valid_facts = [
                fact for fact in facts
                if self.fact_extractor.validate_fact_quality(fact)
            ]
            if not valid_facts:
                logger.warning(f"No valid facts for '{topic_text}'")
                return []

            # Cache the facts
            await self.fact_cache.cache_facts(topic_hash, valid_facts)

            # Track topic in database
            await self.topic_tracker.track_topic(
                topic_text,
                entity_type,
                topic_hash,
                channel_id,
                search_result.get("url", ""),
                len(valid_facts)
            )

            logger.info(
                f"Generated {len(valid_facts)} facts for '{topic_text}' "
                f"(source: {search_result.get('source')})"
            )

            return valid_facts

        except Exception as e:
            logger.error(f"Error generating facts for '{topic_text}': {e}")
            return []
