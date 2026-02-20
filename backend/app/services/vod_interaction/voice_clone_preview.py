"""
Voice Clone Preview Service

Generates short lip-synced preview clips for cloned characters to verify
voice+face combinations before production use. Uses Claude to generate
an in-character sample greeting, then pipes it through the character
animator pipeline (TTS + ElevenLabs lip-sync).
"""

from typing import Dict, List, Optional

from bson import ObjectId
from pydantic import BaseModel, Field

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import Content
from app.services.vod_interaction.character_animator import (
    character_animator_service,
)

logger = get_logger(__name__)


class PreviewResult(BaseModel):
    """Result of generating a lip-sync preview for one character."""
    character_name: str
    status: str = Field(..., description="success, skipped, failed")
    preview_url: Optional[str] = None
    sample_line: Optional[str] = None
    error: Optional[str] = None


async def _generate_sample_line(
    character_name: str,
    movie_context: str,
    description: str,
) -> str:
    """Generate a short in-character greeting via Claude."""
    client = get_anthropic_client()
    response = await client.messages.create(
        model=settings.VOD_INTERACTION_AI_MODEL,
        system=(
            f"You are {character_name}. "
            f"Context: {movie_context}. "
            f"Personality: {description}. "
            "Generate exactly ONE short spoken greeting (under 15 words) "
            "in character. Output ONLY the dialogue line, nothing else."
        ),
        messages=[{"role": "user", "content": "Say hello to a new friend."}],
        max_tokens=settings.VOD_INTERACTION_AI_MAX_TOKENS,
    )
    return response.content[0].text.strip().strip('"')


class VoiceClonePreviewService:
    """Generates lip-synced preview clips for cloned characters."""

    async def generate_preview(
        self,
        content: Content,
        character_names: Optional[List[str]] = None,
    ) -> Dict[str, PreviewResult]:
        """
        Generate preview clips for cloned characters on a content item.

        Args:
            content: Content document with interactive_characters
            character_names: Generate only for these characters (all if None)

        Returns:
            Dict mapping character name to PreviewResult
        """
        results: Dict[str, PreviewResult] = {}

        for char in content.interactive_characters:
            if character_names and char.name not in character_names:
                continue

            if char.voice_clone_status != "cloned":
                results[char.name] = PreviewResult(
                    character_name=char.name,
                    status="skipped",
                    error="Voice not cloned",
                )
                continue

            results[char.name] = await self._generate_single(
                content, char.name,
            )

        return results

    async def _generate_single(
        self,
        content: Content,
        character_name: str,
    ) -> PreviewResult:
        """Generate a single character preview clip."""
        char = next(
            (c for c in content.interactive_characters if c.name == character_name),
            None,
        )
        if not char:
            return PreviewResult(
                character_name=character_name,
                status="failed",
                error="Character not found on content",
            )

        try:
            sample_line = await _generate_sample_line(
                char.name, char.movie_context, char.description,
            )
            logger.info(
                "Generated sample dialogue for preview",
                extra={
                    "character": char.name,
                    "line": sample_line,
                },
            )

            animated = await character_animator_service.animate_character_response(
                character_name=char.name,
                dialogue_text=sample_line,
                character_frame_url=char.frame_url,
                voice_id=char.voice_id,
            )

            char.voice_clone_preview_url = animated.video_url
            await content.save()  # type: ignore[union-attr]

            logger.info(
                "Voice clone preview generated",
                extra={
                    "character": char.name,
                    "content_id": str(content.id),
                    "preview_url": animated.video_url,
                },
            )

            return PreviewResult(
                character_name=char.name,
                status="success",
                preview_url=animated.video_url,
                sample_line=sample_line,
            )

        except Exception as exc:
            logger.error(
                "Failed to generate voice clone preview",
                extra={
                    "character": char.name,
                    "content_id": str(content.id),
                    "error": str(exc),
                },
            )
            return PreviewResult(
                character_name=char.name,
                status="failed",
                error=str(exc),
            )


voice_clone_preview_service = VoiceClonePreviewService()
