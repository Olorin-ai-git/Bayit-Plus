"""Voice-to-Voice Transform Service -- V2V pronunciation correction pipeline."""

import time
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.v2v_session import V2VSession, V2VSessionStatus, V2VTransformRecord
from app.services.zeh_ani.v2v_scoring import (
    apply_v2v,
    generate_perfect_tts,
    score_pronunciation,
    upload_v2v_audio,
)

logger = get_logger(__name__)


class V2VTransformService:
    """Orchestrates voice-to-voice pronunciation correction pipeline."""

    async def transform_voice(
        self,
        avatar: ChildAvatar,
        audio_data: bytes,
        target_phrase_he: str,
        session: Optional[V2VSession] = None,
    ) -> dict:
        """Full V2V pipeline: transcribe -> TTS -> V2V -> score."""
        start_ms = int(time.time() * 1000)

        from app.services.zeh_ani.enhanced_asr_service import enhanced_asr_service

        transcription = await enhanced_asr_service.transcribe_child_speech(
            audio_data=audio_data,
            language_hints=settings.WHISPER_LANGUAGE_HINTS.split(","),
        )
        input_transcript = transcription.get("text", "")

        score_before = await score_pronunciation(
            input_transcript, target_phrase_he,
        )

        perfect_audio = await generate_perfect_tts(target_phrase_he)

        v2v_audio: Optional[bytes] = None
        if avatar.has_voice_clone and avatar.elevenlabs_voice_id:
            v2v_audio = await apply_v2v(
                perfect_audio, avatar.elevenlabs_voice_id,
            )

        output_audio = v2v_audio if v2v_audio else perfect_audio

        from app.models.biometric_consent import BiometricConsent, BiometricConsentType

        consent = await BiometricConsent.find_one(
            BiometricConsent.user_id == avatar.user_id,
            BiometricConsent.profile_id == avatar.profile_id,
            BiometricConsent.consent_type == BiometricConsentType.VOICE_V2V,
            BiometricConsent.revoked_at == None,  # noqa: E711
        )
        upload_raw = not (consent and consent.on_device_only)

        input_path, tts_path, v2v_path = await upload_v2v_audio(
            avatar_id=str(avatar.id),
            audio_data=audio_data,
            perfect_audio=perfect_audio,
            v2v_audio=v2v_audio,
            upload_raw=upload_raw,
        )

        if v2v_audio:
            v2v_transcription = await enhanced_asr_service.transcribe_child_speech(
                audio_data=output_audio,
                language_hints=settings.WHISPER_LANGUAGE_HINTS.split(","),
            )
            v2v_transcript = v2v_transcription.get("text", "")
            score_after = await score_pronunciation(
                v2v_transcript, target_phrase_he,
            )
        else:
            score_after = score_before

        latency_ms = int(time.time() * 1000) - start_ms

        record = V2VTransformRecord(
            input_transcript=input_transcript,
            corrected_transcript=target_phrase_he,
            input_audio_gcs_path=input_path,
            tts_audio_gcs_path=tts_path,
            v2v_audio_gcs_path=v2v_path if v2v_audio else None,
            latency_ms=latency_ms,
            pronunciation_score_before=score_before,
            pronunciation_score_after=score_after,
            target_phrase_he=target_phrase_he,
        )

        if session:
            session.add_transform(record)
            session.credits_charged += settings.CREDIT_RATE_V2V_TRANSFORM
            await session.save()

            from app.services.zeh_ani import deduct_zeh_ani_credits

            success, _remaining = await deduct_zeh_ani_credits(
                user_id=avatar.user_id,
                feature="v2v_transform",
                usage_amount=1.0,
                metadata={
                    "session_id": str(session.id),
                    "avatar_id": str(avatar.id),
                },
            )
            if not success:
                logger.warning(
                    "Insufficient credits for V2V transform",
                    extra={
                        "user_id": avatar.user_id,
                        "session_id": str(session.id),
                    },
                )
                return {
                    "error": "insufficient_credits",
                    "input_transcript": input_transcript,
                }

        from app.services.gamification.level_service import level_service

        await level_service.award_xp(
            user_id=avatar.user_id,
            profile_id=avatar.profile_id,
            source="v2v",
            amount=settings.GAMIFICATION_XP_PER_MIRROR,
        )

        logger.info(
            "V2V transform complete",
            extra={
                "avatar_id": str(avatar.id),
                "latency_ms": latency_ms,
                "score_before": score_before,
                "score_after": score_after,
            },
        )

        from app.services.olorin.storage_service import storage_service

        audio_gcs_path = v2v_path if v2v_audio else tts_path
        audio_signed_url = await storage_service.generate_signed_url(
            audio_gcs_path,
            expiry_seconds=settings.MESH_SIGNED_URL_EXPIRY_SECONDS,
        )

        return {
            "input_transcript": input_transcript,
            "corrected_transcript": target_phrase_he,
            "v2v_audio_url": audio_signed_url,
            "latency_ms": latency_ms,
            "score_before": round(score_before, 3),
            "score_after": round(score_after, 3),
            "score_delta": round(score_after - score_before, 3),
        }

    async def get_or_create_session(
        self, user_id: str, profile_id: str, avatar_id: str,
    ) -> V2VSession:
        """Get active session or create new one."""
        session = await V2VSession.find_one(
            V2VSession.user_id == user_id,
            V2VSession.profile_id == profile_id,
            V2VSession.avatar_id == avatar_id,
            V2VSession.status == V2VSessionStatus.ACTIVE,
        )
        if session:
            return session

        session = V2VSession(
            user_id=user_id,
            profile_id=profile_id,
            avatar_id=avatar_id,
        )
        await session.insert()
        return session

    async def complete_session(self, session: V2VSession) -> V2VSession:
        """Mark a V2V session as completed."""
        session.status = V2VSessionStatus.COMPLETED
        session.updated_at = datetime.now(timezone.utc)
        await session.save()
        return session


v2v_transform_service = V2VTransformService()
