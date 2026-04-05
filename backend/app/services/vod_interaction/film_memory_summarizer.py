"""Summarizer LLM wrapper for film memory rollover.

Takes popped verbatim exchanges + existing summary and produces an updated
running prose narrative. Used at moment-close to compress older history.
"""
from typing import List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.film_memory import FilmMemoryExchange

logger = get_logger(__name__)


class SummarizerFailure(Exception):
    """Raised when the summarizer LLM call fails. Callers should degrade gracefully."""


class FilmMemorySummarizer:
    """Produces updated prose summary from existing summary + new exchanges."""

    async def summarize(
        self,
        existing_summary: str,
        new_exchanges: List[FilmMemoryExchange],
    ) -> str:
        """Generate updated summary. Raises SummarizerFailure on LLM error."""
        prompt = self._build_prompt(existing_summary, new_exchanges)
        try:
            client = get_anthropic_client()
            response = await client.messages.create(
                model=settings.VOD_FILM_MEMORY_SUMMARIZER_MODEL,
                max_tokens=settings.VOD_FILM_MEMORY_SUMMARIZER_MAX_TOKENS,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text.strip()
        except Exception as exc:
            logger.warning(
                "Film memory summarizer failed",
                extra={"error": str(exc)},
            )
            raise SummarizerFailure(str(exc)) from exc

        return self._truncate_at_sentence(
            text, settings.VOD_FILM_MEMORY_SUMMARY_MAX_CHARS,
        )

    def _build_prompt(
        self,
        existing_summary: str,
        new_exchanges: List[FilmMemoryExchange],
    ) -> str:
        exchanges_text = "\n".join(
            f"At {e.moment_timestamp}s, speaking to {e.character_name}:\n"
            f"  Student: {e.user_message}\n"
            f"  {e.character_name}: {e.character_response}"
            for e in new_exchanges
        )
        summary_line = existing_summary or "(no prior summary)"
        return (
            "Update this running summary of a student's conversation with movie "
            "characters. Keep it under 250 words. Write in past tense, third person. "
            "Focus on: what the student asked about, what they felt, what they "
            "challenged, what the characters said in response.\n\n"
            f"Current summary: {summary_line}\n\n"
            "New exchanges to fold in:\n"
            f"{exchanges_text}\n\n"
            "Updated summary:"
        )

    @staticmethod
    def _truncate_at_sentence(text: str, max_chars: int) -> str:
        if len(text) <= max_chars:
            return text
        truncated = text[:max_chars]
        last_period = truncated.rfind(".")
        if last_period >= 0:
            return truncated[: last_period + 1]
        return truncated


film_memory_summarizer = FilmMemorySummarizer()
