"""Phonetic Mirror service for Hebrew pronunciation practice."""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings
from app.models.child_avatar import ChildAvatar
from app.models.child_proficiency import ProficiencyLevel
from app.models.phonetic_mirror_attempt import (
    MirrorAttemptResponse,
    MirrorSource,
    PhoneticMirrorAttempt,
    PracticePhrase,
    PronunciationQuality,
)
from app.services.phonetic_mirror.pronunciation_scorer import (
    pronunciation_scorer,
)

logger = logging.getLogger(__name__)


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
            return self._to_response(attempt, corrected_url=None)

        result = pronunciation_scorer.score_pronunciation(
            transcript=transcript,
            target_phrase=target_phrase_he,
            detected_language="he",
        )

        corrected_gcs_path = None
        threshold = settings.PERFECTED_VOICE_PRONUNCIATION_THRESHOLD
        if result.overall_score < threshold:
            corrected_gcs_path = await self._generate_corrected_audio(
                avatar_id, target_phrase_he
            )

        await self._record_proficiency(
            user_id, profile_id, result.overall_score, target_phrase_he
        )

        shekels = self._calculate_shekels(result.overall_score, result.quality)

        if shekels > 0:
            await self._award_shekels(
                user_id, profile_id, shekels, target_phrase_he
            )

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

        return self._to_response(attempt, corrected_gcs_path)

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
            defaults = self._get_default_phrases(
                difficulty, count - len(phrases)
            )
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
            "attempts": [self._to_response(a, a.corrected_audio_gcs_path) for a in attempts],
            "total": total,
            "average_score": round(avg_score, 3),
        }

    async def _generate_corrected_audio(
        self, avatar_id: str, hebrew_text: str
    ) -> Optional[str]:
        """Generate corrected pronunciation audio using child voice clone."""
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar or not avatar.has_voice_clone:
            return None

        from app.services.interactive_mission.child_voice_service import (
            child_voice_service,
        )

        return await child_voice_service.generate_corrected_hebrew(
            avatar, hebrew_text
        )

    async def _record_proficiency(
        self,
        user_id: str,
        profile_id: str,
        score: float,
        phrase: str,
    ) -> None:
        """Record assessment and update vocabulary proficiency."""
        from app.services.proficiency.assessment_service import (
            assessment_service,
        )

        await assessment_service.record_assessment(
            user_id=user_id,
            profile_id=profile_id,
            source="phonetic_mirror",
            score=score,
            words_tested=1,
            words_correct=1 if score >= settings.PERFECTED_VOICE_PRONUNCIATION_THRESHOLD else 0,
        )

    async def _award_shekels(
        self,
        user_id: str,
        profile_id: str,
        amount: int,
        phrase: str,
    ) -> None:
        """Award shekels for pronunciation practice."""
        from app.services.mission.shekel_service import shekel_service
        from app.models.shekel_currency import TransactionType

        await shekel_service.earn_shekels(
            user_id=user_id,
            profile_id=profile_id,
            amount=amount,
            transaction_type=TransactionType.MISSION_REWARD,
            description=f"Phonetic mirror practice: {phrase[:30]}",
            description_he=f"תרגול הגייה: {phrase[:30]}",
        )

    def _calculate_shekels(
        self, score: float, quality: PronunciationQuality
    ) -> int:
        """Calculate shekel reward based on pronunciation score."""
        rewards = {
            PronunciationQuality.EXCELLENT: 10,
            PronunciationQuality.GOOD: 5,
            PronunciationQuality.FAIR: 2,
            PronunciationQuality.NEEDS_PRACTICE: 1,
            PronunciationQuality.NO_MATCH: 0,
        }
        return rewards.get(quality, 0)

    def _get_default_phrases(
        self, difficulty: str, count: int
    ) -> List[PracticePhrase]:
        """Return default practice phrases by difficulty level."""
        beginner = [
            PracticePhrase(phrase_he="\u05E9\u05DC\u05D5\u05DD", transliteration="shalom", translation="hello/peace", difficulty="easy", category="greetings"),
            PracticePhrase(phrase_he="\u05EA\u05D5\u05D3\u05D4", transliteration="toda", translation="thank you", difficulty="easy", category="greetings"),
            PracticePhrase(phrase_he="\u05D1\u05D5\u05E7\u05E8 \u05D8\u05D5\u05D1", transliteration="boker tov", translation="good morning", difficulty="easy", category="greetings"),
        ]
        medium = [
            PracticePhrase(phrase_he="\u05DE\u05D4 \u05E0\u05E9\u05DE\u05E2", transliteration="ma nishma", translation="how are you", difficulty="medium", category="conversation"),
            PracticePhrase(phrase_he="\u05D0\u05E0\u05D9 \u05DC\u05D5\u05DE\u05D3 \u05E2\u05D1\u05E8\u05D9\u05EA", transliteration="ani lomed ivrit", translation="I am learning Hebrew", difficulty="medium", category="conversation"),
        ]
        phrase_map = {"easy": beginner, "medium": medium, "hard": medium}
        return phrase_map.get(difficulty, medium)[:count]

    def _to_response(
        self,
        attempt: PhoneticMirrorAttempt,
        corrected_url: Optional[str],
    ) -> MirrorAttemptResponse:
        """Convert attempt document to API response."""
        return MirrorAttemptResponse(
            id=str(attempt.id) if attempt.id else "",
            pronunciation_score=attempt.pronunciation_score,
            quality=attempt.quality.value,
            phoneme_feedback=attempt.phoneme_feedback,
            corrected_audio_url=corrected_url,
            shekels_earned=attempt.shekels_earned,
            input_transcript=attempt.input_transcript,
            target_phrase_he=attempt.target_phrase_he,
            created_at=attempt.created_at.isoformat(),
        )


phonetic_mirror_service = PhoneticMirrorService()
