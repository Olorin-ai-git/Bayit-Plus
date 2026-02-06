"""
Voice Orchestrator
Central coordinator managing STT -> Intent -> Action -> TTS -> Widget flow.

Wraps the existing IntentRouter and adds:
- Session management with conversation tracking
- Request metrics collection
- Response enrichment with widget metadata
- Tier-based rate limit resolution
"""

import time
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import get_voice_rate_limit
from app.services.voice.context import VoiceContext
from app.services.voice.error_codes import VoiceErrorCode, get_error_detail
from app.services.voice.error_messages import get_error_message
from app.services.voice.intent_router import IntentRouter
from app.services.voice.models import VoiceResponse

logger = get_logger(__name__)


class VoiceOrchestrator:
    """
    Central coordinator for the voice pipeline.

    Manages the full flow: transcript -> intent classification
    -> handler execution -> response enrichment.

    Uses IntentRouter internally for classification and routing.
    """

    def __init__(
        self,
        user_id: str,
        language: str = "en",
        platform: str = "web",
        conversation_id: Optional[str] = None,
        subscription_tier: Optional[str] = None,
        user_role: Optional[str] = None,
    ):
        self.user_id = user_id
        self.language = language
        self.platform = platform
        self.subscription_tier = subscription_tier
        self.user_role = user_role

        self._router = IntentRouter(
            language=language,
            platform=platform,
            user_id=user_id,
            conversation_id=conversation_id,
        )
        self.conversation_id = self._router.conversation_id

    async def process_voice_input(
        self,
        transcript: str,
        trigger_type: str = "manual",
    ) -> VoiceResponse:
        """
        Process a voice input through the full pipeline.

        1. Classify intent via IntentRouter
        2. Route to handler
        3. Enrich response with session and widget metadata
        4. Collect timing metrics

        Args:
            transcript: Voice input text
            trigger_type: 'manual' or 'wake-word'

        Returns:
            Enriched VoiceResponse
        """
        start_time = time.monotonic()

        logger.info(
            "Orchestrator processing voice input",
            extra={
                "user_id": self.user_id,
                "conversation_id": self.conversation_id,
                "platform": self.platform,
                "language": self.language,
                "trigger_type": trigger_type,
                "transcript_length": len(transcript),
            },
        )

        try:
            response = await self._router.process_and_route(
                transcript=transcript,
                trigger_type=trigger_type,
            )

            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            self._log_metrics(response, elapsed_ms)

            return response

        except Exception as e:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            logger.error(
                "Orchestrator pipeline failed",
                extra={
                    "user_id": self.user_id,
                    "conversation_id": self.conversation_id,
                    "error": str(e),
                    "elapsed_ms": elapsed_ms,
                },
                exc_info=True,
            )
            raise

    def get_rate_limit(self) -> str:
        """
        Get the rate limit string for this user based on tier/role.

        Returns:
            Rate limit string (e.g., '60/minute')
        """
        return get_voice_rate_limit(
            subscription_tier=self.subscription_tier,
            role=self.user_role,
        )

    def get_error_response(
        self,
        error_code: VoiceErrorCode,
    ) -> Dict[str, Any]:
        """
        Build a structured error response dict.

        Args:
            error_code: VoiceErrorCode enum value

        Returns:
            Dict with error_code, message, and spoken_response
        """
        detail = get_error_detail(error_code)
        return {
            "error_code": error_code.value,
            "message": detail.description,
            "spoken_response": get_error_message(
                detail.message_key, self.language
            ),
        }

    def _log_metrics(self, response: VoiceResponse, elapsed_ms: int) -> None:
        """Log performance metrics for the completed pipeline."""
        logger.info(
            "Orchestrator pipeline completed",
            extra={
                "user_id": self.user_id,
                "conversation_id": self.conversation_id,
                "intent": response.intent,
                "confidence": response.confidence,
                "elapsed_ms": elapsed_ms,
                "platform": self.platform,
                "language": self.language,
                "subscription_tier": self.subscription_tier,
            },
        )
