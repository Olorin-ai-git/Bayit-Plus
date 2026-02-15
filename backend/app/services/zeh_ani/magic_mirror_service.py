"""
Magic Mirror Service.

Generates personalized daily Hebrew greetings rendered by the child's 3D
avatar. Combines proficiency-based vocabulary selection, TTS via the child's
cloned voice, and lip-sync blend shape data for animated 3D greeting playback.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.child_proficiency import ChildProficiency
from app.models.magic_mirror import MagicMirrorGreeting

if TYPE_CHECKING:
    from app.models.user import User
from app.services.zeh_ani.mirror_greeting_helpers import (
    build_greeting_text,
    generate_greeting_audio,
    generate_greeting_lipsync,
    select_vocabulary_of_the_day,
)

logger = get_logger(__name__)


class InsufficientCreditsError(Exception):
    """Raised when a user lacks credits for a Zeh Ani feature."""


class MagicMirrorService:
    """Generates and caches personalized daily Magic Mirror greetings."""

    async def generate_daily_greeting(
        self,
        user_id: str,
        profile_id: str,
        avatar_id: str,
        user: User | None = None,
    ) -> MagicMirrorGreeting:
        """
        Generate a fresh daily greeting for the child's 3D avatar.

        Pipeline: fetch proficiency -> select vocabulary -> build greeting
        text -> generate TTS audio -> generate lip-sync data -> store.

        Admin users bypass credit deduction.
        """
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar or avatar.user_id != user_id:
            raise ValueError("Avatar not found or does not belong to user")

        proficiency = await ChildProficiency.find_one(
            {"user_id": user_id, "profile_id": profile_id}
)

        vocab_word = select_vocabulary_of_the_day(proficiency)
        greeting_he, greeting_en = build_greeting_text(
            avatar.child_first_name, vocab_word,
        )

        audio_path = await generate_greeting_audio(avatar, greeting_he)
        lipsync_path = await generate_greeting_lipsync(avatar, audio_path)

        refresh_hours = settings.MAGIC_MIRROR_GREETING_REFRESH_HOURS
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=refresh_hours,
        )

        greeting = MagicMirrorGreeting(
            user_id=user_id,
            profile_id=profile_id,
            greeting_text_he=greeting_he,
            greeting_text_en=greeting_en,
            greeting_audio_gcs_path=audio_path,
            lipsync_data_gcs_path=lipsync_path,
            vocabulary_of_the_day=vocab_word,
            generated_at=datetime.now(timezone.utc),
            expires_at=expires_at,
        )
        await greeting.insert()

        from app.services.zeh_ani import deduct_zeh_ani_credits

        success, _remaining = await deduct_zeh_ani_credits(
            user_id=user_id,
            feature="magic_mirror",
            usage_amount=1.0,
            metadata={
                "profile_id": profile_id,
                "greeting_id": str(greeting.id),
            },
            user=user,
        )
        if not success:
            await greeting.delete()
            raise InsufficientCreditsError(
                "Insufficient credits for magic mirror greeting"
            )

        logger.info(
            "Magic Mirror greeting generated",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "vocabulary": vocab_word,
            },
        )

        return greeting

    async def get_or_generate_greeting(
        self,
        user_id: str,
        profile_id: str,
        avatar_id: str,
        user: User | None = None,
    ) -> MagicMirrorGreeting:
        """Return cached greeting if not expired, else generate a new one."""
        existing = await MagicMirrorGreeting.find_one(
            {"user_id": user_id, "profile_id": profile_id}
)

        if existing and not existing.is_expired:
            logger.info(
                "Returning cached Magic Mirror greeting",
                extra={
                    "user_id": user_id,
                    "profile_id": profile_id,
                    "expires_at": existing.expires_at.isoformat()
                    if existing.expires_at else "none",
                },
            )
            return existing

        return await self.generate_daily_greeting(
            user_id, profile_id, avatar_id, user=user,
        )


magic_mirror_service = MagicMirrorService()
