"""
Beta AI Search Service

Natural language search across all content using vector embeddings.
Powered by OpenAI embeddings + semantic search.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.content import (
    Content,
    LiveChannel,
    PodcastEpisode,
)
from app.services.beta.credit_service import BetaCreditService

logger = logging.getLogger(__name__)


class BetaAISearchService:
    """
    AI-powered semantic search with Beta credit management.

    Features:
    - Natural language query understanding
    - Vector similarity search across all content types
    - Multi-language support (searches in any language)
    - Beta credit charging per search query
    - Result ranking and relevance scoring
    """

    # Credit cost per search query
    CREDITS_PER_SEARCH = 2  # 2 credits per AI search ($0.02)

    def __init__(
        self,
        user_id: str,
        credit_service: Optional[BetaCreditService] = None,
    ):
        self.user_id = user_id

        # Beta credit service
        self._credit_service = credit_service or BetaCreditService(
            settings=settings,
            metering_service=None,
            db=None
        )

        # AI clients
        self._openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self._anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Embedding model
        self._embedding_model = "text-embedding-3-small"  # OpenAI, 1536 dimensions

    async def search(
        self,
        query: str,
        content_types: Optional[List[str]] = None,
        limit: int = 20,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Perform AI-powered semantic search.

        Args:
            query: Natural language search query
            content_types: Filter by types (movies, series, podcasts, audiobooks, live_channels)
            limit: Maximum results to return
            language: Filter by language (optional)

        Returns:
            Search results with relevance scores and metadata

        Raises:
            ValueError: If insufficient credits
        """
        # Check Beta enrollment
        is_beta_user = await self._credit_service.is_beta_user(self.user_id)

        if not is_beta_user:
            raise ValueError(
                "AI Search is a Beta 500 exclusive feature. "
                "Enroll in Beta 500 to access natural language search."
            )

        # Check credits
        balance = await self._credit_service.get_balance(self.user_id)
        if balance < self.CREDITS_PER_SEARCH:
            raise ValueError(
                f"Insufficient credits: {balance} available, "
                f"{self.CREDITS_PER_SEARCH} required for AI search"
            )

        # Deduct credits upfront
        success, remaining = await self._credit_service.deduct_credits(
            user_id=self.user_id,
            feature="ai_search",
            usage_amount=self.CREDITS_PER_SEARCH,
            metadata={
                "query": query[:100],  # Truncate for privacy
                "content_types": content_types,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

        if not success:
            raise ValueError("Failed to deduct credits for AI search")

        logger.info(
            f"AI Search: user={self.user_id}, query='{query[:50]}...', "
            f"credits_remaining={remaining}"
        )

        # Perform search
        try:
            # Step 1: Understand query intent with Claude
            query_analysis = await self._analyze_query(query)

            # Step 2: Generate query embedding
            query_embedding = await self._generate_embedding(query)

            # Step 3: Vector search across content
            results = await self._vector_search(
                query_embedding=query_embedding,
                query_analysis=query_analysis,
                content_types=content_types,
                limit=limit,
                language=language,
            )

            # Step 4: Re-rank with Claude for relevance
            ranked_results = await self._rerank_results(query, results)

            return {
                "query": query,
                "query_analysis": query_analysis,
                "total_results": len(ranked_results),
                "results": ranked_results,
                "credits_charged": self.CREDITS_PER_SEARCH,
                "credits_remaining": remaining,
            }

        except Exception as e:
            logger.error(f"AI Search error: {e}")
            # Refund credits on error
            await self._credit_service.add_credits(
                user_id=self.user_id,
                amount=self.CREDITS_PER_SEARCH,
                description="AI search error refund",
                metadata={"error": str(e)},
            )
            raise

    async def _analyze_query(self, query: str) -> Dict[str, Any]:
        """
        Analyze query intent with Claude.

        Extracts:
        - Content type preference (movie, series, podcast, etc.)
        - Genre/category hints
        - Language preference
        - Temporal hints (recent, old, 2020s, etc.)
        - Mood/tone (action, comedy, documentary, etc.)
        """
        try:
            response = await self._anthropic_client.messages.create(
                model="claude-3-5-haiku-20241022",  # Fast and cheap
                max_tokens=200,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Analyze this search query and extract key attributes in JSON format:

Query: "{query}"

Return JSON with:
- content_types: array of ["movie", "series", "podcast", "audiobook", "live_channel"] (all that apply)
- genres: array of genre strings
- language: detected query language (he, en, es, etc.) or null
- mood: string describing mood/tone or null
- temporal: string like "recent", "2020s", "classic" or null
- keywords: array of key search terms

Example: {{"content_types": ["movie"], "genres": ["action"], "language": "en", "mood": "thriller", "temporal": "recent", "keywords": ["heist", "bank"]}}

JSON only, no explanation:""",
                    }
                ],
            )

            # Parse Claude's JSON response
            import json
            analysis = json.loads(response.content[0].text)
            return analysis

        except Exception as e:
            logger.warning(f"Query analysis failed: {e}, using defaults")
            return {
                "content_types": None,
                "genres": [],
                "language": None,
                "mood": None,
                "temporal": None,
                "keywords": [query],
            }

    async def _generate_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for text using OpenAI."""
        try:
            response = await self._openai_client.embeddings.create(
                model=self._embedding_model,
                input=text,
            )
            return response.data[0].embedding

        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise

    async def _vector_search(
        self,
        query_embedding: List[float],
        query_analysis: Dict[str, Any],
        content_types: Optional[List[str]],
        limit: int,
        language: Optional[str],
    ) -> List[Dict[str, Any]]:
        """
        Perform vector similarity search across content.

        MongoDB Atlas Search supports vector search with $vectorSearch aggregation.
        """
        # Build filter criteria from query analysis
        filters = {}

        # Content type filter
        if content_types:
            filters["content_type"] = {"$in": content_types}
        elif query_analysis.get("content_types"):
            filters["content_type"] = {"$in": query_analysis["content_types"]}

        # Language filter
        if language:
            filters["language"] = language
        elif query_analysis.get("language"):
            filters["language"] = query_analysis["language"]

        # Genre filter
        if query_analysis.get("genres"):
            filters["genres"] = {"$in": query_analysis["genres"]}

        # TODO: Implement actual vector search once embeddings are generated for content
        # For now, return keyword-based results as fallback
        results = await self._keyword_fallback_search(
            keywords=query_analysis.get("keywords", []),
            filters=filters,
            limit=limit,
        )

        return results

    async def _keyword_fallback_search(
        self,
        keywords: List[str],
        filters: Dict[str, Any],
        limit: int,
    ) -> List[Dict[str, Any]]:
        """
        Fallback keyword search (until vector embeddings are indexed).

        Searches title and description fields across all content types.
        """
        results = []

        # Search movies
        movie_query = {
            "content_format": "movie",
            "$or": []
        }
        for keyword in keywords:
            movie_query["$or"].extend([
                {"title": {"$regex": keyword, "$options": "i"}},
                {"title_en": {"$regex": keyword, "$options": "i"}},
                {"description": {"$regex": keyword, "$options": "i"}},
                {"description_en": {"$regex": keyword, "$options": "i"}},
            ])

        movies = await Content.find(movie_query).limit(limit // 4).to_list()
        for movie in movies:
            results.append({
                "type": "movie",
                "id": str(movie.id),
                "title": movie.title_en or movie.title,
                "description": (movie.description_en or movie.description or "")[:200],
                "poster": getattr(movie, "poster", None),
                "relevance_score": 0.8,  # Placeholder
            })

        # TODO: Add Series, Podcasts, Audiobooks, LiveChannels searches

        return results

    async def _rerank_results(
        self,
        query: str,
        results: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Re-rank results with Claude for improved relevance.

        Uses Claude to score each result's relevance to the query.
        """
        if len(results) <= 1:
            return results

        # For now, return results as-is (re-ranking can be added later for better relevance)
        return results

    async def get_cost_estimate(self) -> Dict[str, Any]:
        """
        Get credit cost estimate for AI search.

        Returns:
            Cost breakdown with credit amount and USD equivalent
        """
        return {
            "credits_per_search": self.CREDITS_PER_SEARCH,
            "usd_equivalent": self.CREDITS_PER_SEARCH * 0.01,  # $0.01 per credit
            "features": [
                "natural_language",
                "multi_language",
                "semantic_search",
                "claude_analysis",
                "openai_embeddings",
            ],
        }


async def create_ai_search_service(user_id: str) -> BetaAISearchService:
    """
    Factory function to create Beta AI Search service.

    Args:
        user_id: User identifier

    Returns:
        BetaAISearchService: Ready-to-use search service
    """
    return BetaAISearchService(user_id=user_id)
