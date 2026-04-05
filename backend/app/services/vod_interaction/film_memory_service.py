"""Film memory service: CRUD + context building + ingestion.

Provides cross-moment character memory keyed by (user_id, profile_id, content_id).
Additive to the existing per-moment VODInteractionSession model.
"""
from app.core.logging_config import get_logger
from app.models.film_memory import VODFilmMemory

logger = get_logger(__name__)


class FilmMemoryService:
    """CRUD + ingestion for VODFilmMemory documents."""

    async def get_or_create(
        self, user_id: str, profile_id: str, content_id: str,
    ) -> VODFilmMemory:
        """Load existing memory for (user, profile, content) or create empty one."""
        existing = await VODFilmMemory.find(
            {"user_id": user_id, "profile_id": profile_id, "content_id": content_id},
        ).first_or_none()
        if existing is not None:
            return existing

        memory = VODFilmMemory(
            user_id=user_id, profile_id=profile_id, content_id=content_id,
        )
        await memory.insert()
        logger.info(
            "Created new VODFilmMemory",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "content_id": content_id,
            },
        )
        return memory

    def build_memory_context(self, memory: VODFilmMemory) -> str:
        """Build the <memory> block injected into character prompts.

        Returns empty string when memory has no summary AND no exchanges.
        """
        if not memory.summary and not memory.recent_exchanges:
            return ""

        parts = ["<memory>"]
        if memory.summary:
            parts.append(
                "What's happened between you and this student earlier in the film:"
            )
            parts.append(memory.summary)

        if memory.recent_exchanges:
            if memory.summary:
                parts.append("")
            parts.append("Most recent exchanges (verbatim):")
            for exch in memory.recent_exchanges:
                parts.append(
                    f"At {exch.moment_timestamp}s, speaking to {exch.character_name}:"
                )
                parts.append(f"  Student: {exch.user_message}")
                parts.append(f"  {exch.character_name}: {exch.character_response}")

        parts.append("</memory>")
        return "\n".join(parts)


film_memory_service = FilmMemoryService()
