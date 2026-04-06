"""Vision-Grounded Questions service.

Handles frame validation, multimodal prompt building, and Claude vision
API calls. Composes with FilmMemoryService and CharacterAnimatorService.
"""
import base64
import io
import re
from typing import List, Literal, Tuple

from PIL import Image

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.vod_interaction import CharacterResponse, VODInteractionSession
from app.services.vod_interaction.film_memory_service import film_memory_service

logger = get_logger(__name__)

PersonaMode = Literal["character", "speaker"]

BLOCKED_RESPONSE_PATTERNS = re.compile(
    r"\b("
    r"violen(ce|t)|weapon|blood|death|kill|murder|"
    r"drug|alcohol|tobacco|smoking|"
    r"sexual|nude|naked|"
    r"hate|racist|discriminat|"
    r"suicide|self[- ]harm|"
    r"damn|hell|ass|shit|fuck|crap"
    r")\b",
    re.IGNORECASE,
)

SAFE_FALLBACK_RESPONSE = "Hmm, let me think about that differently..."


class VisionGroundedService:
    """Orchestrates vision-grounded question flow."""

    def validate_and_prepare_frame(self, frame_b64: str) -> bytes:
        """Validate and re-encode frame. Returns JPEG bytes.

        Raises ValueError if frame is invalid, non-JPEG, or too large.
        """
        try:
            frame_bytes = base64.b64decode(frame_b64)
        except Exception as exc:
            raise ValueError(f"Failed to decode base64 frame: {exc}") from exc

        if len(frame_bytes) > settings.VOD_VISION_FRAME_MAX_BYTES:
            raise ValueError(
                f"Frame size {len(frame_bytes)} bytes exceeds maximum "
                f"{settings.VOD_VISION_FRAME_MAX_BYTES}"
            )

        try:
            img = Image.open(io.BytesIO(frame_bytes))
        except Exception as exc:
            raise ValueError(f"Failed to open frame as image: {exc}") from exc

        if img.format != "JPEG":
            raise ValueError(
                f"Frame must be JPEG, got {img.format}. "
                f"Frontend should use canvas.toDataURL('image/jpeg')."
            )

        max_dim = settings.VOD_VISION_FRAME_MAX_DIMENSION
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)
            logger.info(
                "Resized vision frame to fit max dimension",
                extra={"new_size": img.size, "max_dim": max_dim},
            )

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()

    def build_vision_prompt(
        self,
        character_name: str,
        scene_context: str,
        character_description: str,
        tap_x: float,
        tap_y: float,
        user_message: str,
        memory_context: str,
        persona_mode: PersonaMode,
        audience_description: str,
        child_name: str,
        frame_b64_prepared: str,
    ) -> Tuple[str, List[dict]]:
        """Build system prompt and user content blocks for multimodal call.

        Returns (system_prompt, user_content_blocks).
        """
        tap_x_pct = round(tap_x * 100)
        tap_y_pct = round(tap_y * 100)

        memory_block = ""
        if memory_context:
            memory_block = f"\n\n{memory_context}"

        if persona_mode == "speaker":
            audience_line = (
                f"You are an expert guide speaking to {audience_description}."
                if audience_description
                else "You are an expert guide speaking to a thoughtful listener."
            )
            system = (
                f"You are {character_name}, speaking about the ideas "
                f"in this scene:\n"
                f"Scene: {scene_context}\n"
                f"Speaker: {character_description}"
                f"{memory_block}\n\n"
                f"The student has paused the video and is pointing at a "
                f"specific area of the frame (approximately {tap_x_pct}% "
                f"from left, {tap_y_pct}% from top).\n\n"
                f"{audience_line} Explain what the student is pointing "
                f"at - its historical context, significance in the film, "
                f"and what they can learn from it. Keep your response "
                f"under 4 sentences.\n"
                f"Never break persona or acknowledge you are an AI.\n"
                f"Output ONLY spoken dialogue text. No stage directions "
                f"or narration."
            )
        else:
            child_intro = (
                f"A child named {child_name} is talking to you."
                if child_name
                else "A child's avatar is talking to you."
            )
            system = (
                f"You are {character_name} from this scene:\n"
                f"Scene Context: {scene_context}\n"
                f"Character: {character_description}"
                f"{memory_block}\n\n"
                f"The student has paused the video and is pointing at a "
                f"specific area of the frame (approximately {tap_x_pct}% "
                f"from left, {tap_y_pct}% from top).\n\n"
                f"{child_intro} Respond in character as {character_name} "
                f"would - describe what you see from your perspective, "
                f"share your feelings about it, relate it to the story. "
                f"Keep your response under 3 sentences. Stay in character "
                f"at all times.\n"
                f"Never break character or acknowledge you are an AI.\n"
                f"Output ONLY spoken dialogue text. No stage directions "
                f"or narration."
            )

        question = user_message or settings.VOD_VISION_DEFAULT_QUESTION

        user_content: List[dict] = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": frame_b64_prepared,
                },
            },
            {
                "type": "text",
                "text": question,
            },
        ]

        return system, user_content

    async def process_vision_question(
        self,
        session: VODInteractionSession,
        frame_b64: str,
        tap_x: float,
        tap_y: float,
        user_message: str,
    ) -> CharacterResponse:
        """Full vision question flow: validate, prompt, call Claude, filter.

        Returns CharacterResponse with text and emotion.
        """
        prepared_bytes = self.validate_and_prepare_frame(frame_b64)
        prepared_b64 = base64.b64encode(prepared_bytes).decode()

        memory_context = ""
        if settings.VOD_FILM_MEMORY_ENABLED:
            memory = await film_memory_service.get_or_create(
                session.user_id, session.profile_id, session.content_id,
            )
            memory_context = film_memory_service.build_memory_context(memory)

        system_prompt, user_content = self.build_vision_prompt(
            character_name=session.character_name,
            scene_context=session.scene_context or "",
            character_description=session.character_description or "",
            tap_x=tap_x,
            tap_y=tap_y,
            user_message=user_message,
            memory_context=memory_context,
            persona_mode=session.persona_mode or "character",
            audience_description=session.audience_description or "",
            child_name=session.child_first_name or "",
            frame_b64_prepared=prepared_b64,
        )

        logger.info(
            "Calling Claude vision API",
            extra={
                "character_name": session.character_name,
                "tap_x": tap_x,
                "tap_y": tap_y,
                "session_id": str(session.id) if session.id else "new",
            },
        )

        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.VOD_INTERACTION_AI_MODEL,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}],
            max_tokens=settings.VOD_INTERACTION_AI_MAX_TOKENS,
        )

        response_text = response.content[0].text

        if BLOCKED_RESPONSE_PATTERNS.search(response_text):
            logger.warning(
                "Vision response failed content moderation",
                extra={
                    "character_name": session.character_name,
                    "session_id": str(session.id) if session.id else "new",
                },
            )
            response_text = SAFE_FALLBACK_RESPONSE

        emotion = self._infer_emotion(response_text)
        return CharacterResponse(text=response_text, emotion=emotion)

    def _infer_emotion(self, text: str) -> str:
        """Infer emotion from response text."""
        text_lower = text.lower()
        if any(w in text_lower for w in ["!", "wonderful", "amazing", "great"]):
            return "excited"
        if any(w in text_lower for w in ["?", "interesting", "tell me"]):
            return "curious"
        if any(w in text_lower for w in ["careful", "important", "remember"]):
            return "serious"
        if any(w in text_lower for w in ["smile", "happy", "joy"]):
            return "happy"
        return "neutral"


vision_grounded_service = VisionGroundedService()
