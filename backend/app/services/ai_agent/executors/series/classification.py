"""
AI Agent Executors - Series Classification

Functions for creating series from episodes and fixing misclassified content.
"""

import logging
from typing import Any, Dict

from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.services.ai_agent.executors._shared import (get_content_or_error,
                                                     handle_dry_run,
                                                     log_librarian_action)

logger = logging.getLogger(__name__)


async def execute_create_series_from_episode(
    episode_id: str, audit_id: str, dry_run: bool = False
) -> Dict[str, Any]:
    """Create series container from episode and link the episode to it."""
    dry_run_result = handle_dry_run(
        dry_run, "create series from episode {episode_id}", episode_id=episode_id
    )
    if dry_run_result:
        return dry_run_result

    try:
        episode, error = await get_content_or_error(episode_id)
        if error:
            return error

        title_base = _extract_series_title(episode.title)
        category = await ContentSection.find_one({"slug": "series"})

        series = Content(
            title=title_base,
            title_en=episode.title_en,
            description=episode.description,
            poster_url=episode.poster_url,
            thumbnail=episode.thumbnail,
            backdrop=episode.backdrop,
            category_id=str(category.id) if category else "",
            category_name="Series",
            is_series=True,
            content_type="series",
            stream_url="",
            is_published=True,
        )
        await series.insert()

        episode.series_id = str(series.id)
        await episode.save()

        await log_librarian_action(
            audit_id=audit_id,
            action_type="create_series",
            content_id=str(series.id),
            description=f"Created series '{title_base}' from episode '{episode.title}'",
            content_type="series",
            issue_type="orphan_episode",
        )

        return {
            "success": True,
            "series_id": str(series.id),
            "series_title": title_base,
        }
    except Exception as e:
        logger.error(f"Error creating series from episode {episode_id}: {e}")
        return {"success": False, "error": str(e)}


async def execute_find_misclassified_episodes(
    limit: int | None = None,
) -> Dict[str, Any]:
    """Find content items misclassified as series when they should be episodes."""
    try:
        effective_limit = limit or settings.SERIES_LINKER_AUTO_LINK_BATCH_SIZE

        misclassified = (
            await Content.find(
                {
                    "is_series": True,
                    "$or": [
                        {"title": {"$regex": "S[0-9]{2}E[0-9]{2}", "$options": "i"}},
                        {"title": {"$regex": "Episode [0-9]+", "$options": "i"}},
                    ],
                }
            )
            .limit(effective_limit)
            .to_list()
        )

        return {
            "success": True,
            "count": len(misclassified),
            "items": [{"id": str(m.id), "title": m.title} for m in misclassified],
        }
    except Exception as e:
        logger.error(f"Error finding misclassified episodes: {e}")
        return {"success": False, "error": str(e)}


async def execute_fix_misclassified_series(
    content_id: str, audit_id: str, dry_run: bool = False
) -> Dict[str, Any]:
    """Fix misclassified series (should be episode)."""
    dry_run_result = handle_dry_run(
        dry_run, "fix misclassified content {content_id}", content_id=content_id
    )
    if dry_run_result:
        return dry_run_result

    try:
        content, error = await get_content_or_error(content_id)
        if error:
            return error

        before_state = {
            "is_series": content.is_series,
            "content_type": content.content_type,
        }

        content.is_series = False
        content.content_type = "episode"
        await content.save()

        after_state = {
            "is_series": content.is_series,
            "content_type": content.content_type,
        }

        await log_librarian_action(
            audit_id=audit_id,
            action_type="fix_misclassified",
            content_id=content_id,
            description=f"Fixed misclassified content '{content.title}' (series -> episode)",
            content_type="episode",
            issue_type="misclassified_series",
            before_state=before_state,
            after_state=after_state,
        )

        return {"success": True, "fixed": True}
    except Exception as e:
        logger.error(f"Error fixing misclassified series {content_id}: {e}")
        return {"success": False, "error": str(e)}


def _extract_series_title(episode_title: str) -> str:
    """Extract the base series title by removing season/episode markers."""
    title = episode_title
    if " S" in title:
        title = title.split(" S")[0]
    return title.strip()
