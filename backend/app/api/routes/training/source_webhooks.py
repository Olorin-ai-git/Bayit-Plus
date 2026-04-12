"""Webhook receivers for Google Drive and Panopto push notifications."""

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.core.logging_config import get_logger
from app.models.source_connection import SourceConnection
from app.models.synced_container import SyncedContainer
from app.services.olorin.sync_engine import handle_webhook_event

logger = get_logger(__name__)

router = APIRouter(prefix="/webhooks", tags=["training-webhooks"])


@router.post("/google-drive")
async def google_drive_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """Receive Google Drive push notification.

    Google sends change notifications via POST with metadata in headers:
    - X-Goog-Channel-ID: our channel identifier (= connection_id)
    - X-Goog-Resource-State: sync | update | add | remove | trash
    - X-Goog-Resource-ID: the watched resource
    - X-Goog-Changed: folders, children, permissions, etc.

    No auth token — Google cannot send Bearer tokens. Validation is via
    channel-ID-to-connection matching against the database.
    """
    channel_id = request.headers.get("x-goog-channel-id", "")
    resource_state = request.headers.get("x-goog-resource-state", "")

    # "sync" is the initial handshake confirmation — acknowledge and return
    if resource_state == "sync":
        logger.info(
            "Google Drive webhook sync confirmation received",
            extra={"channel_id": channel_id},
        )
        return {"status": "ok"}

    if not channel_id:
        raise HTTPException(status_code=400, detail="Missing channel ID")

    conn = await SourceConnection.find_one(
        {"connection_id": channel_id, "status": "active"}
    )
    if not conn:
        logger.warning(
            "Google Drive webhook for unknown or inactive channel",
            extra={"channel_id": channel_id, "resource_state": resource_state},
        )
        raise HTTPException(status_code=404, detail="Unknown channel")

    changed = request.headers.get("x-goog-changed", "")

    # Trigger a sync check when children are added/removed or on update/add events.
    # Google does not specify which file changed — the sync engine polls the folder
    # and reconciles the diff.
    if "children" in changed or resource_state in ("update", "add", "remove", "trash"):
        containers = await SyncedContainer.find(
            {"connection_id": channel_id, "status": "active"}
        ).to_list()

        for sc in containers:
            background_tasks.add_task(
                handle_webhook_event,
                connection_id=channel_id,
                folder_id=sc.provider_folder_ref,
                event_type=resource_state if resource_state in ("add", "remove") else "add",
                video_id=None,
            )

        logger.info(
            "Google Drive webhook queued sync for containers",
            extra={
                "channel_id": channel_id,
                "resource_state": resource_state,
                "containers": len(containers),
            },
        )

    return {"status": "ok"}


@router.post("/panopto")
async def panopto_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """Receive Panopto webhook notification.

    Panopto sends JSON with event details:
        {
            "EventType": "SessionCreated" | "SessionDeleted" | ...,
            "FolderId": "...",
            "SessionId": "..."
        }

    No auth token — Panopto instance-level signature validation is
    handled by the caller when configuring the webhook URL. Validation
    here is via folder-ID-to-container matching.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_type: str = body.get("EventType", "")
    folder_id: str = body.get("FolderId", "")
    session_id: str | None = body.get("SessionId")

    if not folder_id:
        raise HTTPException(status_code=400, detail="Missing FolderId")

    sc = await SyncedContainer.find_one(
        {"provider_folder_ref": folder_id, "status": "active"}
    )
    if not sc:
        logger.warning(
            "Panopto webhook for unsynced or inactive folder",
            extra={"folder_id": folder_id, "event_type": event_type},
        )
        return {"status": "ignored"}

    _EVENT_MAP: dict[str, str] = {
        "SessionCreated": "create",
        "SessionDeleted": "remove",
    }
    internal_event = _EVENT_MAP.get(event_type)
    if not internal_event:
        logger.info(
            "Panopto webhook event type not handled",
            extra={"event_type": event_type, "folder_id": folder_id},
        )
        return {"status": "ignored"}

    background_tasks.add_task(
        handle_webhook_event,
        connection_id=sc.connection_id,
        folder_id=folder_id,
        event_type=internal_event,
        video_id=session_id,
    )

    logger.info(
        "Panopto webhook queued sync task",
        extra={
            "event_type": event_type,
            "folder_id": folder_id,
            "session_id": session_id,
        },
    )
    return {"status": "ok"}
