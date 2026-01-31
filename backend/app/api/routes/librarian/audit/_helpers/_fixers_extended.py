"""Extended fix applicators (subtitles, misclassifications, streams, retries)."""
import logging

logger = logging.getLogger(__name__)


async def _apply_subtitle_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Apply missing subtitle downloads."""
    from app.services.ai_agent.executors.subtitles import (
        execute_check_subtitle_quota,
        execute_download_external_subtitle,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0, "quota_exhausted": False}

    # Check quota first
    quota_result = await execute_check_subtitle_quota()
    if not quota_result.get("quota_available"):
        stats["quota_exhausted"] = True
        return stats

    remaining_quota = quota_result.get("remaining", 0)

    for item in items:
        if stats["success"] >= remaining_quota:
            stats["quota_exhausted"] = True
            break

        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue

        languages = item.get("missing_languages", ["he", "en"])
        for language in languages:
            if stats["success"] >= remaining_quota:
                break

            stats["attempted"] += 1
            try:
                if dry_run:
                    stats["success"] += 1
                    continue

                result = await execute_download_external_subtitle(
                    content_id=content_id, language=language, audit_id=audit_id
                )
                if result.get("success"):
                    stats["success"] += 1
                else:
                    stats["failed"] += 1
            except Exception as e:
                stats["failed"] += 1
                logger.warning(f"Subtitle fix failed for {content_id}/{language}: {e}")

    return stats


async def _apply_misclassification_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Apply misclassification fixes."""
    from app.services.ai_agent.executors.series.classification import (
        execute_fix_misclassified_series,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0}
    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue
        stats["attempted"] += 1
        try:
            result = await execute_fix_misclassified_series(
                content_id=content_id, audit_id=audit_id, dry_run=dry_run
            )
            if result.get("success") or result.get("fixed"):
                stats["success"] += 1
            else:
                stats["failed"] += 1
        except Exception as e:
            stats["failed"] += 1
            logger.warning(f"Misclassification fix failed for {content_id}: {e}")
    return stats


async def _apply_broken_stream_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Flag broken streams for manual review."""
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_flag_for_manual_review,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0}
    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue
        stats["attempted"] += 1
        try:
            if dry_run:
                stats["success"] += 1
                continue

            result = await execute_flag_for_manual_review(
                content_id=content_id,
                audit_id=audit_id,
                reason=f"Broken stream: {item.get('error', 'Stream validation failed')}",
            )
            if result.get("success"):
                stats["success"] += 1
            else:
                stats["failed"] += 1
        except Exception as e:
            stats["failed"] += 1
            logger.warning(f"Broken stream flag failed for {content_id}: {e}")
    return stats


async def _retry_failed_tool_calls(
    audit_id: str, failed_calls: list, dry_run: bool
) -> dict:
    """Retry tool calls that failed in the original audit."""
    from app.services.ai_agent.dispatcher import execute_tool

    stats = {"attempted": 0, "success": 0, "failed": 0, "by_tool": {}}

    for call in failed_calls:
        tool_name = call.get("tool_name", "")
        content_id = call.get("content_id", "")
        tool_input = call.get("tool_input", {})

        if not tool_name or not content_id:
            continue

        stats["attempted"] += 1

        # Track per-tool stats
        if tool_name not in stats["by_tool"]:
            stats["by_tool"][tool_name] = {"attempted": 0, "success": 0, "failed": 0}
        stats["by_tool"][tool_name]["attempted"] += 1

        try:
            if dry_run:
                stats["success"] += 1
                stats["by_tool"][tool_name]["success"] += 1
                continue

            # Re-dispatch the tool call
            result = await execute_tool(
                tool_name=tool_name,
                tool_input=tool_input,
                audit_id=audit_id,
                dry_run=dry_run,
            )

            if result.get("success", False):
                stats["success"] += 1
                stats["by_tool"][tool_name]["success"] += 1
            else:
                stats["failed"] += 1
                stats["by_tool"][tool_name]["failed"] += 1
                logger.warning(
                    f"Retry failed for {tool_name} on {content_id}: {result.get('error', 'Unknown error')}"
                )
        except Exception as e:
            stats["failed"] += 1
            stats["by_tool"][tool_name]["failed"] += 1
            logger.warning(f"Retry exception for {tool_name} on {content_id}: {e}")

    logger.info(
        f"Retried {stats['attempted']} failed tool calls: "
        f"{stats['success']} success, {stats['failed']} failed"
    )
    return stats
