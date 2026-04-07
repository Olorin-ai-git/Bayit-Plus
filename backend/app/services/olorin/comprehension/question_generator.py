"""In-character comprehension question generator (D-08, D-09).

Uses Claude 3.5 Haiku with tool-use structured output. Prompt MUST include
the VODFilmMemory memory_context (D-08 — summary + last 3 CHARACTER_CHAT
exchanges), scene_context, rubric, and the branch-specific adapt instruction.

Pitfall 3: grader-character isolation — this service NEVER receives
RubricScore numeric/rationale values from prior turns.
"""
from typing import Any, List, Optional

from app.core.ai_clients import get_anthropic_client
from app.core.logging_config import get_logger
from app.schemas.comprehension import AdaptLevel, FollowUpQuestion

logger = get_logger(__name__)

QGEN_MODEL = "claude-haiku-4-5-20251001"
QGEN_TEMPERATURE = 0.7  # in-character warmth
QGEN_MAX_TOKENS = 700

QGEN_TOOL_NAME = "emit_followup"

_ADAPT_INSTRUCTIONS: dict[AdaptLevel, str] = {
    AdaptLevel.INITIAL: (
        "Ask a clear initial comprehension question in your own voice, "
        "grounded in the current scene and rubric."
    ),
    AdaptLevel.HARDER: (
        "The student answered well. Ask a harder follow-up question that "
        "stretches them further on the same concept, still in your voice."
    ),
    AdaptLevel.SIMPLER_RETRY: (
        "The student struggled. Briefly re-explain the concept warmly in "
        "your voice, then ask them again in simpler words. Prior question: "
        "{prior_question}"
    ),
    AdaptLevel.ANSWER_REVEAL: (
        "The student has missed this twice. Warmly reveal the answer as "
        "the character teaching, not scolding. Be kind. Prior question: "
        "{prior_question}. Then invite them to keep watching."
    ),
}


class ComprehensionQuestionGeneration:
    """Generates in-character comprehension questions per D-08, D-09."""

    def _build_system_prompt(
        self,
        character_name: str,
        personality_traits: List[str],
    ) -> str:
        traits_str = ", ".join(personality_traits) if personality_traits else ""
        traits_block = f" Your personality: {traits_str}." if traits_str else ""
        return (
            f"You are {character_name}, speaking in-character to a young "
            f"student watching the film with you.{traits_block} Never break "
            "character. Never acknowledge you are an AI. Keep the question "
            "short, warm, and natural to your voice."
        )

    def _build_user_prompt(
        self,
        scene_context: str,
        rubric: str,
        memory_context: str,
        adapt_level: AdaptLevel,
        prior_question: Optional[str],
    ) -> str:
        instruction_template = _ADAPT_INSTRUCTIONS[adapt_level]
        instruction = instruction_template.format(
            prior_question=prior_question or "",
        )
        memory_block = memory_context if memory_context else "(no prior memory)"
        return (
            f"{memory_block}\n\n"
            f"<scene_context>\n{scene_context}\n</scene_context>\n\n"
            f"<rubric>\n{rubric}\n</rubric>\n\n"
            f"{instruction}\n\n"
            "Emit your question via the `emit_followup` tool."
        )

    def _tool_schema(self) -> dict[str, Any]:
        schema = FollowUpQuestion.model_json_schema()
        return {
            "name": QGEN_TOOL_NAME,
            "description": (
                "Emit the in-character follow-up question text, the character"
                "-voice phrasing preceding it, and the adapt_level."
            ),
            "input_schema": {
                "type": "object",
                "properties": schema.get("properties", {}),
                "required": schema.get("required", []),
                "$defs": schema.get("$defs", {}),
            },
        }

    async def generate(
        self,
        character_name: str,
        personality_traits: List[str],
        scene_context: str,
        rubric: str,
        adapt_level: AdaptLevel,
        memory_context: str,
        prior_question: Optional[str] = None,
    ) -> FollowUpQuestion:
        """Generate an in-character follow-up question.

        Returns FollowUpQuestion with adapt_level matching the requested level.
        """
        client = get_anthropic_client()
        system_prompt = self._build_system_prompt(
            character_name=character_name,
            personality_traits=personality_traits,
        )
        user_prompt = self._build_user_prompt(
            scene_context=scene_context,
            rubric=rubric,
            memory_context=memory_context,
            adapt_level=adapt_level,
            prior_question=prior_question,
        )

        logger.info(
            "Generating comprehension follow-up question",
            extra={
                "character_name": character_name,
                "adapt_level": adapt_level.value,
            },
        )

        response = await client.messages.create(
            model=QGEN_MODEL,
            max_tokens=QGEN_MAX_TOKENS,
            temperature=QGEN_TEMPERATURE,
            system=system_prompt,
            tools=[self._tool_schema()],
            tool_choice={"type": "tool", "name": QGEN_TOOL_NAME},
            messages=[{"role": "user", "content": user_prompt}],
        )

        tool_input: dict[str, Any] | None = None
        for block in response.content:
            if getattr(block, "type", None) == "tool_use":
                tool_input = getattr(block, "input", None)
                break

        if tool_input is None:
            logger.error("Question generator missing tool_use block")
            raise RuntimeError("Question generator did not emit tool_use block")

        # Force adapt_level to match requested (model may echo a different value).
        tool_input["adapt_level"] = adapt_level.value
        return FollowUpQuestion.model_validate(tool_input)


comprehension_question_generator = ComprehensionQuestionGeneration()
