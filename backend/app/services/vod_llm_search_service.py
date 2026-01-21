"""
VOD LLM Search Service using Claude AI.

Provides natural language search for VOD content with intelligent query interpretation
and semantic ranking.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from anthropic import Anthropic
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.content import Content
from app.services.unified_search_service import (SearchFilters,
                                                 UnifiedSearchService)

logger = logging.getLogger(__name__)


class SearchIntent(BaseModel):
    """Interpreted search intent from natural language query"""

    genres: Optional[List[str]] = Field(None, description="Extracted genres")
    cast: Optional[List[str]] = Field(None, description="Actors/Cast members")
    director: Optional[str] = Field(None, description="Director name")
    year_min: Optional[int] = Field(None, description="Minimum year")
    year_max: Optional[int] = Field(None, description="Maximum year")
    content_type: Optional[str] = Field(
        None, description="movie, series, documentary, etc."
    )
    subtitle_languages: Optional[List[str]] = Field(
        None, description="Required subtitle languages"
    )
    themes: Optional[List[str]] = Field(None, description="Thematic content")
    origin: Optional[str] = Field(None, description="Country/origin")
    is_kids_content: Optional[bool] = Field(None, description="Family-friendly filter")
    interpretation: str = Field(..., description="Human-readable interpretation")
    confidence: float = Field(..., description="Confidence score 0-1")


class VODLLMSearchService:
    """
    Natural language search for VOD content using Claude AI.

    Features:
    - Query interpretation (extract genres, cast, year, etc.)
    - Semantic result ranking
    - Jewish/Israeli context understanding
    - Multi-language support
    """

    def __init__(self):
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL
        self.unified_search = UnifiedSearchService()

    async def search(
        self, query: str, user_context: Optional[Dict[str, Any]] = None, limit: int = 20
    ) -> Dict[str, Any]:
        """
        Execute natural language search on VOD content.

        Args:
            query: User's natural language query
            user_context: Optional user preferences and subscription info
            limit: Maximum results to return

        Returns:
            Dict with interpretation, results, and metadata
        """
        try:
            start_time = datetime.now()
            logger.info(f"LLM VOD Search Query: {query}")

            # Step 1: Interpret query with Claude
            interpretation = await self._interpret_query(query, user_context)
            logger.info(f"Interpretation confidence: {interpretation.confidence:.2f}")

            # Step 2: Convert interpretation to search filters
            filters = self._interpretation_to_filters(interpretation)

            # Step 3: Execute database search
            results = await self._execute_search(filters, interpretation, limit)

            # Step 4: Rank results if needed (for complex queries or many results)
            if interpretation.confidence < 0.7 or len(results) > 20:
                results = await self._rank_results(query, results[:50], interpretation)

            # Calculate execution time
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)

            return {
                "success": True,
                "query": query,
                "interpretation": {
                    "text": interpretation.interpretation,
                    "confidence": interpretation.confidence,
                    "extracted_criteria": {
                        "genres": interpretation.genres,
                        "cast": interpretation.cast,
                        "director": interpretation.director,
                        "year_range": (
                            [interpretation.year_min, interpretation.year_max]
                            if interpretation.year_min or interpretation.year_max
                            else None
                        ),
                        "content_type": interpretation.content_type,
                        "subtitle_languages": interpretation.subtitle_languages,
                        "themes": interpretation.themes,
                        "origin": interpretation.origin,
                        "is_kids_content": interpretation.is_kids_content,
                    },
                },
                "results": results,
                "total_results": len(results),
                "execution_time_ms": execution_time,
            }

        except Exception as e:
            logger.error(f"LLM VOD search failed: {e}", exc_info=True)
            return {"success": False, "query": query, "error": str(e), "results": []}

    async def _interpret_query(
        self, query: str, user_context: Optional[Dict[str, Any]]
    ) -> SearchIntent:
        """
        Use Claude to interpret natural language query.

        Examples:
        - "Israeli comedies from the 90s" → {genres: ["comedy"], year_min: 1990, year_max: 1999}
        - "Movies with Gal Gadot in English with subtitles" → {cast: ["Gal Gadot"], subtitle_languages: ["en"]}
        - "Family-friendly animated films" → {genres: ["animation"], is_kids_content: True}
        """

        # Build context-aware prompt
        user_prefs = ""
        if user_context:
            user_prefs = f"\nUser preferences: {json.dumps(user_context, indent=2)}"

        prompt = f"""Interpret this search query for a Jewish/Israeli streaming service (Bayit+).

Query: "{query}"{user_prefs}

Extract the following information from the query:

1. **Genres**: Comedy, Drama, Documentary, Kids, Action, Romance, Thriller, Horror, etc.
2. **Cast/Actors**: Specific actors or actresses mentioned
3. **Director**: Director name if mentioned
4. **Year or Time Period**: Specific year, decade (e.g., "90s" = 1990-1999), or range
5. **Content Type**: movie, series, documentary, short film, or leave null if not specified
6. **Language**: Hebrew (he), English (en), Spanish (es), Yiddish (yi), Arabic (ar)
7. **Subtitle Requirements**: Languages needed for subtitles
8. **Themes**: Family-friendly, Jewish holidays, Israeli history, Holocaust, IDF, kibbutz, etc.
9. **Origin/Production**: Israeli, American, French, British, etc.
10. **Kids Content**: True if explicitly family-friendly/for children

Context about content:
- This is a Jewish/Israeli streaming platform
- Content includes Israeli films, Jewish cultural content, Hebrew language shows
- Users often search for content related to Jewish themes, Israeli history, and Hebrew content
- "Family-friendly" or "for kids" should set is_kids_content to true

Respond with JSON only (no markdown, no explanation):
{{
  "genres": ["genre1", "genre2"] or null,
  "cast": ["actor1"] or null,
  "director": "director name" or null,
  "year_min": 1990 or null,
  "year_max": 1999 or null,
  "content_type": "movie" or "series" or null,
  "subtitle_languages": ["en", "he"] or null,
  "themes": ["family", "holiday"] or null,
  "origin": "Israeli" or null,
  "is_kids_content": true or false or null,
  "interpretation": "User wants Israeli comedies from the 1990s",
  "confidence": 0.85
}}

Confidence scoring:
- 0.9-1.0: Very specific query with multiple clear criteria
- 0.7-0.9: Clear intent with some criteria
- 0.5-0.7: Vague or ambiguous query
- 0.0-0.5: Very unclear or nonsensical query

Examples:
Query: "Israeli comedies from the 90s"
Response: {{"genres": ["comedy"], "year_min": 1990, "year_max": 1999, "origin": "Israeli", "interpretation": "User wants Israeli comedy films from the 1990s", "confidence": 0.95}}

Query: "Movies with Gal Gadot in English with subtitles"
Response: {{"cast": ["Gal Gadot"], "subtitle_languages": ["en"], "content_type": "movie", "interpretation": "User wants movies featuring Gal Gadot with English subtitles", "confidence": 0.9}}

Query: "Kids shows in Hebrew"
Response: {{"is_kids_content": true, "content_type": "series", "interpretation": "User wants children's TV shows in Hebrew language", "confidence": 0.85}}

Now interpret: "{query}"
"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
            )

            # Parse JSON response
            response_text = response.content[0].text.strip()
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()

            interpretation_data = json.loads(response_text)
            return SearchIntent(**interpretation_data)

        except Exception as e:
            logger.error(f"Error interpreting query with Claude: {e}", exc_info=True)
            # Fallback to simple interpretation
            return SearchIntent(
                interpretation=f"Simple search for: {query}", confidence=0.3
            )

    def _interpretation_to_filters(self, interpretation: SearchIntent) -> SearchFilters:
        """
        Convert SearchIntent to SearchFilters for unified search.
        """
        return SearchFilters(
            content_types=["vod"],
            genres=interpretation.genres,
            year_min=interpretation.year_min,
            year_max=interpretation.year_max,
            subtitle_languages=interpretation.subtitle_languages,
            is_kids_content=interpretation.is_kids_content,
        )

    async def _execute_search(
        self, filters: SearchFilters, interpretation: SearchIntent, limit: int
    ) -> List[Dict[str, Any]]:
        """
        Execute search using unified search service with interpretation-based filters.
        """
        # Build search query from interpretation
        query_parts = []

        if interpretation.cast:
            query_parts.extend(interpretation.cast)
        if interpretation.director:
            query_parts.append(interpretation.director)
        if interpretation.themes:
            query_parts.extend(interpretation.themes)
        if interpretation.origin:
            query_parts.append(interpretation.origin)

        query = " ".join(query_parts) if query_parts else ""

        # Use unified search service
        search_results = await self.unified_search.search(
            query=query, filters=filters, page=1, limit=limit
        )

        return search_results.results

    async def _rank_results(
        self, query: str, results: List[Dict[str, Any]], interpretation: SearchIntent
    ) -> List[Dict[str, Any]]:
        """
        Use Claude to semantically rank search results by relevance.

        This is called for:
        - Low confidence interpretations (< 0.7)
        - Large result sets (> 20 items)
        """
        if not results:
            return []

        logger.info(f"Ranking {len(results)} results with Claude")

        # Create compact result summary for Claude
        result_summaries = []
        for idx, result in enumerate(results):
            summary = {
                "index": idx,
                "title": result.get("title", ""),
                "description": (result.get("description", "") or "")[:200],  # Truncate
                "genres": result.get("genres", []),
                "year": result.get("year"),
                "cast": (result.get("cast", []) or [])[:3],  # First 3 cast members
                "director": result.get("director"),
            }
            result_summaries.append(summary)

        prompt = f"""Rank these search results by relevance to the query.

Query: "{query}"
Interpretation: {interpretation.interpretation}

Results:
{json.dumps(result_summaries, indent=2)}

Return a JSON array of indexes in order of relevance (most relevant first).
Only include the top 20 most relevant items.

Response format: [3, 1, 7, 2, ...]

Consider:
1. Title relevance to query
2. Genre match with interpretation
3. Cast/director match
4. Year proximity if year was mentioned
5. Description relevance

Respond with JSON array only (no explanation):
"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )

            # Parse ranking
            ranking_text = response.content[0].text.strip()
            # Remove markdown if present
            if ranking_text.startswith("```"):
                ranking_text = ranking_text.split("```")[1].strip()
                if ranking_text.startswith("json"):
                    ranking_text = ranking_text[4:].strip()

            ranked_indexes = json.loads(ranking_text)

            # Reorder results
            ranked_results = []
            for idx in ranked_indexes:
                if 0 <= idx < len(results):
                    ranked_results.append(results[idx])

            # Add any remaining results not in ranking
            for idx, result in enumerate(results):
                if idx not in ranked_indexes:
                    ranked_results.append(result)

            logger.info(f"Ranked results: {len(ranked_results)} items")
            return ranked_results[:20]  # Top 20

        except Exception as e:
            logger.error(f"Error ranking results with Claude: {e}", exc_info=True)
            # Fallback to original order
            return results[:20]
