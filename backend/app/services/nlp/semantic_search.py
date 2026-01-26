"""
Semantic Search Service - Natural language search for content library.

Uses Claude to understand search queries and generate MongoDB filters
with optional re-ranking by semantic relevance.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from anthropic import Anthropic
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.content import Content

logger = logging.getLogger(__name__)


class SearchResult(BaseModel):
    """Single search result with relevance score."""

    content_id: str
    title: str
    content_type: str
    description: Optional[str] = None
    relevance_score: float = Field(ge=0.0, le=1.0)
    match_reason: Optional[str] = None


class SearchResults(BaseModel):
    """Collection of search results."""

    query: str
    total_found: int
    results: List[SearchResult]
    filter_used: Dict[str, Any] = Field(default_factory=dict)


class SemanticSearchService:
    """
    Semantic search for content library using Claude.

    Strategy:
    1. Use Claude to understand query intent and generate MongoDB filter
    2. Execute query on Content collection
    3. Optionally re-rank results by semantic relevance
    4. Return top N matches
    """

    def __init__(self):
        """Initialize service with Anthropic client."""
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required for semantic search")

        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def search(
        self,
        query: str,
        content_type: str = "all",
        limit: int = 20,
        rerank: bool = True
    ) -> SearchResults:
        """
        Search content library using natural language.

        Args:
            query: Natural language search query
            content_type: Filter by type ("series", "movies", "podcasts", "radio", "all")
            limit: Maximum number of results
            rerank: Whether to re-rank results by semantic relevance

        Returns:
            SearchResults with matching content

        Examples:
            >>> search = SemanticSearchService()
            >>> results = await search.search("jewish holiday content for kids")
            >>> print(f"Found {results.total_found} items")
            >>> for result in results.results:
            ...     print(f"{result.title} ({result.relevance_score:.2f})")
        """
        logger.info(f"Semantic search: '{query}' (type: {content_type}, limit: {limit})")

        # Generate MongoDB filter from query
        mongo_filter = await self._generate_filter(query, content_type)

        logger.info(f"Generated filter: {mongo_filter}")

        # Execute database query
        contents = await Content.find(mongo_filter).limit(limit * 2).to_list()  # Get 2x for re-ranking

        logger.info(f"Database returned {len(contents)} results")

        if not contents:
            return SearchResults(
                query=query,
                total_found=0,
                results=[],
                filter_used=mongo_filter
            )

        # Convert to search results
        search_results = [
            SearchResult(
                content_id=str(content.id),
                title=content.title or content.name or "Untitled",
                content_type=content.content_type or "unknown",
                description=content.description,
                relevance_score=1.0,  # Will be updated by re-ranking
                match_reason="Database match"
            )
            for content in contents
        ]

        # Re-rank by semantic relevance if enabled
        if rerank and settings.SEMANTIC_SEARCH_RERANK:
            search_results = await self._rerank_results(query, search_results)

        # Limit to requested count
        search_results = search_results[:limit]

        return SearchResults(
            query=query,
            total_found=len(contents),
            results=search_results,
            filter_used=mongo_filter
        )

    async def _generate_filter(
        self,
        query: str,
        content_type: str
    ) -> Dict[str, Any]:
        """
        Generate MongoDB filter from natural language query.

        Uses Claude to understand query intent and construct appropriate filters.

        Args:
            query: Natural language query
            content_type: Content type filter

        Returns:
            MongoDB filter dict
        """
        system_prompt = """You are a MongoDB filter generator. Convert natural language queries into MongoDB filters.

Available fields in Content collection:
- title: string (series/movie/podcast title)
- name: string (alternative name field)
- content_type: string ("series", "movie", "podcast", "radio")
- description: string (content description)
- tags: array of strings (topic tags)
- section_ids: array of strings (sections: "kids", "judaism", "israel", etc.)
- topic_tags: array of strings (specific topics)
- language: string ("en", "he", "es", etc.)
- year: number (release year)

Common queries:
- "jewish holiday content" → {"topic_tags": {"$in": ["jewish", "holiday", "judaism"]}}
- "kids content" → {"section_ids": {"$in": ["kids", "children"]}}
- "science series" → {"$and": [{"content_type": "series"}, {"tags": {"$in": ["science"]}}]}
- "hebrew movies" → {"$and": [{"content_type": "movie"}, {"language": "he"}]}

Respond ONLY with valid JSON MongoDB filter (no explanations):
"""

        user_message = f"""Query: {query}
Content type filter: {content_type if content_type != "all" else "any"}

Generate MongoDB filter:"""

        try:
            response = self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=500,
                temperature=0.0,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}]
            )

            filter_text = response.content[0].text
            mongo_filter = json.loads(filter_text)

            # Add content_type filter if specified
            if content_type != "all":
                if "$and" in mongo_filter:
                    mongo_filter["$and"].append({"content_type": content_type})
                else:
                    mongo_filter = {"$and": [mongo_filter, {"content_type": content_type}]}

            return mongo_filter

        except Exception as e:
            logger.error(f"Filter generation failed: {e}")
            # Fallback to simple text search
            filter_dict = {
                "$or": [
                    {"title": {"$regex": query, "$options": "i"}},
                    {"name": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}}
                ]
            }

            if content_type != "all":
                filter_dict = {"$and": [filter_dict, {"content_type": content_type}]}

            return filter_dict

    async def _rerank_results(
        self,
        query: str,
        results: List[SearchResult]
    ) -> List[SearchResult]:
        """
        Re-rank results by semantic relevance using Claude.

        Args:
            query: Original search query
            results: Initial search results to re-rank

        Returns:
            Re-ranked search results with updated relevance scores
        """
        if len(results) <= 1:
            return results

        logger.info(f"Re-ranking {len(results)} results for query: '{query}'")

        # Build result descriptions for Claude
        result_descriptions = []
        for i, result in enumerate(results):
            desc = f"{i+1}. {result.title}"
            if result.description:
                desc += f" - {result.description[:200]}"
            result_descriptions.append(desc)

        results_text = "\n".join(result_descriptions)

        system_prompt = f"""You are a semantic relevance scorer. Rate how well each item matches the query.

Query: "{query}"

Items to rank:
{results_text}

Respond ONLY with valid JSON array of scores (0.0-1.0) in same order:
[0.95, 0.82, 0.75, ...]

Score 1.0 = perfect match, 0.0 = no relevance
"""

        try:
            response = self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=500,
                temperature=0.0,
                system=system_prompt,
                messages=[{"role": "user", "content": "Generate relevance scores:"}]
            )

            scores_text = response.content[0].text
            scores = json.loads(scores_text)

            # Update relevance scores
            for i, score in enumerate(scores):
                if i < len(results):
                    results[i].relevance_score = max(0.0, min(1.0, score))
                    results[i].match_reason = f"Semantic relevance: {score:.2f}"

            # Sort by relevance score (descending)
            results.sort(key=lambda x: x.relevance_score, reverse=True)

            logger.info(f"Re-ranked results: top score = {results[0].relevance_score:.2f}")

            return results

        except Exception as e:
            logger.error(f"Re-ranking failed: {e}")
            # Return original order if re-ranking fails
            return results
