"""
Text Polisher Service

Claude-based grammar and pronunciation polisher for user speech-to-text input.
Corrects speech recognition errors while preserving the child's vocabulary
level and original intent. Used in the Pause & Ask pipeline.
"""

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

POLISH_SYSTEM_PROMPT = (
    "Fix grammar, spelling, and speech recognition errors in the user's text. "
    "Output ONLY the corrected text — no explanations, no preamble, no commentary. "
    "If the text is already correct, return it exactly as-is. "
    "Never add words or change the meaning. Keep the same language."
)


class TextPolisher:
    """Polishes speech-to-text output for grammar and pronunciation."""

    async def polish(self, raw_text: str, language_hint: str = "") -> str:
        """
        Polish user text for grammar and pronunciation.

        Args:
            raw_text: Raw speech-to-text output from user
            language_hint: Optional language hint (e.g. 'he', 'en')

        Returns:
            Polished text string with corrected grammar
        """
        if not raw_text or not raw_text.strip():
            return raw_text

        try:
            system = POLISH_SYSTEM_PROMPT
            if language_hint:
                system += f"\nLanguage hint: {language_hint}"

            client = get_anthropic_client()
            response = await client.messages.create(
                model=settings.VOD_INTERACTION_TEXT_POLISH_MODEL,
                system=system,
                messages=[{"role": "user", "content": raw_text}],
                max_tokens=settings.VOD_INTERACTION_TEXT_POLISH_MAX_TOKENS,
            )

            polished = response.content[0].text.strip()

            # Guard: if polisher output is >2x the input length, the LLM
            # generated commentary instead of correcting — discard it.
            if len(polished) > len(raw_text) * 2 + 20:
                logger.warning(
                    "Text polisher output too long, using original",
                    extra={
                        "original_length": len(raw_text),
                        "polished_length": len(polished),
                    },
                )
                return raw_text

            logger.info(
                "Text polished",
                extra={
                    "original_length": len(raw_text),
                    "polished_length": len(polished),
                    "changed": polished != raw_text,
                },
            )
            return polished

        except Exception as exc:
            logger.warning(
                "Text polish failed, using original text",
                extra={"error": str(exc)},
            )
            return raw_text


text_polisher = TextPolisher()
