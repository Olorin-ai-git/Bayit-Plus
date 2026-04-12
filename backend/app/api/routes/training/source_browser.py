"""Source browser and video import routes."""

from dataclasses import asdict
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import require_training_admin
from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.source_connection import SourceConnection
from app.models.training_user import TrainingUser
from app.services.olorin.source_connector import import_from_source
from app.services.olorin.source_helpers import get_provider, get_valid_token

logger = get_logger(__name__)
router = APIRouter(prefix="/source-browser", tags=["training-source-browser"])


class ImportRequest(BaseModel):
    video_ids: List[str] = Field(..., min_length=1)
    folder_path: str = Field(default="")


async def _resolve_conn(connection_id: str, partner_id: str) -> SourceConnection:
    conn = await SourceConnection.find_one(
        {"connection_id": connection_id, "partner_id": partner_id}
    )
    if not conn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Connection not found")
    if conn.status != "active":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Connection is {conn.status}")
    return conn


async def _existing_source_refs(
    partner_id: str, connection_id: str, video_ids: list[str]
) -> set[str]:
    if not video_ids:
        return set()
    docs = await Content.find(
        {"partner_id": partner_id, "source_connection_id": connection_id,
         "source_ref": {"$in": video_ids}},
    ).to_list()
    return {d.source_ref for d in docs}


# --- routes -----------------------------------------------------------------

@router.get("/{connection_id}/folders")
async def browse_folders(
    connection_id: str,
    parent_folder_id: Optional[str] = Query(default=None),
    page_token: Optional[str] = Query(default=None),
    admin: TrainingUser = Depends(require_training_admin),
):
    conn = await _resolve_conn(connection_id, admin.partner_id)
    page = await get_provider(conn).list_folders(
        await get_valid_token(conn),
        parent_folder_id=parent_folder_id,
        page_token=page_token,
    )
    return {"folders": [asdict(f) for f in page.items], "next_page_token": page.next_page_token}


@router.get("/{connection_id}/videos")
async def list_videos(
    connection_id: str,
    folder_id: str = Query(...),
    page_token: Optional[str] = Query(default=None),
    admin: TrainingUser = Depends(require_training_admin),
):
    conn = await _resolve_conn(connection_id, admin.partner_id)
    page = await get_provider(conn).list_videos(
        await get_valid_token(conn), folder_id=folder_id, page_token=page_token,
    )
    existing = await _existing_source_refs(
        admin.partner_id, connection_id, [v.video_id for v in page.items]
    )
    videos = [{**asdict(v), "already_imported": v.video_id in existing} for v in page.items]
    return {"videos": videos, "next_page_token": page.next_page_token}


@router.get("/{connection_id}/search")
async def search_videos(
    connection_id: str,
    q: str = Query(..., min_length=1),
    page_token: Optional[str] = Query(default=None),
    admin: TrainingUser = Depends(require_training_admin),
):
    conn = await _resolve_conn(connection_id, admin.partner_id)
    page = await get_provider(conn).search_videos(
        await get_valid_token(conn), query=q, page_token=page_token,
    )
    existing = await _existing_source_refs(
        admin.partner_id, connection_id, [v.video_id for v in page.items]
    )
    videos = [{**asdict(v), "already_imported": v.video_id in existing} for v in page.items]
    return {"videos": videos, "next_page_token": page.next_page_token}


@router.post("/{connection_id}/import", status_code=status.HTTP_202_ACCEPTED)
async def import_videos(
    connection_id: str,
    body: ImportRequest,
    background_tasks: BackgroundTasks,
    admin: TrainingUser = Depends(require_training_admin),
):
    await _resolve_conn(connection_id, admin.partner_id)
    existing = await _existing_source_refs(admin.partner_id, connection_id, body.video_ids)
    to_queue = [vid for vid in body.video_ids if vid not in existing]
    skipped = [vid for vid in body.video_ids if vid in existing]
    if to_queue:
        background_tasks.add_task(
            import_from_source,
            connection_id=connection_id,
            partner_id=admin.partner_id,
            video_ids=to_queue,
            folder_path=body.folder_path,
        )
    logger.info(
        "Import queued",
        extra={"connection_id": connection_id, "queued": len(to_queue),
               "skipped": len(skipped), "partner_id": admin.partner_id},
    )
    return {"queued": len(to_queue), "skipped": len(skipped)}
