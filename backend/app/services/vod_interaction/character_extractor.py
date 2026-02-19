"""
Character Extractor Service

Pipeline for extracting character profiles from TMDB cast data.
When a user tags a movie:
1. Fetch TMDB credits (cast, character names, profile images, gender)
2. Download profile images and upload to GCS
3. Use Claude AI to generate descriptions and suggested questions
4. Update Content document with interactive_characters
"""

import json
from typing import Dict, List, Optional

import httpx

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service
from app.models.content import Content
from app.models.vod_interaction import ContentCharacter
from app.services.tmdb_service import TMDBService

logger = get_logger(__name__)

TMDB_GENDER_MAP = {1: "female", 2: "male"}


class CharacterExtractorService:
    """Extracts character profiles from TMDB and enriches with AI."""

    def __init__(self) -> None:
        self._tmdb = TMDBService()
        self._http = httpx.AsyncClient(timeout=30.0)

    async def extract_characters(
        self, content: Content
    ) -> List[ContentCharacter]:
        """
        Full extraction pipeline for a content item.

        Returns list of ContentCharacter ready to store on Content doc.
        """
        if not content.tmdb_id:
            logger.warning(
                "Content has no tmdb_id, skipping extraction",
                extra={"content_id": str(content.id)},
            )
            return []

        details = await self._tmdb.get_movie_details(content.tmdb_id)
        if not details:
            logger.error(
                "TMDB details unavailable",
                extra={"tmdb_id": content.tmdb_id},
            )
            return []

        credits = details.get("credits", {})
        cast_list = credits.get("cast", [])
        max_chars = settings.MOVIE_INTERACTION_MAX_CHARACTERS
        top_cast = cast_list[:max_chars]

        if not top_cast:
            logger.info(
                "No cast found for content",
                extra={"content_id": str(content.id)},
            )
            return []

        frame_urls = await self._upload_profile_images(
            top_cast, str(content.id)
        )

        ai_profiles = await self._generate_ai_profiles(
            top_cast, content.title or details.get("title", "")
        )

        characters: List[ContentCharacter] = []
        for idx, member in enumerate(top_cast):
            char_name = member.get("character", "")
            actor_name = member.get("name", "")
            gender_code = member.get("gender", 0)
            gender = TMDB_GENDER_MAP.get(gender_code)
            ai_data = ai_profiles.get(char_name, {})

            voice_id = self._resolve_voice_id(gender)
            frame_url = frame_urls.get(idx, "")

            characters.append(ContentCharacter(
                name=char_name,
                voice_id=voice_id,
                frame_url=frame_url,
                description=ai_data.get("description", ""),
                movie_context=ai_data.get("movie_context", ""),
                actor_name=actor_name,
                gender=gender,
                suggested_questions=ai_data.get(
                    "suggested_questions", []
                ),
            ))

        return characters

    async def _upload_profile_images(
        self,
        cast: List[Dict],
        content_id: str,
    ) -> Dict[int, str]:
        """Download TMDB profile images and upload to GCS."""
        urls: Dict[int, str] = {}
        for idx, member in enumerate(cast):
            profile_path = member.get("profile_path")
            if not profile_path:
                continue
            tmdb_url = self._tmdb.get_image_url(profile_path, "w342")
            try:
                resp = await self._http.get(tmdb_url)
                if resp.status_code != 200:
                    continue
                gcs_path = (
                    f"movie-interactions/{content_id}"
                    f"/char_{idx}.jpg"
                )
                gcs_url = await storage_service.upload_bytes(
                    resp.content, gcs_path, "image/jpeg"
                )
                urls[idx] = gcs_url
            except Exception:
                logger.exception(
                    "Failed to upload profile image",
                    extra={
                        "content_id": content_id,
                        "cast_idx": idx,
                    },
                )
        return urls

    async def _generate_ai_profiles(
        self,
        cast: List[Dict],
        movie_title: str,
    ) -> Dict[str, Dict]:
        """
        Single Claude call to generate descriptions and questions
        for all characters.
        """
        char_names = [
            f"{m.get('character', '')} (played by {m.get('name', '')})"
            for m in cast
        ]
        questions_per = settings.MOVIE_INTERACTION_QUESTIONS_PER_CHARACTER

        prompt = (
            f"Movie: {movie_title}\n"
            f"Characters:\n"
            + "\n".join(f"- {n}" for n in char_names)
            + "\n\n"
            f"For each character, return a JSON object keyed by "
            f"character name (role name only, not actor). Each value "
            f"should have:\n"
            f'- "description": 2-3 sentence personality description\n'
            f'- "movie_context": 1-2 sentence role in the movie\n'
            f'- "suggested_questions": array of {questions_per} '
            f"interesting questions a viewer might ask this character\n\n"
            f"Return ONLY valid JSON, no markdown fences."
        )

        try:
            client = get_anthropic_client()
            response = await client.messages.create(
                model=settings.MOVIE_INTERACTION_AI_MODEL,
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text.strip()
            return json.loads(text)
        except json.JSONDecodeError:
            logger.error(
                "AI returned invalid JSON for character profiles",
                extra={"movie": movie_title},
            )
            return {}
        except Exception:
            logger.exception(
                "AI character profile generation failed",
                extra={"movie": movie_title},
            )
            return {}

    @staticmethod
    def _resolve_voice_id(gender: Optional[str]) -> str:
        """Pick voice ID based on character gender."""
        if gender == "female":
            return settings.MOVIE_INTERACTION_DEFAULT_VOICE_FEMALE
        return settings.MOVIE_INTERACTION_DEFAULT_VOICE_MALE


character_extractor_service = CharacterExtractorService()
