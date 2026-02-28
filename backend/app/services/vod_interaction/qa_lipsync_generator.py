"""
Q&A Lipsync Generator

Generates question/answer lipsync video pairs for a movie content item:
- Kid avatar asks questions using their voice + Aurora lipsync
- Movie characters answer with cloned voice + real photo via Aurora lipsync

Each pair consists of:
  1. Kid video: kid_image_url + kid_voice TTS -> fal.ai Aurora MP4
  2. Character video: char.frame_url + char.voice_id TTS -> fal.ai Aurora MP4
"""

import asyncio
import json
from dataclasses import dataclass
from typing import Dict, List, Optional

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.vod_interaction import ContentCharacter
from app.services.vod_interaction.character_animator import (
    character_animator_service,
)

logger = get_logger(__name__)

_QA_SYSTEM_PROMPT = (
    "You are a creative writer for a Jewish family streaming platform (Bayit+). "
    "Generate Q&A pairs where a child avatar asks movie characters questions.\n\n"
    "Rules:\n"
    "- Questions are from a curious kid's perspective, age 6-12\n"
    "- Answers are in character, authentic to the movie personality\n"
    "- Keep each answer under 25 words (short video clips)\n"
    "- Questions should be fun, relatable, and educational\n"
    "- Answers should be warm, encouraging, and memorable\n"
    "- The 'character' field must exactly match one of the provided character names\n"
    'Output ONLY strict JSON: {"pairs": [{"question": "...", "character": "...", "answer": "..."}]}'
)


@dataclass
class QAPair:
    question: str
    character_name: str
    answer: str


@dataclass
class QAVideoResult:
    pair: QAPair
    kid_video_url: Optional[str] = None
    character_video_url: Optional[str] = None
    kid_audio_url: Optional[str] = None
    character_audio_url: Optional[str] = None
    error: Optional[str] = None

    @property
    def success(self) -> bool:
        return self.kid_video_url is not None and self.character_video_url is not None


class QALipsyncGeneratorService:
    """Generates Q&A lipsync video pairs for movie character interactions."""

    async def generate_qa_pairs(
        self,
        movie_title: str,
        characters: List[ContentCharacter],
        count: int = 10,
    ) -> List[QAPair]:
        """Generate Q&A pairs via Claude AI."""
        char_list = "\n".join(
            f"- {c.name}: {c.description or 'main character'}"
            for c in characters
        )
        prompt = (
            f"Movie: {movie_title}\n"
            f"Available characters:\n{char_list}\n\n"
            f"Generate exactly {count} Q&A pairs. "
            "Alternate questions between characters. Keep answers under 25 words."
        )
        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.MOVIE_INTERACTION_AI_MODEL,
            system=_QA_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
        )
        raw = response.content[0].text.strip()
        # Strip markdown code fences if present (```json ... ```)
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        data = json.loads(raw)
        return [
            QAPair(
                question=p["question"],
                character_name=p["character"],
                answer=p["answer"],
            )
            for p in data["pairs"][:count]
        ]

    async def animate_pair(
        self,
        pair: QAPair,
        character: ContentCharacter,
        kid_image_url: str,
        kid_voice_id: str,
        kid_name: str = "Kid",
    ) -> QAVideoResult:
        """Animate one Q&A pair: kid question + character answer via Aurora."""
        result = QAVideoResult(pair=pair)
        try:
            kid_response = await character_animator_service.animate_character_response(
                character_name=kid_name,
                dialogue_text=pair.question,
                character_frame_url=kid_image_url,
                voice_id=kid_voice_id,
            )
            result.kid_audio_url = kid_response.audio_url
            result.kid_video_url = kid_response.video_url

            char_response = await character_animator_service.animate_character_response(
                character_name=character.name,
                dialogue_text=pair.answer,
                character_frame_url=character.frame_url,
                voice_id=character.voice_id,
            )
            result.character_audio_url = char_response.audio_url
            result.character_video_url = char_response.video_url
        except Exception as exc:
            logger.exception(
                "Failed to animate Q&A pair",
                extra={
                    "character": pair.character_name,
                    "question": pair.question[:50],
                    "error": str(exc),
                },
            )
            result.error = str(exc)
        return result

    async def run_all(
        self,
        content: Content,
        kid_image_url: str,
        kid_voice_id: str,
        character_names: Optional[List[str]] = None,
        count: int = 10,
        concurrency: int = 2,
    ) -> List[QAVideoResult]:
        """Generate all Q&A lipsync pairs for a content item."""
        characters = [
            c for c in content.interactive_characters
            if c.voice_id and c.frame_url
            and (not character_names or c.name in character_names)
        ]
        if not characters:
            logger.warning(
                "No characters with voice+frame available",
                extra={"content_id": str(content.id)},
            )
            return []

        pairs = await self.generate_qa_pairs(
            movie_title=content.title or str(content.id),
            characters=characters,
            count=count,
        )
        logger.info(
            "Generated Q&A pairs",
            extra={"content_id": str(content.id), "count": len(pairs)},
        )

        char_map: Dict[str, ContentCharacter] = {c.name: c for c in characters}
        sem = asyncio.Semaphore(concurrency)

        async def _animate_with_sem(pair: QAPair) -> QAVideoResult:
            async with sem:
                char = char_map.get(pair.character_name)
                if not char:
                    return QAVideoResult(
                        pair=pair,
                        error=f"Character {pair.character_name!r} not in available set",
                    )
                return await self.animate_pair(pair, char, kid_image_url, kid_voice_id)

        return list(await asyncio.gather(*[_animate_with_sem(p) for p in pairs]))


qa_lipsync_generator_service = QALipsyncGeneratorService()
