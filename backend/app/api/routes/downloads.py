"""
Downloads API Routes
Manage user's downloaded content for offline viewing
"""

from datetime import datetime
from typing import List, Optional

from beanie import Document
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_active_user
from app.models.content import Content, Podcast
from app.models.user import User


# Download model
class Download(Document):
    user_id: str
    content_id: str
    content_type: str  # vod, podcast_episode
    quality: str = "hd"  # sd, hd, fhd
    status: str = "completed"  # pending, downloading, completed, failed
    progress: int = 100  # Download progress percentage
    file_size: Optional[int] = None  # Size in bytes
    downloaded_at: datetime = datetime.utcnow()
    expires_at: Optional[datetime] = None  # For DRM content

    class Settings:
        name = "downloads"
        indexes = [
            [("user_id", 1), ("content_id", 1)],
            "user_id",
        ]


class DownloadAdd(BaseModel):
    content_id: str
    content_type: str  # vod, podcast_episode
    quality: str = "hd"


class DownloadResponse(BaseModel):
    id: str
    content_id: str
    content_type: str
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    quality: str
    status: str
    progress: int
    file_size: Optional[int] = None
    downloaded_at: str


router = APIRouter()


@router.get("", response_model=List[DownloadResponse])
async def get_downloads(
    current_user: User = Depends(get_current_active_user),
):
    """Get user's downloaded items."""
    downloads = (
        await Download.find(Download.user_id == str(current_user.id))
        .sort("-downloaded_at")
        .to_list()
    )

    result = []
    for dl in downloads:
        content_data = {
            "id": str(dl.id),
            "content_id": dl.content_id,
            "content_type": dl.content_type,
            "quality": dl.quality,
            "status": dl.status,
            "progress": dl.progress,
            "file_size": dl.file_size,
            "downloaded_at": dl.downloaded_at.isoformat(),
        }

        # Fetch content details
        if dl.content_type == "vod":
            content = await Content.get(dl.content_id)
            if content:
                content_data["title"] = content.title
                content_data["thumbnail"] = content.thumbnail
        elif dl.content_type == "podcast_episode":
            # For podcast episodes, we'd need the episode model
            content_data["title"] = f"Podcast Episode {dl.content_id[:8]}"

        result.append(DownloadResponse(**content_data))

    return result


@router.post("")
async def start_download(
    data: DownloadAdd,
    current_user: User = Depends(get_current_active_user),
):
    """Start a new download."""
    # Check if already downloaded
    existing = await Download.find_one(
        Download.user_id == str(current_user.id),
        Download.content_id == data.content_id,
    )
    if existing:
        return {
            "message": "Already downloaded",
            "id": str(existing.id),
            "status": existing.status,
        }

    # Create download record
    download = Download(
        user_id=str(current_user.id),
        content_id=data.content_id,
        content_type=data.content_type,
        quality=data.quality,
        status="completed",  # In a real app, this would start as "pending"
        progress=100,
    )
    await download.insert()

    return {
        "message": "Download started",
        "id": str(download.id),
        "status": download.status,
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
        Download.user_id == str(current_user.id),
        Download.content_id == content_id,
        Download.status == "completed",
    )
    return {
        "is_downloaded": download is not None,
        "download_id": str(download.id) if download else None,
    }
