"""
Database Maintenance Admin API

Provides admin endpoints for database cleanup and maintenance tasks.
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.routes.admin.auth import require_admin
from app.models.user import User
from app.services.culture_cleanup_service import culture_cleanup_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/database/cleanup/culture-cities")
async def cleanup_duplicate_culture_cities(
    dry_run: bool = Query(
        True, description="If true, simulate cleanup without making changes"
    ),
    current_user: User = Depends(require_admin()),
) -> Dict[str, Any]:
    """
    Clean up duplicate culture city entries.

    Finds and removes duplicate CultureCity documents that have the same
    (culture_id, city_id) combination, keeping only the oldest entry.

    **Admin only.** Requires admin authentication.

    Args:
        dry_run: If True, only simulate the cleanup (default: True)
        current_user: Authenticated admin user

    Returns:
        Cleanup report with statistics and details

    Example response:
    ```json
    {
        "status": "success",
        "message": "All duplicates successfully removed",
        "total_duplicates_found": 2,
        "total_documents_removed": 3,
        "dry_run": false,
        "timestamp": "2026-01-28T12:00:00Z",
        "details": [
            {
                "key": "israeli:jerusalem",
                "culture_id": "israeli",
                "city_id": "jerusalem",
                "total_duplicates": 3,
                "kept": {
                    "id": "507f1f77bcf86cd799439011",
                    "name": "Jerusalem",
                    "created_at": "2026-01-01T00:00:00Z"
                },
                "removed": [
                    {
                        "id": "507f1f77bcf86cd799439012",
                        "name": "Jerusalem",
                        "created_at": "2026-01-15T00:00:00Z"
                    }
                ]
            }
        ],
        "verification": {
            "has_duplicates": false,
            "total_cities": 10,
            "unique_keys": 10,
            "duplicate_count": 0
        }
    }
    ```
    """
    try:
        logger.info(
            f"Admin {current_user.email} triggered culture cities cleanup (dry_run={dry_run})"
        )

        # Run cleanup
        result = await culture_cleanup_service.cleanup_duplicate_cities(dry_run=dry_run)

        logger.info(f"Cleanup completed: {result['status']}")
        return result

    except Exception as e:
        logger.error(f"Culture cities cleanup failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Cleanup failed: {str(e)}"
        )


@router.get("/database/verify/culture-cities")
async def verify_culture_cities_integrity(
    current_user: User = Depends(require_admin()),
) -> Dict[str, Any]:
    """
    Verify culture cities data integrity.

    Checks for duplicate (culture_id, city_id) combinations
    without making any changes.

    **Admin only.** Requires admin authentication.

    Args:
        current_user: Authenticated admin user

    Returns:
        Verification report

    Example response:
    ```json
    {
        "has_duplicates": true,
        "total_cities": 12,
        "unique_keys": 10,
        "duplicate_count": 2,
        "timestamp": "2026-01-28T12:00:00Z"
    }
    ```
    """
    try:
        logger.info(f"Admin {current_user.email} requested culture cities verification")

        # Verify integrity
        result = await culture_cleanup_service.verify_no_duplicates()

        return result

    except Exception as e:
        logger.error(f"Culture cities verification failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Verification failed: {str(e)}"
        )


@router.get("/database/duplicates/culture-cities")
async def find_duplicate_culture_cities(
    current_user: User = Depends(require_admin()),
) -> Dict[str, Any]:
    """
    Find duplicate culture city entries.

    Returns detailed information about all duplicate entries
    without making any changes.

    **Admin only.** Requires admin authentication.

    Args:
        current_user: Authenticated admin user

    Returns:
        Dictionary with duplicate entries details

    Example response:
    ```json
    {
        "total_duplicates": 2,
        "duplicates": {
            "israeli:jerusalem": [
                {
                    "id": "507f1f77bcf86cd799439011",
                    "name": "Jerusalem",
                    "culture_id": "israeli",
                    "city_id": "jerusalem",
                    "created_at": "2026-01-01T00:00:00Z"
                },
                {
                    "id": "507f1f77bcf86cd799439012",
                    "name": "Jerusalem",
                    "culture_id": "israeli",
                    "city_id": "jerusalem",
                    "created_at": "2026-01-15T00:00:00Z"
                }
            ]
        }
    }
    ```
    """
    try:
        logger.info(f"Admin {current_user.email} requested duplicate culture cities list")

        # Find duplicates
        duplicates = await culture_cleanup_service.find_duplicate_cities()

        # Format response
        formatted_duplicates = {}
        for key, cities in duplicates.items():
            formatted_duplicates[key] = [
                {
                    "id": str(city.id),
                    "name": city.name,
                    "culture_id": city.culture_id,
                    "city_id": city.city_id,
                    "created_at": city.created_at.isoformat(),
                    "is_active": city.is_active,
                    "is_featured": city.is_featured,
                }
                for city in cities
            ]

        return {
            "total_duplicates": len(duplicates),
            "duplicates": formatted_duplicates,
        }

    except Exception as e:
        logger.error(f"Finding duplicate culture cities failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Finding duplicates failed: {str(e)}"
        )
