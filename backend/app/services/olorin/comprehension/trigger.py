"""Comprehension trigger policy (D-06, D-07) — GPT-4o-mini classifier.

D-07 hard rate limit: max 1 trigger per 90 seconds of playback. Evaluated
BEFORE the LLM call so it cannot be bypassed via prompt manipulation.

D-06 context: scene_context + recent_exchanges window + time-since-last-trigger.
Uses OpenAI Structured Outputs (beta parse) driven by TriggerDecision Pydantic
schema.

Pitfall 4: explicit skip-bias instruction to prevent trigger spam.
"""
from app.core.ai_clients import get_openai_client
from app.core.logging_config import get_logger
from app.schemas.comprehension import TriggerDecision

logger = get_logger(__name__)

TRIGGER_MODEL = "gpt-4o-mini-2024-07-18"
TRIGGER_TEMPERATURE = 0
TRIGGER_MAX_TOKENS = 256

TRIGGER_RATE_LIMIT_SECONDS = 90.0  # D-07 hard rate limit

TRIGGER_SYSTEM_PROMPT = (
    "You decide whether to pause a film and ask the viewing student a "
    "comprehension question RIGHT NOW. Trigger sparingly. Prefer to skip "
    "when unsure, when the scene is still developing, or when the character "
    "has just covered the concept in recent chat. It is better to skip a "
    "weak moment than to interrupt with a weak question. Only trigger when "
    "a clear, self-contained comprehension check is warranted."
)


class ComprehensionTriggerPolicy:
    """Decides whether to trigger a comprehension question at the current moment."""

    def _build_user_prompt(
        self,
        scene_context: str,
        recent_exchanges_context: str,
        elapsed_since_last_trigger: float,
    ) -> str:
        """Build trigger-classifier user prompt (D-06).

        Pitfall 4: explicit skip bias baked in.
        """
        return (
            f"<scene_context>\n{scene_context}\n</scene_context>\n\n"
            f"<recent_exchanges>\n{recent_exchanges_context}\n"
            "</recent_exchanges>\n\n"
            f"<time_since_last_trigger_seconds>"
            f"{elapsed_since_last_trigger:.1f}"
            "</time_since_last_trigger_seconds>\n\n"
            "Decide should_trigger: true or false. Remember: bias toward "
            "skip. Only trigger when a strong comprehension check fits "
            "this exact moment. Provide a brief reason."
        )

    async def should_trigger(
        self,
        playback_seconds: float,
        last_trigger_at: float,
        scene_context: str,
        recent_exchanges_context: str,
    ) -> TriggerDecision:
        """Return trigger decision.

        D-07: if elapsed < 90s, return skip decision WITHOUT calling LLM.
        Otherwise call GPT-4o-mini with structured outputs.
        """
        elapsed = playback_seconds - last_trigger_at
        if elapsed < TRIGGER_RATE_LIMIT_SECONDS:
            logger.debug(
                "Trigger rate limited (D-07 90s)",
                extra={
                    "elapsed_seconds": elapsed,
                    "playback_seconds": playback_seconds,
                },
            )
            return TriggerDecision(
                should_trigger=False,
                reason="rate_limit_90s",
            )

        client = get_openai_client()
        user_prompt = self._build_user_prompt(
            scene_context=scene_context,
            recent_exchanges_context=recent_exchanges_context,
            elapsed_since_last_trigger=elapsed,
        )

        logger.info(
            "Evaluating comprehension trigger",
            extra={
                "playback_seconds": playback_seconds,
                "elapsed_seconds": elapsed,
            },
        )

        completion = await client.beta.chat.completions.parse(
            model=TRIGGER_MODEL,
            temperature=TRIGGER_TEMPERATURE,
            max_tokens=TRIGGER_MAX_TOKENS,
            messages=[
                {"role": "system", "content": TRIGGER_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format=TriggerDecision,
        )

        parsed = completion.choices[0].message.parsed
        if parsed is None:
            logger.warning(
                "Trigger model returned unparseable output; defaulting to skip",
            )
            return TriggerDecision(
                should_trigger=False,
                reason="parse_failure_default_skip",
            )
        return parsed


comprehension_trigger_policy = ComprehensionTriggerPolicy()
