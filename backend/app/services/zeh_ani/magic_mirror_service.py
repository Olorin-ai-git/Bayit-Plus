"""
Magic Mirror Service.

Generates personalized daily Hebrew greetings rendered by the child's 3D
avatar. Combines proficiency-based vocabulary selection, TTS via the child's
cloned voice, and lip-sync blend shape data for animated 3D greeting playback.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.child_proficiency import ChildProficiency
from app.models.magic_mirror import MagicMirrorGreeting

logger = get_logger(__name__)


class MagicMirrorService:
    """Generates and caches personalized daily Magic Mirror greetings."""

    async def generate_daily_greeting(
        self,
        user_id: str,
        profile_id: str,
        avatar_id: str,
    ) -> MagicMirrorGreeting:
        """
        Generate a fresh daily greeting for the child's 3D avatar.

        Pipeline: fetch proficiency -> select vocabulary -> build greeting
        text -> generate TTS audio -> generate lip-sync data -> store.
        """
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar or avatar.user_id != user_id:
            raise ValueError("Avatar not found or does not belong to user")

        proficiency = await ChildProficiency.find_one(
            ChildProficiency.user_id == user_id,
            ChildProficiency.profile_id == profile_id,
        )

        vocab_word = self._select_vocabulary_of_the_day(proficiency)
        greeting_he, greeting_en = self._build_greeting_text(
            avatar.child_first_name, vocab_word,
        )

        audio_path = await self._generate_greeting_audio(
            avatar, greeting_he,
        )

        lipsync_path = await self._generate_greeting_lipsync(
            avatar, audio_path,
        )

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

        await deduct_zeh_ani_credits(
            user_id=user_id,
            feature="magic_mirror",
            usage_amount=1.0,
            metadata={
                "profile_id": profile_id,
                "greeting_id": str(greeting.id),
            },
        )

        logger.info(
            "Magic Mirror greeting generated",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "vocabulary": vocab_word,
                "credits_charged": settings.CREDIT_RATE_MAGIC_MIRROR,
            },
        )

        return greeting

    async def get_or_generate_greeting(
        self,
        user_id: str,
        profile_id: str,
        avatar_id: str,
    ) -> MagicMirrorGreeting:
        """Return cached greeting if not expired, else generate a new one."""
        existing = await MagicMirrorGreeting.find_one(
            MagicMirrorGreeting.user_id == user_id,
            MagicMirrorGreeting.profile_id == profile_id,
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
            user_id, profile_id, avatar_id,
        )

    def _select_vocabulary_of_the_day(
        self,
        proficiency: Optional[ChildProficiency],
    ) -> str:
        """Pick a vocabulary word based on the child's learning progress."""
        if not proficiency or not proficiency.vocabulary_learning:
            return ""

        learning_words = proficiency.vocabulary_learning
        candidates = [
            w for w in learning_words if w.mastery < 0.8
        ]
        if not candidates:
            candidates = learning_words

        candidates.sort(key=lambda w: w.mastery)
        selected = candidates[0]

        transliteration = (
            f" ({selected.transliteration})"
            if selected.transliteration else ""
        )
        return f"{selected.word}{transliteration}"

    def _build_greeting_text(
        self,
        child_name: str,
        vocab_word: str,
    ) -> tuple:
        """Build bilingual greeting text incorporating vocabulary."""
        vocab_segment_he = ""
        vocab_segment_en = ""
        if vocab_word:
            clean_word = vocab_word.split(" (")[0]
            vocab_segment_he = f" {clean_word}"
            vocab_segment_en = f" Your word of the day is: {vocab_word}."

        greeting_he = f"{child_name},{vocab_segment_he}"
        greeting_en = (
            f"Good morning, {child_name}!{vocab_segment_en}"
        )
        return greeting_he, greeting_en

    async def _generate_greeting_audio(
        self,
        avatar: ChildAvatar,
        greeting_text_he: str,
    ) -> Optional[str]:
        """Generate TTS audio using child's cloned voice if available."""
        from app.services.interactive_mission.child_voice_service import (
            child_voice_service,
        )

        return await child_voice_service.generate_corrected_hebrew(
            avatar=avatar,
            hebrew_text=greeting_text_he,
        )

    async def _generate_greeting_lipsync(
        self,
        avatar: ChildAvatar,
        audio_path: Optional[str],
    ) -> Optional[str]:
        """Generate lip-sync blend shape data for the greeting audio."""
        if not audio_path or not avatar.has_3d_mesh:
            return None

        from app.services.zeh_ani.synclabs_lipsync_service import (
            synclabs_lipsync_service,
        )
        from app.services.olorin.storage_service import storage_service

        mesh_signed_url = await storage_service.generate_signed_url(
            f"zeh-ani/meshes/{avatar.id}/avatar.glb",
            expiry_seconds=3600,
        )

        lipsync_data = (
            await synclabs_lipsync_service.generate_realtime_lipsync(
                mesh_glb_url=mesh_signed_url,
                audio_gcs_path=audio_path,
            )
        )

        import json as json_lib

        output_path = (
            f"zeh-ani/mirror/{avatar.user_id}/{avatar.profile_id}/"
            f"greeting_lipsync.json"
        )
        lipsync_bytes = json_lib.dumps(lipsync_data).encode("utf-8")
        await storage_service.upload_bytes(
            lipsync_bytes, output_path,
            content_type="application/json",
        )

        return output_path


magic_mirror_service = MagicMirrorService()
