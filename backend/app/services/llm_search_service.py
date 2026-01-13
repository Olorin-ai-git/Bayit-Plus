"""
LLM Search Service for EPG
Uses Claude AI to interpret natural language queries and search EPG data intelligently.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from anthropic import Anthropic
from anthropic.types import Message

from app.core.config import settings
from app.models.content import EPGEntry, LiveChannel
from beanie.operators import RegEx, And, Or, In

logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)


class LLMSearchService:
    """Service for intelligent EPG search using Claude AI"""

    def __init__(self):
        self.client = client
        self.model = settings.CLAUDE_MODEL
        self.max_results = getattr(settings, 'LLM_SEARCH_MAX_RESULTS', 50)
        self.timeout = getattr(settings, 'LLM_SEARCH_TIMEOUT_SECONDS', 30)

    async def search(
        self,
        query: str,
        timezone: str = "UTC",
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute natural language search on EPG data.

        Args:
            query: User's natural language query
            timezone: User's timezone (for time-based queries)
            user_context: Optional user context (preferences, subscription, etc.)

        Returns:
            Dict with interpretation, results, and metadata
        """
        try:
            # Step 1: Use Claude to interpret the query
            logger.info(f"LLM Search Query: {query}")
            interpretation = await self._interpret_query(query, timezone, user_context)

            # Step 2: Build MongoDB query from interpretation
            mongo_query = await self._build_mongo_query(interpretation)

            # Step 3: Execute database search
            results = await self._execute_search(mongo_query, interpretation)

            # Step 4: Rank results if needed
            if interpretation.get("needs_ranking", False):
                results = await self._rank_results(query, results, interpretation)

            # Step 5: Return structured response
            return {
                "success": True,
                "query": query,
                "interpretation": interpretation,
                "results": results,
                "total_results": len(results),
                "execution_time_ms": interpretation.get("execution_time_ms", 0)
            }

        except Exception as e:
            logger.error(f"LLM search failed: {e}", exc_info=True)
            return {
                "success": False,
                "query": query,
                "error": str(e),
                "results": []
            }

    async def _interpret_query(
        self,
        query: str,
        timezone: str,
        user_context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Use Claude to interpret the natural language query and extract search criteria.
        """
        start_time = datetime.utcnow()

        # Build context for Claude
        context = f"""You are a TV guide search assistant. Interpret the user's natural language query and extract structured search criteria.

Current time: {datetime.utcnow().isoformat()}
User timezone: {timezone}
"""

        if user_context:
            context += f"\nUser preferences: {json.dumps(user_context, indent=2)}"

        # Prompt for Claude
        prompt = f"""Interpret this TV guide search query and extract search criteria:

"{query}"

Extract the following entities:
1. **Title keywords**: Words that should match program titles
2. **Description keywords**: Words that might appear in descriptions
3. **Actors/Cast**: Names of people (actors, directors, hosts)
4. **Genres**: Categories (news, drama, comedy, sports, documentary, etc.)
5. **Channels**: Specific channel names or IDs mentioned
6. **Time range**: Any time-related filters (today, tonight, this week, specific times)
7. **Language**: Preferred language (Hebrew, English, Arabic, etc.)
8. **Other filters**: Any other relevant filters

Also determine:
- **Search type**: "exact", "fuzzy", or "semantic"
- **Needs ranking**: true if results should be ranked by relevance
- **Confidence**: How confident you are in the interpretation (0.0-1.0)

Respond with a JSON object ONLY (no markdown, no explanation):
{{
  "title_keywords": ["keyword1", "keyword2"],
  "description_keywords": ["keyword1"],
  "cast": ["actor1", "director1"],
  "genres": ["genre1"],
  "channels": ["channel1"],
  "time_range": {{
    "start": "ISO timestamp or null",
    "end": "ISO timestamp or null",
    "relative": "today|tonight|this_week|next_7_days|null"
  }},
  "language": "he|en|ar|null",
  "search_type": "exact|fuzzy|semantic",
  "needs_ranking": true|false,
  "confidence": 0.85,
  "interpretation_summary": "Brief human-readable summary of what you understood"
}}"""

        try:
            # Call Claude API
            message: Message = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3  # Lower temperature for more consistent JSON
            )

            # Extract JSON from response
            response_text = message.content[0].text
            logger.debug(f"Claude interpretation response: {response_text}")

            # Parse JSON (strip markdown code blocks if present)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            interpretation = json.loads(response_text)

            # Add execution time
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            interpretation["execution_time_ms"] = execution_time

            logger.info(f"Query interpreted: {interpretation.get('interpretation_summary', 'N/A')}")
            return interpretation

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            logger.error(f"Response text: {response_text}")
            # Fallback to simple keyword search
            return {
                "title_keywords": [query],
                "description_keywords": [query],
                "cast": [],
                "genres": [],
                "channels": [],
                "time_range": {"start": None, "end": None, "relative": None},
                "language": None,
                "search_type": "fuzzy",
                "needs_ranking": True,
                "confidence": 0.5,
                "interpretation_summary": f"Simple keyword search for: {query}",
                "execution_time_ms": (datetime.utcnow() - start_time).total_seconds() * 1000
            }

    async def _build_mongo_query(self, interpretation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build MongoDB query from Claude's interpretation.
        """
        conditions = []

        # Title keywords
        title_keywords = interpretation.get("title_keywords", [])
        if title_keywords:
            if interpretation.get("search_type") == "exact":
                # Exact phrase search
                conditions.append({"title": RegEx(" ".join(title_keywords), "i")})
            else:
                # Fuzzy search - match any keyword
                title_conditions = [{"title": RegEx(kw, "i")} for kw in title_keywords]
                conditions.append(Or(*title_conditions))

        # Description keywords
        desc_keywords = interpretation.get("description_keywords", [])
        if desc_keywords:
            desc_conditions = [{"description": RegEx(kw, "i")} for kw in desc_keywords]
            conditions.append(Or(*desc_conditions))

        # Cast/Actors (search in cast array)
        cast = interpretation.get("cast", [])
        if cast:
            cast_conditions = [{"cast": RegEx(person, "i")} for person in cast]
            conditions.append(Or(*cast_conditions))

        # Genres
        genres = interpretation.get("genres", [])
        if genres:
            # Map natural language genres to database categories
            genre_mapping = {
                "news": ["news", "חדשות"],
                "drama": ["drama", "דרמה"],
                "comedy": ["comedy", "קומדיה"],
                "sports": ["sports", "ספורט"],
                "documentary": ["documentary", "דוקו"],
                "kids": ["kids", "children", "ילדים"],
                "movies": ["movies", "סרטים"],
                "series": ["series", "סדרות"],
                "entertainment": ["entertainment", "בידור"]
            }

            db_genres = []
            for genre in genres:
                genre_lower = genre.lower()
                if genre_lower in genre_mapping:
                    db_genres.extend(genre_mapping[genre_lower])
                else:
                    db_genres.append(genre)

            if db_genres:
                genre_conditions = [{"category": RegEx(g, "i")} for g in db_genres]
                conditions.append(Or(*genre_conditions))

        # Channels
        channels = interpretation.get("channels", [])
        if channels:
            # Try to find channel IDs by name
            channel_docs = await LiveChannel.find(
                Or(*[{"name": RegEx(ch, "i")} for ch in channels])
            ).to_list()

            if channel_docs:
                channel_ids = [str(ch.id) for ch in channel_docs]
                conditions.append({"channel_id": In(channel_ids)})

        # Time range
        time_range = interpretation.get("time_range", {})
        if time_range:
            relative = time_range.get("relative")
            now = datetime.utcnow()

            if relative == "today":
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                end = start + timedelta(days=1)
                conditions.append({"start_time": {"$gte": start, "$lt": end}})

            elif relative == "tonight":
                start = now.replace(hour=18, minute=0, second=0, microsecond=0)
                if now.hour >= 18:
                    end = start + timedelta(days=1)
                else:
                    end = start.replace(hour=23, minute=59, second=59)
                conditions.append({"start_time": {"$gte": start, "$lt": end}})

            elif relative == "this_week":
                end = now + timedelta(days=7)
                conditions.append({"start_time": {"$gte": now, "$lt": end}})

            elif relative == "next_7_days":
                end = now + timedelta(days=7)
                conditions.append({"start_time": {"$gte": now, "$lt": end}})

            else:
                # Use explicit start/end if provided
                if time_range.get("start"):
                    start = datetime.fromisoformat(time_range["start"].replace("Z", "+00:00"))
                    conditions.append({"start_time": {"$gte": start}})

                if time_range.get("end"):
                    end = datetime.fromisoformat(time_range["end"].replace("Z", "+00:00"))
                    conditions.append({"start_time": {"$lt": end}})

        # Build final query
        if conditions:
            return And(*conditions)
        else:
            # No specific conditions - return all recent/upcoming programs
            now = datetime.utcnow()
            return {"start_time": {"$gte": now - timedelta(hours=2)}}

    async def _execute_search(
        self,
        mongo_query: Any,
        interpretation: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Execute the MongoDB query and return results.
        """
        try:
            # Execute query with limit
            programs = await EPGEntry.find(mongo_query).limit(self.max_results).to_list()

            # Convert to dict and add relevance score placeholder
            results = []
            for program in programs:
                result = {
                    "id": str(program.id),
                    "channel_id": program.channel_id,
                    "title": program.title,
                    "description": program.description,
                    "start_time": program.start_time.isoformat(),
                    "end_time": program.end_time.isoformat(),
                    "category": program.category,
                    "thumbnail": program.thumbnail,
                    "cast": program.cast or [],
                    "genres": program.genres or [],
                    "rating": program.rating,
                    "director": program.director,
                    "relevance_score": 1.0  # Placeholder, will be updated in ranking
                }
                results.append(result)

            logger.info(f"Found {len(results)} programs matching query")
            return results

        except Exception as e:
            logger.error(f"Database search failed: {e}", exc_info=True)
            return []

    async def _rank_results(
        self,
        query: str,
        results: List[Dict[str, Any]],
        interpretation: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Use Claude to rank search results by relevance.
        """
        if not results:
            return results

        try:
            # Limit to top 20 for ranking (to stay within token limits)
            results_to_rank = results[:20]

            # Create simplified version for Claude
            simplified_results = [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "description": r.get("description", "")[:200],  # Limit description length
                    "category": r.get("category"),
                    "cast": r.get("cast", [])[:5]  # Limit cast list
                }
                for r in results_to_rank
            ]

            prompt = f"""Given this search query: "{query}"

And these TV program results:
{json.dumps(simplified_results, indent=2)}

Rank these programs by relevance to the query. Consider:
1. Title match quality
2. Description relevance
3. Cast/crew relevance
4. Category match

Respond with a JSON array of program IDs in order of relevance (most relevant first):
["id1", "id2", "id3", ...]
"""

            message: Message = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )

            response_text = message.content[0].text

            # Parse JSON
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            ranked_ids = json.loads(response_text)

            # Reorder results based on ranking
            id_to_result = {r["id"]: r for r in results_to_rank}
            ranked_results = []

            for idx, result_id in enumerate(ranked_ids):
                if result_id in id_to_result:
                    result = id_to_result[result_id]
                    result["relevance_score"] = 1.0 - (idx * 0.05)  # Decreasing score
                    ranked_results.append(result)

            # Add any results that weren't ranked
            ranked_ids_set = set(ranked_ids)
            for result in results_to_rank:
                if result["id"] not in ranked_ids_set:
                    result["relevance_score"] = 0.5
                    ranked_results.append(result)

            # Add remaining results (beyond top 20) at the end
            if len(results) > 20:
                for result in results[20:]:
                    result["relevance_score"] = 0.3
                    ranked_results.append(result)

            logger.info(f"Ranked {len(ranked_results)} results")
            return ranked_results

        except Exception as e:
            logger.error(f"Result ranking failed: {e}", exc_info=True)
            # Return original results if ranking fails
            return results


# Singleton instance
llm_search_service = LLMSearchService()
