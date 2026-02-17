"""
Character AI Service

Generates in-character dialogue responses using Claude AI.
Characters stay true to their personality, scene context, and speak naturally to children.
"""

from typing import List, Optional
from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.models.vod_interaction import DialogueExchange, CharacterResponse
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class CharacterAIService:
    """Generates contextually appropriate character dialogue"""

    async def generate_response(
        self,
        character_name: str,
        scene_context: str,
        user_message: str,
        conversation_history: List[DialogueExchange],
        character_description: str = "",
        movie_context: str = ""
    ) -> CharacterResponse:
        """
        Generate in-character response to user message

        Args:
            character_name: Name of character to portray
            scene_context: Scene description/subtitles for context
            user_message: User's message to character
            conversation_history: Previous dialogue exchanges
            character_description: Personality/background description
            movie_context: Movie plot context for richer responses

        Returns:
            Character's response with text and emotion
        """
        try:
            system_prompt = self._build_system_prompt(
                character_name,
                scene_context,
                conversation_history,
                character_description=character_description,
                movie_context=movie_context
            )

            logger.info(
                "Generating character response",
                extra={
                    "character_name": character_name,
                    "message_length": len(user_message)
                }
            )

            client = get_anthropic_client()
            response = await client.messages.create(
                model=settings.VOD_INTERACTION_AI_MODEL,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
                max_tokens=settings.VOD_INTERACTION_AI_MAX_TOKENS
            )

            response_text = response.content[0].text
            emotion = self._infer_emotion(response_text)

            logger.info(
                "Character response generated",
                extra={
                    "character_name": character_name,
                    "response_length": len(response_text),
                    "emotion": emotion
                }
            )

            return CharacterResponse(text=response_text, emotion=emotion)

        except Exception as e:
            logger.error(
                "Failed to generate character response",
                extra={
                    "character_name": character_name,
                    "error": str(e)
                }
            )
            raise

    def _build_system_prompt(
        self,
        character_name: str,
        scene_context: str,
        history: List[DialogueExchange],
        character_description: str = "",
        movie_context: str = ""
    ) -> str:
        """Build system prompt for character dialogue generation.

        User message is passed separately via the messages array
        to prevent prompt injection.
        """

        history_text = self._format_history(history)

        description_block = ""
        if character_description:
            description_block = f"\nCharacter: {character_description}"

        context_block = ""
        if movie_context:
            context_block = f"\nMovie Context: {movie_context}"

        return f"""You are {character_name} from this scene:

Scene Context: {scene_context}{description_block}{context_block}

A child's avatar is talking to you. Respond in character as {character_name} would, staying true to:
- Your personality, values, and speech patterns
- The current scene's situation and context
- Speaking naturally and warmly to a child (simple Hebrew or English)
- Being educational and encouraging when appropriate
- Keeping responses under 2 sentences for natural speech
- Never breaking character or acknowledging you are an AI

Previous conversation:
{history_text}

Respond as {character_name}:"""

    def _format_history(self, history: List[DialogueExchange]) -> str:
        """Format conversation history for prompt context"""
        if not history:
            return "(This is the first exchange)"

        formatted = []
        for exchange in history[-4:]:
            speaker = "Child" if exchange.speaker == "user" else exchange.speaker
            formatted.append(f"{speaker}: {exchange.message_text}")

        return "\n".join(formatted)

    def _infer_emotion(self, text: str) -> Optional[str]:
        """
        Infer emotion from response text for future animation enhancements

        Args:
            text: Character response text

        Returns:
            Emotion label or None
        """
        text_lower = text.lower()

        if any(word in text_lower for word in ["!", "wonderful", "amazing", "great"]):
            return "excited"
        elif any(word in text_lower for word in ["?", "interesting", "tell me"]):
            return "curious"
        elif any(word in text_lower for word in ["careful", "important", "remember"]):
            return "serious"
        elif any(word in text_lower for word in ["smile", "happy", "joy"]):
            return "happy"
        else:
            return "neutral"


character_ai_service = CharacterAIService()
