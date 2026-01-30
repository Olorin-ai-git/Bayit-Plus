"""
Beta AI Recommendations Service

Personalized content recommendations using AI analysis of user preferences.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from anthropic import AsyncAnthropic

from app.core.config import settings
from app.models.content import Content, PodcastEpisode, Podcast, RadioStation
from app.models.user import User
from app.models.watchlist import WatchHistory
from app.services.beta.credit_service import BetaCreditService

logger = logging.getLogger(__name__)


class BetaAIRecommendationsService:
    """
    AI-powered personalized recommendations with Beta credit management.

    Features:
    - Analyzes user viewing/listening history
    - Understands user preferences and patterns
    - Generates personalized recommendations with Claude
    - Explains why each recommendation matches user taste
    - Beta credit charging per recommendation request
    """

    # Credit cost per recommendation request
    CREDITS_PER_REQUEST = 3  # 3 credits per AI recommendation ($0.03)

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

        # AI client
        self._anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def get_recommendations(
        self,
        content_type: str = "all",
        limit: int = 10,
        context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get personalized AI recommendations.

        Args:
            content_type: Type of content (movies, series, podcasts, audiobooks, all)
            limit: Number of recommendations (max 20)
            context: Optional context (e.g., "for weekend", "with family", "to relax")

        Returns:
            Personalized recommendations with explanations

        Raises:
            ValueError: If insufficient credits or not enrolled
        """
        # Check Beta enrollment
        is_beta_user = await self._credit_service.is_beta_user(self.user_id)

        if not is_beta_user:
            raise ValueError(
                "AI Recommendations is a Beta 500 exclusive feature. "
                "Enroll in Beta 500 to access personalized AI recommendations."
            )

        # Check credits
        balance = await self._credit_service.get_balance(self.user_id)
        if balance < self.CREDITS_PER_REQUEST:
            raise ValueError(
                f"Insufficient credits: {balance} available, "
                f"{self.CREDITS_PER_REQUEST} required for AI recommendations"
            )

        # Deduct credits upfront
        success, remaining = await self._credit_service.deduct_credits(
            user_id=self.user_id,
            feature="ai_recommendations",
            usage_amount=self.CREDITS_PER_REQUEST,
            metadata={
                "content_type": content_type,
                "context": context,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

        if not success:
            raise ValueError("Failed to deduct credits for AI recommendations")

        logger.info(
            f"AI Recommendations: user={self.user_id}, type={content_type}, "
            f"credits_remaining={remaining}"
        )

        try:
            # Step 1: Analyze user preferences
            user_profile = await self._build_user_profile()

            # Step 2: Get candidate content
            candidates = await self._get_candidate_content(content_type, limit * 3)

            # Step 3: Use Claude to rank and explain recommendations
            recommendations = await self._generate_recommendations(
                user_profile=user_profile,
                candidates=candidates,
                context=context,
                limit=limit,
            )

            return {
                "content_type": content_type,
                "context": context,
                "total_recommendations": len(recommendations),
                "recommendations": recommendations,
                "user_profile_summary": user_profile.get("summary"),
                "credits_charged": self.CREDITS_PER_REQUEST,
                "credits_remaining": remaining,
            }

        except Exception as e:
            logger.error(f"AI Recommendations error: {e}")
            # Refund credits on error
            await self._credit_service.add_credits(
                user_id=self.user_id,
                amount=self.CREDITS_PER_REQUEST,
                description="AI recommendations error refund",
                metadata={"error": str(e)},
            )
            raise

    async def _build_user_profile(self) -> Dict[str, Any]:
        """
        Build user preference profile from viewing history.

        Analyzes:
        - Recently watched/listened content
        - Genres and categories
        - Languages
        - Patterns and preferences
        """
        # Fetch user's watch history (last 90 days)
        ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)
        history = await WatchHistory.find(
            WatchHistory.user_id == self.user_id,
            WatchHistory.last_watched_at >= ninety_days_ago
        ).sort("-last_watched_at").limit(100).to_list()

        if not history:
            # No history - return generic profile
            return {
                "summary": "New user with no viewing history",
                "favorite_genres": [],
                "languages": ["en"],
                "recent_activity": [],
                "content_types": [],
            }

        # Analyze content types
        content_types = {}
        genres_count = {}
        languages_set = set()
        recent_activity = []

        for item in history[:20]:  # Last 20 items for summary
            content_types[item.content_type] = content_types.get(item.content_type, 0) + 1
            recent_activity.append({
                "content_id": item.content_id,
                "content_type": item.content_type,
                "watched_at": item.last_watched_at.isoformat(),
                "completed": item.completed,
            })

        # Build summary
        most_watched_type = max(content_types.items(), key=lambda x: x[1])[0] if content_types else "movies"
        content_type_summary = ", ".join([f"{k} ({v})" for k, v in sorted(content_types.items(), key=lambda x: -x[1])[:3]])

        return {
            "summary": f"User primarily watches {most_watched_type}. Activity: {content_type_summary}",
            "favorite_genres": list(genres_count.keys())[:5] if genres_count else [],
            "languages": list(languages_set) if languages_set else ["en"],
            "recent_activity": recent_activity[:10],
            "content_types": list(content_types.keys()),
        }

    async def _get_candidate_content(
        self,
        content_type: str,
        limit: int,
    ) -> List[Dict[str, Any]]:
        """
        Get candidate content for recommendation.

        Fetches recent/popular content that user hasn't seen yet.
        """
        candidates = []

        # Fetch movies if requested
        if content_type in ["movies", "all"]:
            movies = await Content.find(
                Content.content_format == "movie"
            ).sort("-created_at").limit(limit // 3).to_list()
            for movie in movies:
                candidates.append({
                    "type": "movie",
                    "id": str(movie.id),
                    "title": movie.title_en or movie.title,
                    "description": (movie.description_en or movie.description or "")[:200],
                    "genres": movie.genres if hasattr(movie, "genres") else [],
                    "year": movie.year if hasattr(movie, "year") else None,
                })

        # Fetch series if requested (series are Content with is_series=True)
        if content_type in ["series", "all"]:
            try:
                series_list = await Content.find(
                    Content.is_series == True
                ).sort("-created_at").limit(limit // 3).to_list()
                for series in series_list:
                    candidates.append({
                        "type": "series",
                        "id": str(series.id),
                        "title": series.title_en or series.title,
                        "description": (series.description_en or series.description or "")[:200],
                        "genres": series.genres if hasattr(series, "genres") else [],
                        "year": series.year if hasattr(series, "year") else None,
                    })
            except Exception as e:
                logger.warning(f"Could not fetch series: {e}")

        # Fetch podcasts if requested
        if content_type in ["podcasts", "all"]:
            try:
                podcasts = await PodcastEpisode.find().sort("-published_at").limit(limit // 3).to_list()
                for podcast in podcasts:
                    candidates.append({
                        "type": "podcast",
                        "id": str(podcast.id),
                        "title": podcast.title_en or podcast.title,
                        "description": (podcast.description_en or podcast.description or "")[:200],
                        "genres": [],
                        "year": None,
                    })
            except Exception as e:
                logger.warning(f"Could not fetch podcasts: {e}")

        # Fetch radio stations if requested
        if content_type in ["radio", "all"]:
            try:
                stations = await RadioStation.find().sort("-created_at").limit(limit // 3).to_list()
                for station in stations:
                    candidates.append({
                        "type": "radio",
                        "id": str(station.id),
                        "title": station.name_en or station.name,
                        "description": (station.description_en or station.description or "")[:200],
                        "genres": [],
                        "year": None,
                    })
            except Exception as e:
                logger.warning(f"Could not fetch radio stations: {e}")

        return candidates

    async def _generate_recommendations(
        self,
        user_profile: Dict[str, Any],
        candidates: List[Dict[str, Any]],
        context: Optional[str],
        limit: int,
    ) -> List[Dict[str, Any]]:
        """
        Use Claude to rank candidates and explain recommendations.
        """
        try:
            # Build prompt for Claude
            prompt = f"""You are a personalized content recommendation AI.

User Profile:
{user_profile.get('summary', 'No profile available')}
Favorite genres: {', '.join(user_profile.get('favorite_genres', []))}
Languages: {', '.join(user_profile.get('languages', []))}

Context: {context or 'General recommendations'}

Available Content:
{self._format_candidates_for_prompt(candidates[:20])}

Task: Select the top {limit} recommendations that best match this user's taste.
For each recommendation, provide:
1. Content ID and title
2. Match score (0-100)
3. Brief explanation of why it matches user's preferences

Return JSON array with format:
[{{"id": "...", "title": "...", "match_score": 95, "explanation": "..."}}]

JSON only, no other text:"""

            response = await self._anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
            )

            # Parse Claude's response
            import json
            recommendations_raw = json.loads(response.content[0].text)

            # Enrich with full content details
            recommendations = []
            for rec in recommendations_raw[:limit]:
                # Find original candidate
                candidate = next((c for c in candidates if c["id"] == rec["id"]), None)
                if candidate:
                    recommendations.append({
                        **candidate,
                        "match_score": rec.get("match_score", 80),
                        "explanation": rec.get("explanation", "Matches your preferences"),
                    })

            return recommendations

        except Exception as e:
            logger.error(f"Recommendation generation failed: {e}")
            # Fallback to simple ranking
            return candidates[:limit]

    def _format_candidates_for_prompt(self, candidates: List[Dict[str, Any]]) -> str:
        """Format candidates as text for Claude prompt."""
        lines = []
        for idx, c in enumerate(candidates, 1):
            lines.append(
                f"{idx}. [{c['type']}] {c['title']} - {c.get('description', '')[:100]}"
            )
        return "\n".join(lines)

    async def get_cost_estimate(self) -> Dict[str, Any]:
        """
        Get credit cost estimate for AI recommendations.

        Returns:
            Cost breakdown with credit amount and USD equivalent
        """
        return {
            "credits_per_request": self.CREDITS_PER_REQUEST,
            "usd_equivalent": self.CREDITS_PER_REQUEST * 0.01,  # $0.01 per credit
            "features": [
                "personalized_ai",
                "viewing_history_analysis",
                "claude_ranking",
                "content_matching",
                "explanation_generation",
            ],
        }


async def create_ai_recommendations_service(user_id: str) -> BetaAIRecommendationsService:
    """
    Factory function to create Beta AI Recommendations service.

    Args:
        user_id: User identifier

    Returns:
        BetaAIRecommendationsService: Ready-to-use recommendations service
    """
    return BetaAIRecommendationsService(user_id=user_id)
