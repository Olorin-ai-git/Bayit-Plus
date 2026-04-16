"""Trial data purge — GCS + DB cleanup when trial transitions locked → purged.

Called by trial_scheduler when `now >= purge_at`. Deletes partner-owned
BYOC content from GCS (video streams, thumbnails, backdrops, trailers)
and hard-deletes Content + B2BContentSource records. Returns summary
counts for audit logging.

Errors on individual blob deletions are logged but do not halt the purge —
orphan GCS objects are preferable to a partner stuck in "locked" state.
"""
import logging
from typing import Any

from app.core.storage import get_storage_provider
from app.models.b2b_content_source import B2BContentSource
from app.models.content import Content

logger = logging.getLogger(__name__)


_GCS_URL_FIELDS = ("stream_url", "thumbnail", "backdrop", "trailer_stream_url")


def _looks_like_remote_url(url: str | None) -> bool:
    if not url:
        return False
    return url.startswith("gs://") or "storage.googleapis.com" in url or url.startswith("https://")


async def purge_partner_byoc_files(partner_id: str) -> dict[str, Any]:
    """Delete all GCS-hosted files + DB records for a partner's BYOC content.

    Returns a summary dict: {contents_deleted, blobs_deleted, sources_deleted, errors}.
    """
    storage = get_storage_provider()

    blobs_deleted = 0
    errors: list[str] = []

    contents = await Content.find({"partner_id": partner_id}).to_list()
    for content in contents:
        for field in _GCS_URL_FIELDS:
            url = getattr(content, field, None)
            if not _looks_like_remote_url(url):
                continue
            try:
                await storage.delete_file(url)
                blobs_deleted += 1
            except Exception as exc:  # noqa: BLE001 — keep going
                errors.append(f"{content.id}:{field}:{exc}")
                logger.warning(
                    "trial_purge.blob_delete_failed",
                    extra={"partner_id": partner_id, "field": field, "url": url, "error": str(exc)},
                )
        await content.delete()

    source_result = await B2BContentSource.find({"partner_id": partner_id}).delete()
    sources_deleted = getattr(source_result, "deleted_count", 0) if source_result else 0

    summary = {
        "contents_deleted": len(contents),
        "blobs_deleted": blobs_deleted,
        "sources_deleted": sources_deleted,
        "errors": errors,
    }
    logger.info("trial_purge.completed", extra={"partner_id": partner_id, **summary})
    return summary
