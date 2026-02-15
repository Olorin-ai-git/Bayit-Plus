"""
Character AI Service

Generates in-character dialogue responses using Claude AI.
Characters stay true to their personality, scene context, and speak naturally to children.
"""

from typing import List, Optional
from app.core.ai_clients import anthropic_client
from app.models.vod_interaction import DialogueExchange, CharacterResponse
from app.core.logging import logger


class CharacterAIService:
    """Generates contextually appropriate character dialogue"""

    def __init__(self):
        self.model = "claude-sonnet-4-20250514"
        self.max_tokens = 200

    async def generate_response(
        self,
        character_name: str,
        scene_context: str,
        user_message: str,
        conversation_history: List[DialogueExchange]
    ) -> CharacterResponse:
        """
        Generate in-character response to user message

        Args:
            character_name: Name of character to portray
            scene_context: Scene description/subtitles for context
            user_message: User's message to character
            conversation_history: Previous dialogue exchanges

        Returns:
            Character's response with text and emotion
        """
        try:
            prompt = self._build_character_prompt(
                character_name,
                scene_context,
                user_message,
                conversation_history
            )

            logger.info(
                "Generating character response",
                extra={
                    "character_name": character_name,
                    "user_message": user_message
                }
            )

            response = await anthropic_client.messages.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=self.max_tokens
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

    def _build_character_prompt(
        self,
        character_name: str,
        scene_context: str,
        user_message: str,
        history: List[DialogueExchange]
    ) -> str:
        """Build prompt for character dialogue generation"""

        history_text = self._format_history(history)

        return f"""You are {character_name} from this scene:

Scene Context: {scene_context}

A child's avatar just said to you: "{user_message}"

Respond in character as {character_name} would, staying true to:
- Your personality, values, and speech patterns
- The current scene's situation and context
- Speaking naturally and warmly to a child (simple Hebrew or English)
- Being educational and encouraging when appropriate
- Keeping responses under 2 sentences for natural speech

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
