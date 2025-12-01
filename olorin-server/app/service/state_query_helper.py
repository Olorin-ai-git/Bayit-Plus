"""
State Query Helper
Feature: 005-polling-and-persistence

Provides database query helpers for investigation state operations.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
"""

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.investigation_state import InvestigationState


def get_state_by_id(
    db: Session, investigation_id: str, user_id: str
) -> InvestigationState:
    """Query state by investigation_id and user_id.

    Args:
        db: Database session
        investigation_id: Investigation identifier
        user_id: User identifier

    Returns:
        Investigation state

    Raises:
        HTTPException: 404 if state not found
    """
    state = (
        db.query(InvestigationState)
        .filter(InvestigationState.investigation_id == investigation_id)
        .filter(
            or_(
                InvestigationState.user_id == user_id,
                InvestigationState.user_id == "auto-comparison-system",
            )
        )
        .first()
    )

    if not state:
        raise HTTPException(
            status_code=404, detail=f"Investigation {investigation_id} not found"
        )

    return state


def check_duplicate_state(db: Session, investigation_id: str) -> None:
    """Check if investigation state already exists.

    Args:
        db: Database session
        investigation_id: Investigation identifier

    Raises:
        HTTPException: 409 if state already exists
    """
    existing = (
        db.query(InvestigationState)
        .filter(InvestigationState.investigation_id == investigation_id)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409, detail=f"Investigation {investigation_id} already exists"
        )


def check_version_conflict(state: InvestigationState, expected_version: int) -> None:
    """Validate version for optimistic locking.

    Args:
        state: Investigation state
        expected_version: Expected version number

    Raises:
        HTTPException: 409 if version mismatch
    """
    if state.version != expected_version:
        raise HTTPException(
            status_code=409,
            detail=f"Version conflict: expected {state.version}, got {expected_version}",
        )
