"""
Downloads Actions API Routes
Pause, resume, batch, and stats endpoints for download management.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.models.download import (
    Download,
    DownloadBatchAdd,
    DownloadStatsResponse,
    DownloadStatus,
)
from app.models.user import User

router = APIRouter()

_PAUSABLE = {DownloadStatus.DOWNLOADING, DownloadStatus.PENDING}


@router.patch("/{download_id}/pause")
async def pause_download(
    download_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Pause an active download."""
    download = await Download.get(download_id)
    if not download or download.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Download not found",
        )
    if download.status not in _PAUSABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot pause download with status '{download.status.value}'",
        )
    download.status = DownloadStatus.PAUSED
    await download.save()
    return {
        "message": "Download paused",
        "id": str(download.id),
        "status": download.status.value,
    }


@router.patch("/{download_id}/resume")
async def resume_download(
    download_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Resume a paused download."""
    download = await Download.get(download_id)
    if not download or download.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Download not found",
        )
    if download.status != DownloadStatus.PAUSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resume download with status '{download.status.value}'",
        )
    download.status = DownloadStatus.DOWNLOADING
    await download.save()
    return {
        "message": "Download resumed",
        "id": str(download.id),
        "status": download.status.value,
    }


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def batch_download(
    data: DownloadBatchAdd,
    current_user: User = Depends(get_current_active_user),
):
    """Register multiple downloads (collection queue)."""
    user_id = str(current_user.id)
    created: List[dict] = []
    skipped: List[dict] = []

    for item in data.items:
        existing = await Download.find_one(
            {"user_id": user_id, "content_id": item.content_id}
        )
        if existing:
            skipped.append({
                "content_id": item.content_id,
                "reason": "already_exists",
            })
            continue
        download = Download(
            user_id=user_id,
            content_id=item.content_id,
            content_type=item.content_type,
            quality=item.quality,
            status=DownloadStatus.PENDING,
            progress=0,
        )
        await download.insert()
        created.append({
            "id": str(download.id),
            "content_id": item.content_id,
            "status": download.status.value,
        })

    return {
        "message": "Batch registered",
        "created": created,
        "skipped": skipped,
    }


@router.get("/stats", response_model=DownloadStatsResponse)
async def get_download_stats(
    current_user: User = Depends(get_current_active_user),
):
    """Get download statistics for current user."""
    user_id = str(current_user.id)
    downloads = await Download.find({"user_id": user_id}).to_list()

    total_size_bytes = 0
    by_status: dict[str, int] = {}

    for dl in downloads:
        total_size_bytes += dl.file_size or 0
        status_val = dl.status.value if hasattr(dl.status, "value") else dl.status
        by_status[status_val] = by_status.get(status_val, 0) + 1

    return DownloadStatsResponse(
        total_count=len(downloads),
        total_size_bytes=total_size_bytes,
        by_status=by_status,
    )
