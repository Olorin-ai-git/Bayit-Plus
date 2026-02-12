"""
Talk Back Orchestrator.

Coordinates the full Talk Back flow: get question points,
process voice responses, evaluate, and award rewards.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.core.config import settings
from app.models.shekel_currency import TransactionType
from app.models.talk_back_attempt import TalkBackAttempt
from app.models.talk_back_point import ContentTalkBack, TalkBackPointModel
from app.services.mission.mission_event_hooks import mission_event_hooks
from app.services.mission.shekel_service import shekel_service
from app.services.proficiency.assessment_service import assessment_service
from app.services.talk_back.voice_evaluator import voice_evaluator

logger = logging.getLogger(__name__)


class TalkBackOrchestrator:
    """Coordinates the Talk Back interaction flow."""

    async def get_talk_back_points(
        self,
        content_id: str,
    ) -> Optional[ContentTalkBack]:
        """Get Talk Back points for a content item."""
        return await ContentTalkBack.find_one(
            {"content_id": content_id, "is_active": True}
        )

    async def process_response(
        self,
        user_id: str,
        profile_id: str,
        content_id: str,
        point_id: str,
        transcript: str,
        detected_language: str,
        response_time_ms: int = 0,
        audio_duration_ms: int = 0,
        hint_used: bool = False,
    ) -> Dict:
        """
        Process a child's voice response to a Talk Back question.

        Evaluates the response, awards rewards, updates proficiency.
        """
        content_tb = await ContentTalkBack.find_one(
            {"content_id": content_id}
        )
        if not content_tb:
            raise ValueError(
                f"No Talk Back data for content: {content_id}"
            )

        point = self._find_point(content_tb.talk_back_points, point_id)
        if not point:
            raise ValueError(f"Talk Back point not found: {point_id}")

        quality, score, feedback, feedback_he = (
            voice_evaluator.evaluate(
                transcript=transcript,
                expected_responses=point.expected_responses,
                detected_language=detected_language,
            )
        )

        shekels_earned = int(point.shekel_reward * score)
        if hint_used:
            shekels_earned = int(shekels_earned * 0.5)

        points_earned = int(point.points_reward * score)

        attempt = TalkBackAttempt(
            user_id=user_id,
            profile_id=profile_id,
            content_id=content_id,
            point_id=point_id,
            response_transcript=transcript,
            detected_language=detected_language,
            hebrew_ratio=1.0 if detected_language in ("he", "iw") else 0.0,
            quality=quality,
            accuracy_score=score,
            shekels_earned=shekels_earned,
            points_earned=points_earned,
            response_time_ms=response_time_ms,
            audio_duration_ms=audio_duration_ms,
            hint_used=hint_used,
            feedback_text=feedback,
            feedback_text_he=feedback_he,
        )
        await attempt.insert()

        if shekels_earned > 0:
            await shekel_service.earn_shekels(
                user_id=user_id,
                profile_id=profile_id,
                amount=shekels_earned,
                transaction_type=TransactionType.TALK_BACK_REWARD,
                description=f"Talk Back: {point.character_name}",
                description_he=f"דבר חזרה: {point.character_name_he}",
                reference_id=point_id,
            )

        await assessment_service.record_assessment(
            user_id=user_id,
            profile_id=profile_id,
            source="talk_back",
            score=score,
            words_tested=len(point.expected_responses),
            words_correct=1 if score > 0.5 else 0,
            hebrew_ratio=attempt.hebrew_ratio,
        )

        from app.services.gamification.level_service import level_service

        await level_service.award_xp(
            user_id=user_id,
            profile_id=profile_id,
            source="talk_back",
            amount=settings.GAMIFICATION_XP_PER_TALK_BACK,
        )

        for word in point.vocabulary_targets:
            await assessment_service.update_vocabulary(
                user_id=user_id,
                profile_id=profile_id,
                word=word,
                transliteration="",
                translation="",
                correct=(score >= 0.5),
            )

        logger.info(
            "Talk Back response processed",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "content_id": content_id,
                "quality": quality.value,
                "score": score,
                "shekels": shekels_earned,
            },
        )

        return {
            "quality": quality.value,
            "accuracy_score": score,
            "shekels_earned": shekels_earned,
            "points_earned": points_earned,
            "feedback_text": feedback,
            "feedback_text_he": feedback_he,
            "detected_language": detected_language,
            "hint_used": hint_used,
        }

    async def get_user_stats(
        self,
        user_id: str,
        profile_id: str,
    ) -> Dict:
        """Get Talk Back statistics for a child."""
        attempts = await TalkBackAttempt.find(
            {"user_id": user_id, "profile_id": profile_id}
        ).to_list()

        if not attempts:
            return {
                "total_attempts": 0,
                "total_shekels_earned": 0,
                "average_accuracy": 0.0,
                "hebrew_response_rate": 0.0,
                "words_learned": 0,
            }

        total = len(attempts)
        total_shekels = sum(a.shekels_earned for a in attempts)
        avg_accuracy = sum(a.accuracy_score for a in attempts) / total
        hebrew_count = sum(
            1 for a in attempts if a.hebrew_ratio > 0.5
        )

        return {
            "total_attempts": total,
            "total_shekels_earned": total_shekels,
            "average_accuracy": round(avg_accuracy, 3),
            "hebrew_response_rate": round(hebrew_count / total, 3),
            "words_learned": 0,
        }

    def _find_point(
        self,
        points: List[TalkBackPointModel],
        point_id: str,
    ) -> Optional[TalkBackPointModel]:
        """Find a talk back point by ID."""
        for point in points:
            if point.point_id == point_id:
                return point
        return None


talk_back_orchestrator = TalkBackOrchestrator()
