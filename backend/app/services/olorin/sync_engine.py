"""Container sync engine: poll cycle + webhook handler."""

from datetime import datetime, timezone

from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.source_connection import SourceConnection
from app.models.synced_container import SyncedContainer
from app.services.olorin.source_connector import import_from_source
from app.services.olorin.source_helpers import get_provider, get_valid_token

logger = get_logger(__name__)


async def run_poll_cycle() -> None:
    """Run poll cycle for all active synced containers that are due.

    Called by a background scheduler. Checks each container's last_poll_at
    against its poll_interval_hours.
    """
    now = datetime.now(timezone.utc)
    containers = await SyncedContainer.find({"status": "active"}).to_list()

    for sc in containers:
        if sc.last_poll_at:
            hours_since = (now - sc.last_poll_at).total_seconds() / 3600
            if hours_since < sc.poll_interval_hours:
                continue

        try:
            await _poll_single_container(sc)
        except Exception:
            logger.exception(
                "Poll failed for container",
                extra={"container_id": sc.container_id},
            )


async def _poll_single_container(sc: SyncedContainer) -> None:
    """Poll a single container: detect new + removed videos."""
    conn = await SourceConnection.find_one({"connection_id": sc.connection_id})
    if not conn or conn.status != "active":
        sc.status = "connection_lost"
        await sc.save()
        return

    provider = get_provider(conn)
    token = await get_valid_token(conn)

    # List all videos in the source folder (paginate through all)
    source_video_ids: set[str] = set()
    page_token = None
    while True:
        page = await provider.list_videos(token, sc.provider_folder_ref, page_token)
        for v in page.items:
            source_video_ids.add(v.video_id)
        if not page.next_page_token:
            break
        page_token = page.next_page_token

    # Find existing content for this connection
    existing = await Content.find(
        {
            "source_connection_id": sc.connection_id,
            "source_ref": {"$ne": None},
            "partner_id": sc.partner_id,
        }
    ).to_list()
    existing_refs = {c.source_ref for c in existing}

    # New videos to import
    new_refs = source_video_ids - existing_refs
    if new_refs and sc.auto_import_new:
        await import_from_source(
            connection_id=sc.connection_id,
            partner_id=sc.partner_id,
            video_ids=list(new_refs),
            folder_path=sc.folder_path,
        )
        logger.info(
            "Sync imported new videos for container",
            extra={"count": len(new_refs), "container_id": sc.container_id},
        )

    # Missing videos — flag as unavailable
    missing_refs = existing_refs - source_video_ids
    if missing_refs:
        now = datetime.now(timezone.utc)
        await Content.find(
            {
                "source_connection_id": sc.connection_id,
                "source_ref": {"$in": list(missing_refs)},
            }
        ).update_many(
            {"$set": {
                "source_status": "unavailable",
                "source_unavailable_since": now,
            }}
        )
        logger.info(
            "Sync flagged videos as unavailable for container",
            extra={"count": len(missing_refs), "container_id": sc.container_id},
        )

    sc.last_poll_at = datetime.now(timezone.utc)
    sc.updated_at = sc.last_poll_at
    await sc.save()


async def handle_webhook_event(
    connection_id: str,
    folder_id: str,
    event_type: str,
    video_id: str | None = None,
) -> None:
    """Handle incoming webhook from Google Drive or Panopto."""
    sc = await SyncedContainer.find_one(
        {
            "connection_id": connection_id,
            "provider_folder_ref": folder_id,
            "status": "active",
        }
    )
    if not sc:
        return

    now = datetime.now(timezone.utc)
    sc.last_webhook_event_at = now
    await sc.save()

    if event_type in ("create", "add") and video_id:
        existing = await Content.find_one(
            {"source_connection_id": connection_id, "source_ref": video_id}
        )
        if not existing:
            await import_from_source(
                connection_id=connection_id,
                partner_id=sc.partner_id,
                video_ids=[video_id],
                folder_path=sc.folder_path,
            )
