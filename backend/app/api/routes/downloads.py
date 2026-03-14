"""
Downloads API Routes
Manage user's downloaded content for offline viewing
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.models.content import Content, PodcastEpisode
from app.models.download import (
    Download,
    DownloadAdd,
    DownloadContentType,
    DownloadResponse,
    DownloadStatus,
)
from app.models.household import Household
from app.models.user import User

router = APIRouter()

_VIDEO_TYPES = {
    DownloadContentType.MOVIE,
    DownloadContentType.EPISODE,
    DownloadContentType.VOD,
}
_PODCAST_TYPES = {
    DownloadContentType.PODCAST,
    DownloadContentType.PODCAST_EPISODE,
}


async def _resolve_content_details(dl: Download) -> dict:
    """Look up title/thumbnail for a download record."""
    data = {
        "id": str(dl.id),
        "content_id": dl.content_id,
        "content_type": dl.content_type.value,
        "quality": dl.quality.value,
        "status": dl.status.value,
        "progress": dl.progress,
        "file_size": dl.file_size,
        "downloaded_at": dl.downloaded_at.isoformat(),
        "retry_count": dl.retry_count,
    }
    if dl.content_type in _VIDEO_TYPES:
        content = await Content.get(dl.content_id)
        if content:
            data["title"] = content.title
            data["thumbnail"] = content.thumbnail
    elif dl.content_type in _PODCAST_TYPES:
        episode = await PodcastEpisode.get(dl.content_id)
        if episode:
            data["title"] = episode.title
            data["thumbnail"] = episode.thumbnail
    elif dl.content_type == DownloadContentType.AUDIOBOOK:
        content = await Content.get(dl.content_id)
        if content:
            data["title"] = content.title
            data["thumbnail"] = content.thumbnail
    return data


async def _check_household_owner(user_id: str) -> None:
    """Raise 403 if user is not a household owner."""
    household = await Household.find_one({"owner_id": user_id})
    if not household:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Downloads require household owner access",
        )


@router.get("", response_model=List[DownloadResponse])
async def get_downloads(
    current_user: User = Depends(get_current_active_user),
):
    """Get user's downloaded items. Requires household owner."""
    await _check_household_owner(str(current_user.id))
    downloads = (
        await Download.find({"user_id": str(current_user.id)})
        .sort("-downloaded_at")
        .to_list()
    )
    result = []
    for dl in downloads:
        data = await _resolve_content_details(dl)
        result.append(DownloadResponse(**data))
    return result


@router.post("", status_code=status.HTTP_201_CREATED)
async def start_download(
    data: DownloadAdd,
    current_user: User = Depends(get_current_active_user),
):
    """Register a new download."""
    existing = await Download.find_one(
        {"user_id": str(current_user.id), "content_id": data.content_id}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Download already exists",
        )
    download = Download(
        user_id=str(current_user.id),
        content_id=data.content_id,
        content_type=data.content_type,
        quality=data.quality,
        status=DownloadStatus.PENDING,
        progress=0,
    )
    await download.insert()
    return {
        "message": "Download registered",
        "id": str(download.id),
        "status": download.status.value,
    }


@router.delete("/{download_id}")
async def delete_download(
    download_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete a downloaded item."""
    download = await Download.get(download_id)
    if not download or download.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Download not found",
        )
    await download.delete()
    return {"message": "Download deleted"}


@router.get("/check/{content_id}")
async def check_download(
    content_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Check if content is downloaded."""
    download = await Download.find_one(
        {
            "user_id": str(current_user.id),
            "content_id": content_id,
            "status": {"$in": [
                DownloadStatus.PENDING.value,
                DownloadStatus.COMPLETED.value,
            ]},
        }
    )
    return {
        "is_downloaded": download is not None,
        "download_id": str(download.id) if download else None,
    }
