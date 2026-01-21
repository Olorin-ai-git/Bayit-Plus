"""
Monitored folders management endpoints.

Handles folder watching for automatic content upload.
"""

import asyncio
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.admin_uploads.dependencies import has_permission
from app.models.admin import Permission
from app.models.upload import (MonitoredFolderCreate, MonitoredFolderResponse,
                               MonitoredFolderUpdate)
from app.models.user import User
from app.services.folder_monitor_service import folder_monitor_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/uploads/monitored-folders")
async def get_monitored_folders(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
) -> List[MonitoredFolderResponse]:
    """Get all monitored folders."""
    try:
        folders = await folder_monitor_service.get_all_monitored_folders()
        return [MonitoredFolderResponse.from_orm(f) for f in folders]

    except Exception as e:
        logger.error(f"Failed to get monitored folders: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get monitored folders: {str(e)}",
        )


@router.post("/uploads/monitored-folders")
async def add_monitored_folder(
    folder: MonitoredFolderCreate,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Add a new monitored folder."""
    try:
        created = await folder_monitor_service.add_monitored_folder(
            path=folder.path,
            content_type=folder.content_type,
            name=folder.name,
            auto_upload=folder.auto_upload,
            recursive=folder.recursive,
            file_patterns=folder.file_patterns,
            exclude_patterns=folder.exclude_patterns,
            scan_interval=folder.scan_interval,
            user_id=str(current_user.id),
        )

        return MonitoredFolderResponse.from_orm(created)

    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to add monitored folder: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add monitored folder: {str(e)}",
        )


@router.put("/uploads/monitored-folders/{folder_id}")
async def update_monitored_folder(
    folder_id: str,
    updates: MonitoredFolderUpdate,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Update a monitored folder."""
    try:
        updated = await folder_monitor_service.update_monitored_folder(
            folder_id=folder_id, **updates.dict(exclude_unset=True)
        )

        return MonitoredFolderResponse.from_orm(updated)

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update monitored folder: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update monitored folder: {str(e)}",
        )


@router.delete("/uploads/monitored-folders/{folder_id}")
async def remove_monitored_folder(
    folder_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Remove a monitored folder."""
    try:
        success = await folder_monitor_service.remove_monitored_folder(folder_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Folder not found: {folder_id}",
            )

        return {"status": "removed", "folder_id": folder_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove monitored folder: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove monitored folder: {str(e)}",
        )


@router.post("/uploads/scan-now")
async def scan_monitored_folders_now(
    folder_id: Optional[str] = None,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Trigger an immediate scan of monitored folders (background process)."""
    try:
        # Start scan in background to avoid blocking the API
        if folder_id:
            # Scan specific folder in background
            asyncio.create_task(
                folder_monitor_service.scan_folder_immediately(folder_id)
            )
            logger.info(f"Started background scan for folder: {folder_id}")
            return {
                "success": True,
                "message": "Folder scan started in background",
                "folder_id": folder_id,
            }
        else:
            # Scan all folders in background
            asyncio.create_task(folder_monitor_service.scan_and_enqueue())
            logger.info("Started background scan for all monitored folders")
            return {
                "success": True,
                "message": "Scan started in background for all monitored folders",
                "files_found": 0,  # Will be counted in background
            }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to start folder scan: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start folder scan: {str(e)}",
        )


@router.post("/uploads/reset-cache")
async def reset_folder_cache(
    folder_id: Optional[str] = None,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Reset the 'known files' cache for monitored folders.
    This is useful when files were previously scanned but need to be rescanned
    (e.g., after a drive was disconnected and reconnected).

    Args:
        folder_id: Optional - clear cache for specific folder. If omitted, clears all.
    """
    try:
        # Get count before clearing
        count_before = folder_monitor_service.get_known_files_count(folder_id)

        # Clear the cache
        folder_monitor_service.clear_known_files_cache(folder_id)

        if folder_id:
            return {
                "success": True,
                "message": f"Cache cleared for folder {folder_id}",
                "files_cleared": count_before,
                "folder_id": folder_id,
            }
        else:
            return {
                "success": True,
                "message": "Cache cleared for all monitored folders",
                "files_cleared": count_before,
            }

    except Exception as e:
        logger.error(f"Failed to clear folder cache: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear cache: {str(e)}",
        )
