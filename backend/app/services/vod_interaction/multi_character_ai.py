"""
Multi-Character AI Service

Generates in-character dialogue responses for multi-character interactive
moments. Handles primary character addressing and secondary character reactions.
"""

import random
from typing import List, Optional

from pydantic import BaseModel, Field

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.vod_interaction import (
    CharacterProfile, CharacterResponse, DialogueExchange,
)

logger = get_logger(__name__)


class CharacterReaction(BaseModel):
    """Reaction from a non-addressed character"""
    character_name: str = Field(..., description="Reacting character name")
    text: str = Field(..., description="Reaction text (1 sentence max)")
    emotion: Optional[str] = Field(None, description="Emotion label")


class MultiCharacterResponse(BaseModel):
    """Response containing primary reply and optional reactions"""
    primary: CharacterResponse
    primary_character_name: str
    reactions: List[CharacterReaction] = Field(default_factory=list)


class MultiCharacterAIService:
    """Generates multi-character dialogue with cross-character reactions"""

    async def generate_multi_character_response(
        self,
        addressed_character: str,
        all_characters: List[CharacterProfile],
        scene_context: str,
        user_message: str,
        history: List[DialogueExchange],
        allow_reactions: bool,
        reaction_probability: float,
    ) -> MultiCharacterResponse:
        """Generate primary character response and optional reactions."""
        system_prompt = self._build_multi_character_prompt(
            addressed_character, all_characters, scene_context, history,
        )
        logger.info(
            "Generating multi-character response",
            extra={
                "addressed_character": addressed_character,
                "character_count": len(all_characters),
                "message_length": len(user_message),
            },
        )
        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.VOD_INTERACTION_AI_MODEL,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            max_tokens=settings.VOD_INTERACTION_AI_MAX_TOKENS,
        )
        primary_text = response.content[0].text
        primary = CharacterResponse(
            text=primary_text, emotion=self._infer_emotion(primary_text),
        )
        reactions: List[CharacterReaction] = []
        if allow_reactions and settings.VOD_INTERACTION_REACTIONS_ENABLED:
            non_addressed = [
                c for c in all_characters if c.name != addressed_character
            ]
            reactions = await self._generate_reactions(
                non_addressed, primary_text, scene_context, reaction_probability,
            )
        logger.info(
            "Multi-character response generated",
            extra={
                "addressed_character": addressed_character,
                "response_length": len(primary_text),
                "reaction_count": len(reactions),
            },
        )
        return MultiCharacterResponse(
            primary=primary,
            primary_character_name=addressed_character,
            reactions=reactions,
        )

    async def _generate_reactions(
        self,
        non_addressed: List[CharacterProfile],
        primary_text: str,
        scene_context: str,
        reaction_probability: float,
    ) -> List[CharacterReaction]:
        """Generate short text reactions from non-addressed characters."""
        reactions: List[CharacterReaction] = []
        client = get_anthropic_client()
        for character in non_addressed:
            if random.random() > reaction_probability:
                continue
            prompt = (
                f"You are {character.name}. "
                f"Personality: {', '.join(character.personality_traits)}. "
                f"Scene: {scene_context}. "
                f"Another character just said: \"{primary_text}\". "
                f"React in ONE short sentence (max 15 words), staying in character. "
                f"Only the reaction text, nothing else."
            )
            try:
                resp = await client.messages.create(
                    model=settings.VOD_INTERACTION_AI_MODEL,
                    system=prompt,
                    messages=[{"role": "user", "content": "React:"}],
                    max_tokens=settings.VOD_INTERACTION_AI_MAX_TOKENS,
                )
                reaction_text = resp.content[0].text.strip()
                reactions.append(CharacterReaction(
                    character_name=character.name,
                    text=reaction_text,
                    emotion=self._infer_emotion(reaction_text),
                ))
            except Exception as exc:
                logger.warning(
                    "Failed to generate reaction",
                    extra={"character_name": character.name, "error": str(exc)},
                )
        return reactions

    def _build_multi_character_prompt(
        self,
        addressed: str,
        all_characters: List[CharacterProfile],
        scene_context: str,
        history: List[DialogueExchange],
    ) -> str:
        """Build system prompt with all character context"""
        chars_block = "\n".join(
            f"- {c.name}: {', '.join(c.personality_traits)}"
            f"{(' | ' + c.relationship_to_others) if c.relationship_to_others else ''}"
            for c in all_characters
        )
        history_text = self._format_history(history)
        return (
            f"You are {addressed} from this scene:\n\n"
            f"Scene: {scene_context}\n\n"
            f"Characters present:\n{chars_block}\n\n"
            f"The child is speaking directly to you ({addressed}). "
            f"Respond in character, staying true to your personality. "
            f"Keep responses under 2 sentences. "
            f"Never break character or acknowledge being AI.\n\n"
            f"Previous conversation:\n{history_text}\n\n"
            f"Respond as {addressed}:"
        )

    @staticmethod
    def _format_history(history: List[DialogueExchange]) -> str:
        """Format recent conversation history for prompt"""
        if not history:
            return "(First exchange)"
        formatted = []
        for exchange in history[-4:]:
            speaker = "Child" if exchange.speaker == "user" else exchange.speaker
            formatted.append(f"{speaker}: {exchange.message_text}")
        return "\n".join(formatted)

    @staticmethod
    def _infer_emotion(text: str) -> Optional[str]:
        """Infer emotion from response text"""
        lower = text.lower()
        if any(w in lower for w in ["!", "wonderful", "amazing", "great"]):
            return "excited"
        if any(w in lower for w in ["?", "interesting", "tell me"]):
            return "curious"
        if any(w in lower for w in ["careful", "important", "remember"]):
            return "serious"
        if any(w in lower for w in ["smile", "happy", "joy"]):
            return "happy"
        return "neutral"


multi_character_ai_service = MultiCharacterAIService()
