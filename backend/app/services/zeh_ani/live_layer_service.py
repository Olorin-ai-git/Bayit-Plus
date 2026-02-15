"""
Live Layer Service.

Manages interactive scene triggers during content playback. Fetches upcoming
triggers within a lookahead window, processes child speech responses via ASR,
and scores pronunciation against target Hebrew words.
"""

from typing import List

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.scene_trigger import ContentSceneTriggers, SceneTrigger

logger = get_logger(__name__)


class LiveLayerService:
    """Processes interactive scene triggers during content playback."""

    async def get_active_triggers(
        self,
        content_id: str,
        current_timestamp: float,
    ) -> List[SceneTrigger]:
        """
        Get triggers within the lookahead window for a content item.

        Queries ContentSceneTriggers for the given content, then filters
        triggers that fall within [current_timestamp, current_timestamp +
        lookahead].
        """
        doc = await ContentSceneTriggers.find_one(
            {"content_id": content_id}
)
        if not doc:
            return []

        lookahead = settings.SCENE_TRIGGER_LOOKAHEAD_SECONDS
        active = doc.get_triggers_in_window(current_timestamp, lookahead)

        if active:
            logger.info(
                "Active triggers found",
                extra={
                    "content_id": content_id,
                    "timestamp": current_timestamp,
                    "trigger_count": len(active),
                },
            )

        return active

    async def process_trigger_response(
        self,
        trigger: SceneTrigger,
        audio_data: bytes,
        avatar: ChildAvatar,
    ) -> dict:
        """
        Process a child's spoken response to a scene trigger.

        Transcribes the audio via enhanced ASR, then scores pronunciation
        against the trigger's target Hebrew word using the shared
        pronunciation scorer.
        """
        from app.services.zeh_ani.enhanced_asr_service import (
            enhanced_asr_service,
        )
        from app.services.phonetic_mirror.pronunciation_scorer import (
            pronunciation_scorer,
        )

        asr_result = await enhanced_asr_service.transcribe_child_speech(
            audio_data=audio_data,
            language_hints=["he", "en"],
        )

        transcript = asr_result.get("text", "")
        detected_language = asr_result.get("language", "he")

        scoring_result = pronunciation_scorer.score_pronunciation(
            transcript=transcript,
            target_phrase=trigger.target_word_he,
            detected_language=detected_language,
        )

        is_correct = scoring_result.overall_score >= settings.PRONUNCIATION_THRESHOLD_GOOD
        animation = (
            trigger.avatar_animation
            if is_correct
            else "encourage"
        )

        from app.services.zeh_ani import deduct_zeh_ani_credits

        success, _remaining = await deduct_zeh_ani_credits(
            user_id=avatar.user_id,
            feature="live_layer",
            usage_amount=1.0,
            metadata={"trigger_id": trigger.trigger_id},
        )
        if not success:
            raise ValueError("Insufficient credits for live layer trigger")

        logger.info(
            "Trigger response scored",
            extra={
                "trigger_id": trigger.trigger_id,
                "target_word": trigger.target_word_he,
                "transcript": transcript,
                "score": scoring_result.overall_score,
                "correct": is_correct,
                "credits_charged": settings.CREDIT_RATE_LIVE_LAYER,
            },
        )

        return {
            "trigger_id": trigger.trigger_id,
            "transcript": transcript,
            "target_word_he": trigger.target_word_he,
            "score": round(scoring_result.overall_score, 3),
            "quality": scoring_result.quality.value,
            "correct": is_correct,
            "animation_name": animation,
            "word_feedback": [
                {
                    "word": fb.word_he,
                    "expected": fb.expected_transliteration,
                    "heard": fb.heard_transliteration,
                    "score": round(fb.score, 3),
                }
                for fb in scoring_result.word_feedback
            ],
            "credits_charged": settings.CREDIT_RATE_LIVE_LAYER,
        }


live_layer_service = LiveLayerService()
