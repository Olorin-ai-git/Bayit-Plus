"""Voice decision handler for voice-phrase interactive mission decisions."""

from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.interactive_mission_types import MissionDecision
from app.services.phonetic_mirror.pronunciation_scorer import (
    pronunciation_scorer,
)
from app.services.talk_back.voice_evaluator import voice_evaluator

logger = get_logger(__name__)


class VoiceDecisionResult:
    """Result of evaluating a voice phrase decision."""

    def __init__(
        self,
        success: bool,
        quality: str,
        score: float,
        pronunciation_score: float,
        feedback: str,
        feedback_he: str,
        next_scene: int,
        hint: str,
        attempt_number: int,
        corrected_audio_url: Optional[str] = None,
    ):
        self.success = success
        self.quality = quality
        self.score = score
        self.pronunciation_score = pronunciation_score
        self.feedback = feedback
        self.feedback_he = feedback_he
        self.next_scene = next_scene
        self.hint = hint
        self.attempt_number = attempt_number
        self.corrected_audio_url = corrected_audio_url


class VoiceDecisionHandler:
    """Handles voice phrase decisions in interactive missions."""

    async def evaluate_voice_decision(
        self,
        audio_data: bytes,
        decision: MissionDecision,
        avatar: ChildAvatar,
        attempt_number: int,
    ) -> VoiceDecisionResult:
        """Evaluate a spoken voice phrase against the expected answer."""
        from app.services.whisper_transcription_service import (
            WhisperTranscriptionService,
        )

        whisper_service = WhisperTranscriptionService()
        transcript = await whisper_service.transcribe_audio_chunk(
            audio_data, source_lang="he"
        )

        if not transcript:
            return VoiceDecisionResult(
                success=False,
                quality="no_response",
                score=0.0,
                pronunciation_score=0.0,
                feedback="No speech detected. Try again!",
                feedback_he="\u05DC\u05D0 \u05D6\u05D5\u05D4\u05D4 \u05D3\u05D9\u05D1\u05D5\u05E8. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1!",
                next_scene=decision.next_scene_on_failure,
                hint=self._get_hint(decision, attempt_number),
                attempt_number=attempt_number,
            )

        quality, eval_score, feedback, feedback_he = voice_evaluator.evaluate(
            transcript=transcript,
            expected_responses=decision.expected_responses,
            detected_language="he",
        )

        pron_result = pronunciation_scorer.score_pronunciation(
            transcript=transcript,
            target_phrase=decision.prompt_text,
            detected_language="he",
        )

        combined_score = (eval_score + pron_result.overall_score) / 2
        is_correct = quality.value in ("exact_match", "correct_root", "close_phonetic")

        corrected_url = None
        if is_correct and avatar.has_voice_clone:
            corrected_url = await self._generate_praise(avatar, decision)

        next_scene = (
            decision.next_scene_on_success if is_correct
            else decision.next_scene_on_failure
        )

        logger.info(
            "Voice decision evaluated",
            extra={
                "decision_id": decision.decision_id,
                "quality": quality.value,
                "eval_score": eval_score,
                "pronunciation_score": pron_result.overall_score,
                "combined_score": combined_score,
                "is_correct": is_correct,
                "attempt": attempt_number,
            },
        )

        return VoiceDecisionResult(
            success=is_correct,
            quality=quality.value,
            score=combined_score,
            pronunciation_score=pron_result.overall_score,
            feedback=feedback,
            feedback_he=feedback_he,
            next_scene=next_scene,
            hint=self._get_hint(decision, attempt_number),
            attempt_number=attempt_number,
            corrected_audio_url=corrected_url,
        )

    async def generate_voice_hint(
        self,
        decision: MissionDecision,
        avatar: ChildAvatar,
    ) -> Optional[str]:
        """Generate a hint by speaking the expected phrase in child's voice."""
        if not avatar.has_voice_clone or not decision.expected_responses:
            return None

        from app.services.interactive_mission.child_voice_service import (
            child_voice_service,
        )

        target_phrase = decision.expected_responses[0]
        return await child_voice_service.generate_corrected_hebrew(
            avatar, target_phrase
        )

    async def _generate_praise(
        self,
        avatar: ChildAvatar,
        decision: MissionDecision,
    ) -> Optional[str]:
        """Generate praise audio in child's cloned voice."""
        from app.services.interactive_mission.child_voice_service import (
            child_voice_service,
        )

        praise_text = settings.MISSION_VOICE_PRAISE_TEXT
        return await child_voice_service.generate_corrected_hebrew(
            avatar, praise_text
        )

    def _get_hint(
        self, decision: MissionDecision, attempt: int
    ) -> str:
        """Return hint text after threshold attempts."""
        threshold = settings.MISSION_VOICE_HINT_AFTER_ATTEMPT
        if attempt >= threshold and decision.hint_text_he:
            return decision.hint_text_he
        if attempt >= threshold and decision.hint_text:
            return decision.hint_text
        return ""


voice_decision_handler = VoiceDecisionHandler()
