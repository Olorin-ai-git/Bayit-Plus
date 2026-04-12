"""Synced container management routes for authenticated source connector."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import require_training_admin
from app.core.logging_config import get_logger
from app.models.source_connection import SourceConnection
from app.models.synced_container import SyncedContainer
from app.models.training_user import TrainingUser

logger = get_logger(__name__)
router = APIRouter(prefix="/source-browser", tags=["training-source-sync"])


class SyncCreateRequest(BaseModel):
    folder_id: str
    folder_path: str
    poll_interval_hours: int = Field(default=24, ge=6, le=168)


async def _resolve_conn(connection_id: str, partner_id: str) -> SourceConnection:
    conn = await SourceConnection.find_one(
        {"connection_id": connection_id, "partner_id": partner_id}
    )
    if not conn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Connection not found")
    if conn.status != "active":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Connection is {conn.status}")
    return conn


@router.post("/{connection_id}/sync", status_code=status.HTTP_201_CREATED)
async def create_sync(
    connection_id: str,
    body: SyncCreateRequest,
    admin: TrainingUser = Depends(require_training_admin),
):
    await _resolve_conn(connection_id, admin.partner_id)
    container = SyncedContainer(
        connection_id=connection_id,
        partner_id=admin.partner_id,
        provider_folder_ref=body.folder_id,
        folder_path=body.folder_path,
        poll_interval_hours=body.poll_interval_hours,
        created_by=str(admin.id),
    )
    try:
        await container.insert()
    except Exception as exc:
        if "E11000" in str(exc) or "duplicate key" in str(exc).lower():
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Sync for this folder already exists"
            ) from exc
        raise
    logger.info(
        "Synced container created",
        extra={"container_id": container.container_id, "connection_id": connection_id},
    )
    return {"container_id": container.container_id, "status": container.status}


@router.get("/{connection_id}/syncs")
async def list_syncs(
    connection_id: str,
    admin: TrainingUser = Depends(require_training_admin),
):
    await _resolve_conn(connection_id, admin.partner_id)
    containers = await SyncedContainer.find(
        {"connection_id": connection_id, "partner_id": admin.partner_id}
    ).sort("-created_at").to_list()
    return [
        {
            "container_id": c.container_id,
            "folder_path": c.folder_path,
            "provider_folder_ref": c.provider_folder_ref,
            "status": c.status,
            "poll_interval_hours": c.poll_interval_hours,
            "last_poll_at": c.last_poll_at.isoformat() if c.last_poll_at else None,
            "created_at": c.created_at.isoformat(),
        }
        for c in containers
    ]


@router.patch("/syncs/{container_id}")
async def patch_sync(
    container_id: str,
    action: str = Query(..., pattern="^(pause|resume|remove)$"),
    admin: TrainingUser = Depends(require_training_admin),
):
    container = await SyncedContainer.find_one(
        {"container_id": container_id, "partner_id": admin.partner_id}
    )
    if not container:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Synced container not found")
    if action == "remove":
        await container.delete()
        logger.info("Synced container removed", extra={"container_id": container_id})
        return {"container_id": container_id, "status": "removed"}
    container.status = "active" if action == "resume" else "paused"
    container.updated_at = datetime.now(timezone.utc)
    await container.save()
    logger.info(
        "Synced container updated",
        extra={"container_id": container_id, "action": action, "status": container.status},
    )
    return {"container_id": container_id, "status": container.status}
