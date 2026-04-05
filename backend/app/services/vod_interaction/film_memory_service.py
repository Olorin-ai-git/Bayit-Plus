"""Film memory service: CRUD + context building + ingestion.

Provides cross-moment character memory keyed by (user_id, profile_id, content_id).
Additive to the existing per-moment VODInteractionSession model.
"""
from datetime import datetime
from typing import List

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.film_memory import FilmMemoryExchange, VODFilmMemory
from app.services.vod_interaction.film_memory_summarizer import (
    SummarizerFailure,
    film_memory_summarizer,
)

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

    async def ingest_exchanges(
        self,
        memory: VODFilmMemory,
        new_exchanges: List[FilmMemoryExchange],
    ) -> VODFilmMemory:
        """Append new exchanges, roll overflow into summary, persist."""
        window = settings.VOD_FILM_MEMORY_VERBATIM_WINDOW
        hard_cap = settings.VOD_FILM_MEMORY_MAX_RECENT_HARD_CAP
        failure_threshold = settings.VOD_FILM_MEMORY_SUMMARIZER_FAILURE_THRESHOLD

        memory.recent_exchanges.extend(new_exchanges)
        memory.exchange_count += len(new_exchanges)
        if new_exchanges:
            memory.last_moment_timestamp = max(
                memory.last_moment_timestamp,
                max(e.moment_timestamp for e in new_exchanges),
            )

        overflow = len(memory.recent_exchanges) - window
        breaker_tripped = memory.summarizer_failure_streak >= failure_threshold

        if overflow > 0 and not breaker_tripped:
            to_summarize = memory.recent_exchanges[:overflow]
            try:
                memory.summary = await film_memory_summarizer.summarize(
                    existing_summary=memory.summary,
                    new_exchanges=to_summarize,
                )
                memory.recent_exchanges = memory.recent_exchanges[overflow:]
                memory.summarizer_failure_streak = 0
            except SummarizerFailure:
                memory.summarizer_failure_streak += 1
                logger.warning(
                    "Summarizer failure, keeping verbatim exchanges",
                    extra={
                        "user_id": memory.user_id,
                        "content_id": memory.content_id,
                        "streak": memory.summarizer_failure_streak,
                    },
                )

        if len(memory.recent_exchanges) > hard_cap:
            drop = len(memory.recent_exchanges) - hard_cap
            memory.recent_exchanges = memory.recent_exchanges[drop:]
            logger.warning(
                "Hard cap reached on recent_exchanges, force-dropped oldest",
                extra={
                    "user_id": memory.user_id,
                    "content_id": memory.content_id,
                    "dropped": drop,
                },
            )

        memory.updated_at = datetime.utcnow()
        saved = await self._save_with_version(memory)
        if saved:
            return memory
        logger.warning(
            "VODFilmMemory version conflict, refetching and retrying once",
            extra={"user_id": memory.user_id, "content_id": memory.content_id},
        )
        fresh = await VODFilmMemory.find(
            {"user_id": memory.user_id, "profile_id": memory.profile_id, "content_id": memory.content_id},
        ).first_or_none()
        if fresh is None:
            return memory
        fresh.recent_exchanges.extend(new_exchanges)
        fresh.exchange_count += len(new_exchanges)
        fresh.updated_at = datetime.utcnow()
        saved_retry = await self._save_with_version(fresh)
        if not saved_retry:
            logger.warning(
                "VODFilmMemory version conflict on retry, skipping write",
                extra={"user_id": memory.user_id, "content_id": memory.content_id},
            )
        return fresh

    async def reset_for_user_content(
        self, user_id: str, profile_id: str, content_id: str,
    ) -> None:
        """Delete memory doc — used when user deliberately restarts film history."""
        existing = await VODFilmMemory.find(
            {"user_id": user_id, "profile_id": profile_id, "content_id": content_id},
        ).first_or_none()
        if existing is not None:
            await existing.delete()
            logger.info(
                "VODFilmMemory reset",
                extra={
                    "user_id": user_id, "profile_id": profile_id, "content_id": content_id,
                },
            )

    async def _save_with_version(self, memory: VODFilmMemory) -> bool:
        """Atomic versioned update. Returns True on success, False on conflict."""
        collection = VODFilmMemory.get_motor_collection()
        current_version = memory.version
        new_version = current_version + 1

        update_doc = memory.model_dump(exclude={"id"})
        update_doc["version"] = new_version

        result = await collection.find_one_and_update(
            {"_id": memory.id, "version": current_version},
            {"$set": update_doc},
            return_document=True,
        )
        if result is None:
            return False
        memory.version = new_version
        return True


film_memory_service = FilmMemoryService()
