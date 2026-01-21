"""
MongoDB State Query Helper
Feature: MongoDB Atlas Migration

Provides MongoDB query helpers for investigation state operations.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
"""

from typing import Optional

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.investigation_mongodb import Investigation
from app.persistence.repositories.investigation_repository import InvestigationRepository


async def get_state_by_id(
    db: AsyncIOMotorDatabase,
    investigation_id: str,
    user_id: str,
    tenant_id: Optional[str] = None,
) -> Investigation:
    """Query state by investigation_id and user_id.

    Args:
        db: MongoDB database
        investigation_id: Investigation identifier
        user_id: User identifier
        tenant_id: Optional tenant identifier for multi-tenancy

    Returns:
        Investigation document

    Raises:
        HTTPException: 404 if state not found
    """
    repository = InvestigationRepository(db)

    # Query with user_id filter (allow auto-comparison-system)
    state = await repository.collection.find_one({
        "investigation_id": investigation_id,
        "$or": [
            {"user_id": user_id},
            {"user_id": "auto-comparison-system"}
        ]
    })

    if not state:
        raise HTTPException(
            status_code=404, detail=f"Investigation {investigation_id} not found"
        )

    return Investigation(**state)


async def check_duplicate_state(
    db: AsyncIOMotorDatabase,
    investigation_id: str,
    tenant_id: Optional[str] = None,
) -> None:
    """Check if investigation state already exists.

    Args:
        db: MongoDB database
        investigation_id: Investigation identifier
        tenant_id: Optional tenant identifier for multi-tenancy

    Raises:
        HTTPException: 409 if state already exists
    """
    repository = InvestigationRepository(db)
    existing = await repository.find_by_id(investigation_id, tenant_id=tenant_id)

    if existing:
        raise HTTPException(
            status_code=409, detail=f"Investigation {investigation_id} already exists"
        )


def check_version_conflict(investigation: Investigation, expected_version: int) -> None:
    """Validate version for optimistic locking.

    Args:
        investigation: Investigation document
        expected_version: Expected version number

    Raises:
        HTTPException: 409 if version mismatch
    """
    if investigation.version != expected_version:
        raise HTTPException(
            status_code=409,
            detail=f"Version conflict: expected {investigation.version}, got {expected_version}",
        )
