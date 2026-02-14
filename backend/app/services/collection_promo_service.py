"""
Collection Promo Service
Generates AI-powered promotional text for movie collections
"""

from typing import List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.ai_text_transform_service import AITextTransformService

logger = get_logger(__name__)


class CollectionPromoService(AITextTransformService[str]):
    """
    Service for generating promotional text for movie collections using AI.
    Extends AITextTransformService for caching and batch support.
    """

    def __init__(self):
        super().__init__(
            cache_max_size=100,
            service_name="CollectionPromo",
            supports_batch=False,  # Generate one collection at a time
        )

    async def _transform_single(self, text: str) -> str:
        """Not used - we use custom generate_promo method"""
        return text

    def _create_batch_prompt(self, texts: List[str]) -> str:
        """Not used - batch not supported"""
        return ""

    def _parse_batch_response(
        self, response_text: str, original_texts: List[str]
    ) -> List[str]:
        """Not used - batch not supported"""
        return original_texts

    async def generate_promo(
        self,
        collection_name: str,
        movie_titles: List[str],
        genres: List[str],
        language: str = "he",
        use_cache: bool = True,
    ) -> str:
        """
        Generate promotional text for a movie collection.

        Args:
            collection_name: Name of the collection
            movie_titles: List of movie titles in collection
            genres: List of genres
            language: Target language code
            use_cache: Whether to use caching

        Returns:
            Generated promotional text
        """
        # Create cache key from inputs
        cache_input = (
            f"{collection_name}|{','.join(movie_titles)}|"
            f"{','.join(genres)}|{language}"
        )
        cache_key = self._get_cache_key(cache_input)

        # Check cache
        if use_cache:
            cached = self._get_from_cache(cache_key)
            if cached:
                logger.info(f"Cache hit for collection: {collection_name}")
                return cached

        # Generate promo text
        language_names = {
            "he": "Hebrew",
            "en": "English",
            "es": "Spanish",
            "fr": "French",
            "it": "Italian",
            "hi": "Hindi",
            "ta": "Tamil",
            "bn": "Bengali",
            "ja": "Japanese",
            "zh": "Chinese",
        }

        language_name = language_names.get(language, "English")
        movies_list = "\n".join([f"- {title}" for title in movie_titles])
        genres_list = ", ".join(genres) if genres else "various"

        prompt = f"""You are a movie marketing expert. Create a short, exciting promotional text (2-3 sentences) for this movie collection. Make it tempting and engaging for viewers.

Collection: {collection_name}
Movies:
{movies_list}

Genres: {genres_list}
Target Language: {language_name}

Generate promotional text in {language_name} that makes viewers excited to watch all movies in sequence. Focus on the epic journey, character arcs, or thematic continuity across the collection. Keep it brief but compelling."""

        try:
            client = get_anthropic_client()
            response = await client.messages.create(
                model=settings.SUBTITLE_AI_MODEL,
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )

            promo_text = response.content[0].text.strip()

            # Cache result
            if use_cache:
                self._add_to_cache(cache_key, promo_text)

            logger.info(
                f"Generated promo for collection: {collection_name} "
                f"(language: {language})"
            )

            return promo_text

        except Exception as e:
            logger.error(
                f"Failed to generate promo for collection: {collection_name}",
                extra={"error": str(e)},
            )
            # Fallback to simple description
            return (
                f"{collection_name} - A complete movie collection "
                f"with {len(movie_titles)} films."
            )


# Singleton instance
collection_promo_service = CollectionPromoService()
