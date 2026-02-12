"""
Voice-to-Voice Transform Service.

Orchestrates the V2V pronunciation correction pipeline:
1. Whisper transcribe child speech (with code-switch detection)
2. ElevenLabs TTS generates "perfect Hebrew" audio
3. ElevenLabs V2V skins TTS audio with child's voice frequency
4. Score pronunciation before/after via pronunciation_scorer
5. Return corrected audio + score delta
"""

import time
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.v2v_session import V2VSession, V2VSessionStatus, V2VTransformRecord

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

        from app.services.phonetic_mirror.pronunciation_scorer import (
            pronunciation_scorer,
        )

        score_before_result = pronunciation_scorer.score_pronunciation(
            transcript=input_transcript,
            target_phrase=target_phrase_he,
            detected_language="he",
        )
        score_before = score_before_result.overall_score

        perfect_audio = await self._generate_perfect_tts(target_phrase_he)

        v2v_audio: Optional[bytes] = None
        if avatar.has_voice_clone and avatar.elevenlabs_voice_id:
            v2v_audio = await self._apply_v2v(
                perfect_audio, avatar.elevenlabs_voice_id,
            )

        output_audio = v2v_audio if v2v_audio else perfect_audio

        from app.services.olorin.storage_service import storage_service

        from app.models.biometric_consent import BiometricConsent, BiometricConsentType

        consent = await BiometricConsent.find_one(
            BiometricConsent.user_id == avatar.user_id,
            BiometricConsent.profile_id == avatar.profile_id,
            BiometricConsent.consent_type == BiometricConsentType.VOICE_V2V,
            BiometricConsent.revoked_at == None,  # noqa: E711
        )
        upload_raw = not (consent and consent.on_device_only)

        timestamp = int(time.time())
        input_path = f"zeh-ani/v2v/{avatar.id}/{timestamp}_input.wav"
        tts_path = f"zeh-ani/v2v/{avatar.id}/{timestamp}_tts.wav"
        v2v_path = f"zeh-ani/v2v/{avatar.id}/{timestamp}_v2v.wav"

        if upload_raw:
            await storage_service.upload_bytes(
                audio_data, input_path, content_type="audio/wav",
            )
        await storage_service.upload_bytes(
            perfect_audio, tts_path, content_type="audio/wav",
        )
        if v2v_audio:
            await storage_service.upload_bytes(
                v2v_audio, v2v_path, content_type="audio/wav",
            )

        if v2v_audio:
            v2v_transcription = await enhanced_asr_service.transcribe_child_speech(
                audio_data=output_audio,
                language_hints=settings.WHISPER_LANGUAGE_HINTS.split(","),
            )
            v2v_transcript = v2v_transcription.get("text", "")
            score_after_result = pronunciation_scorer.score_pronunciation(
                transcript=v2v_transcript,
                target_phrase=target_phrase_he,
                detected_language="he",
            )
            score_after = score_after_result.overall_score
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

        return {
            "input_transcript": input_transcript,
            "corrected_transcript": target_phrase_he,
            "v2v_audio_gcs_path": v2v_path if v2v_audio else tts_path,
            "latency_ms": latency_ms,
            "score_before": round(score_before, 3),
            "score_after": round(score_after, 3),
            "score_delta": round(score_after - score_before, 3),
        }

    async def _generate_perfect_tts(self, text_he: str) -> bytes:
        """Generate perfect Hebrew pronunciation via ElevenLabs TTS."""
        from app.services.phonetic_mirror.mirror_helpers import (
            generate_corrected_audio,
        )

        from app.services.olorin.storage_service import storage_service

        gcs_path = await generate_corrected_audio(
            avatar_id="system_tts", target_phrase=text_he,
        )
        if gcs_path:
            return await storage_service.download_bytes(gcs_path)
        raise ValueError("Failed to generate TTS for target phrase")

    async def _apply_v2v(
        self, perfect_audio: bytes, voice_id: str,
    ) -> bytes:
        """Apply ElevenLabs V2V to skin TTS with child's voice."""
        timeout = settings.ELEVENLABS_V2V_TIMEOUT
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{settings.ELEVENLABS_API_URL}/v1/speech-to-speech/{voice_id}",
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                },
                files={"audio": ("tts.wav", perfect_audio, "audio/wav")},
                data={
                    "model_id": settings.ELEVENLABS_V2V_MODEL,
                    "voice_settings": (
                        f'{{"similarity_boost":{settings.ELEVENLABS_V2V_SIMILARITY_BOOST},'
                        f'"stability":0.5}}'
                    ),
                },
            )
            response.raise_for_status()
            return response.content

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
