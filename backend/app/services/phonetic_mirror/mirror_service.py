"""Phonetic Mirror service for Hebrew pronunciation practice."""

from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.phonetic_mirror_attempt import (
    MirrorAttemptResponse, MirrorSource, PhoneticMirrorAttempt,
    PracticePhrase, PronunciationQuality,
)
from app.services.phonetic_mirror.mirror_helpers import (
    attempt_to_response, award_shekels, calculate_shekels,
    generate_corrected_audio, get_default_phrases, record_proficiency,
)
from app.services.phonetic_mirror.pronunciation_scorer import pronunciation_scorer

logger = get_logger(__name__)


class PhoneticMirrorService:
    """Orchestrates phonetic mirror pronunciation sessions."""

    async def process_mirror_attempt(
        self,
        user_id: str,
        profile_id: str,
        avatar_id: str,
        audio_data: bytes,
        target_phrase_he: str,
        target_transliteration: str,
        source: MirrorSource = MirrorSource.STANDALONE,
    ) -> MirrorAttemptResponse:
        """Process a pronunciation attempt: transcribe, score, correct."""
        from app.services.whisper_transcription_service import (
            WhisperTranscriptionService,
        )

        whisper_service = WhisperTranscriptionService()
        transcript = await whisper_service.transcribe_audio_chunk(
            audio_data, source_lang="he"
        )

        if not transcript:
            attempt = PhoneticMirrorAttempt(
                user_id=user_id,
                profile_id=profile_id,
                avatar_id=avatar_id,
                target_phrase_he=target_phrase_he,
                target_transliteration=target_transliteration,
                input_transcript="",
                pronunciation_score=0.0,
                quality=PronunciationQuality.NO_MATCH,
                source=source,
            )
            await attempt.insert()
            return attempt_to_response(attempt, corrected_url=None)

        result = pronunciation_scorer.score_pronunciation(
            transcript=transcript,
            target_phrase=target_phrase_he,
            detected_language="he",
        )

        corrected_gcs_path = await self._get_correction_if_needed(
            result.overall_score, avatar_id, target_phrase_he
        )

        await record_proficiency(
            user_id, profile_id, result.overall_score, target_phrase_he
        )

        shekels = calculate_shekels(result.quality)
        if shekels > 0:
            await award_shekels(user_id, profile_id, shekels, target_phrase_he)

        from app.services.gamification.level_service import level_service

        await level_service.award_xp(
            user_id=user_id,
            profile_id=profile_id,
            source="mirror",
            amount=settings.GAMIFICATION_XP_PER_MIRROR,
        )

        attempt = PhoneticMirrorAttempt(
            user_id=user_id,
            profile_id=profile_id,
            avatar_id=avatar_id,
            target_phrase_he=target_phrase_he,
            target_transliteration=target_transliteration,
            input_transcript=transcript,
            pronunciation_score=result.overall_score,
            quality=result.quality,
            phoneme_feedback=result.word_feedback,
            corrected_audio_gcs_path=corrected_gcs_path,
            source=source,
            shekels_earned=shekels,
            credits_charged=settings.CREDIT_RATE_PHONETIC_MIRROR,
        )
        await attempt.insert()

        logger.info(
            "Phonetic mirror attempt processed",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "avatar_id": avatar_id,
                "score": result.overall_score,
                "quality": result.quality.value,
                "shekels": shekels,
            },
        )

        return attempt_to_response(attempt, corrected_gcs_path)

    async def get_practice_phrases(
        self,
        user_id: str,
        profile_id: str,
        count: int = 5,
        difficulty: str = "medium",
    ) -> List[PracticePhrase]:
        """Get targeted practice phrases from child's vocabulary."""
        from app.models.child_proficiency import ChildProficiency

        prof = await ChildProficiency.find_one(
            ChildProficiency.user_id == user_id,
            ChildProficiency.profile_id == profile_id,
        )

        phrases: List[PracticePhrase] = []

        if prof and prof.vocabulary_learning:
            for word in prof.vocabulary_learning[:count]:
                phrases.append(
                    PracticePhrase(
                        phrase_he=word.word,
                        transliteration=word.transliteration,
                        translation=word.translation,
                        difficulty=difficulty,
                        category="vocabulary",
                        source_word=word.word,
                    )
                )

        if len(phrases) < count:
            defaults = get_default_phrases(difficulty, count - len(phrases))
            phrases.extend(defaults)

        return phrases[:count]

    async def get_attempt_history(
        self,
        user_id: str,
        profile_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> dict:
        """Get attempt history with average score."""
        attempts = (
            await PhoneticMirrorAttempt.find(
                PhoneticMirrorAttempt.user_id == user_id,
                PhoneticMirrorAttempt.profile_id == profile_id,
            )
            .sort(-PhoneticMirrorAttempt.created_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

        total = await PhoneticMirrorAttempt.find(
            PhoneticMirrorAttempt.user_id == user_id,
            PhoneticMirrorAttempt.profile_id == profile_id,
        ).count()

        scores = [a.pronunciation_score for a in attempts if a.pronunciation_score > 0]
        avg_score = sum(scores) / len(scores) if scores else 0.0

        return {
            "attempts": [attempt_to_response(a, a.corrected_audio_gcs_path) for a in attempts],
            "total": total,
            "average_score": round(avg_score, 3),
        }

    async def _get_correction_if_needed(
        self, score: float, avatar_id: str, target_phrase_he: str
    ) -> Optional[str]:
        """Generate corrected audio if score is below threshold."""
        if score >= settings.PERFECTED_VOICE_PRONUNCIATION_THRESHOLD:
            return None
        return await generate_corrected_audio(avatar_id, target_phrase_he)


phonetic_mirror_service = PhoneticMirrorService()
