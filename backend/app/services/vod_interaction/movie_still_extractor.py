"""
Movie Still Character Extractor

Extension of CharacterExtractorService that fetches TMDB tagged images
(movie-specific character stills) instead of generic actor profile photos.

This ensures character avatars show how the actor appeared in that specific
film, not their current or most recently uploaded profile photo.
"""

from typing import Dict, List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service
from app.models.content import Content
from app.models.vod_interaction import ContentCharacter
from app.services.vod_interaction.character_extractor import CharacterExtractorService

logger = get_logger(__name__)

_TMDB_API_BASE = "https://api.themoviedb.org/3"
_TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"


class MovieStillCharacterExtractorService(CharacterExtractorService):
    """
    Character extractor that prefers TMDB tagged images from the specific movie
    over generic actor profile photos for more authentic character visuals.
    """

    def __init__(self) -> None:
        super().__init__()
        self._current_movie_tmdb_id: Optional[int] = None

    async def extract_characters(self, content: Content) -> List[ContentCharacter]:
        self._current_movie_tmdb_id = content.tmdb_id
        try:
            return await super().extract_characters(content)
        finally:
            self._current_movie_tmdb_id = None

    async def _upload_profile_images(
        self,
        cast: List[Dict],
        content_id: str,
    ) -> Dict[int, str]:
        """Override: prefer TMDB tagged images from the specific movie."""
        if not self._current_movie_tmdb_id:
            return await super()._upload_profile_images(cast, content_id)
        return await self._upload_movie_still_images(
            cast, content_id, self._current_movie_tmdb_id
        )

    async def _upload_movie_still_images(
        self,
        cast: List[Dict],
        content_id: str,
        movie_tmdb_id: int,
    ) -> Dict[int, str]:
        """
        For each cast member, fetch their tagged images from the specific movie.
        Falls back to the generic profile_path when no movie-specific image exists.
        """
        urls: Dict[int, str] = {}
        for idx, member in enumerate(cast):
            person_id = member.get("id")
            profile_path = member.get("profile_path")
            image_path = await self._get_movie_specific_image(
                person_id, movie_tmdb_id, profile_path
            )
            if not image_path:
                logger.warning(
                    "No image available for cast member",
                    extra={"person_id": person_id, "cast_idx": idx},
                )
                continue
            image_url = f"{_TMDB_IMAGE_BASE}/w342{image_path}"
            try:
                resp = await self._http.get(image_url)
                if resp.status_code != 200:
                    logger.warning(
                        "TMDB image fetch failed",
                        extra={"status": resp.status_code, "cast_idx": idx},
                    )
                    continue
                gcs_path = f"movie-interactions/{content_id}/char_{idx}.jpg"
                gcs_url = await storage_service.upload_bytes(
                    resp.content, gcs_path, "image/jpeg"
                )
                urls[idx] = gcs_url
            except Exception:
                logger.exception(
                    "Failed to upload movie still image",
                    extra={"content_id": content_id, "cast_idx": idx},
                )
        return urls

    async def _get_movie_specific_image(
        self,
        person_id: Optional[int],
        movie_tmdb_id: int,
        fallback_profile_path: Optional[str],
    ) -> Optional[str]:
        """
        Fetch TMDB tagged images for the person and return the best image
        from this specific movie. Falls back to generic profile_path.
        """
        if not person_id:
            return fallback_profile_path

        params = {"api_key": settings.TMDB_API_KEY, "page": 1}
        try:
            resp = await self._http.get(
                f"{_TMDB_API_BASE}/person/{person_id}/tagged_images",
                params=params,
            )
            if resp.status_code != 200:
                logger.warning(
                    "TMDB tagged_images request failed",
                    extra={"person_id": person_id, "status": resp.status_code},
                )
                return fallback_profile_path

            data = resp.json()
            results = data.get("results", [])
            movie_images = [
                r
                for r in results
                if r.get("media_type") == "movie"
                and r.get("media", {}).get("id") == movie_tmdb_id
                and r.get("file_path")
            ]

            if movie_images:
                portrait_images = [
                    r for r in movie_images if r.get("aspect_ratio", 1.0) < 0.8
                ]
                chosen = portrait_images[0] if portrait_images else movie_images[0]
                logger.info(
                    "Using movie-specific tagged image",
                    extra={"person_id": person_id, "movie_tmdb_id": movie_tmdb_id},
                )
                return chosen["file_path"]

        except Exception:
            logger.exception(
                "Failed to fetch tagged images for person",
                extra={"person_id": person_id},
            )

        logger.info(
            "No movie-specific tagged image found, using profile photo",
            extra={"person_id": person_id},
        )
        return fallback_profile_path


movie_still_extractor_service = MovieStillCharacterExtractorService()
