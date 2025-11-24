"""
Hybrid Graph Investigations Router
Feature: 006-hybrid-graph-integration

FastAPI router for hybrid graph investigation endpoints.
Handles investigation creation, status polling, and results retrieval.

SYSTEM MANDATE Compliance:
- Configuration-driven: Uses hybrid_graph_config
- Schema-locked: No DDL, uses existing database
- Complete implementation: No placeholders or TODOs
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict
import uuid
from datetime import datetime

from app.schemas.investigation_config import InvestigationConfigSchema
from app.schemas.investigation_status import InvestigationStatusSchema
from app.schemas.investigation_results import InvestigationResultsSchema
from app.security.auth import User, require_write, require_read
from app.service.logging import get_bridge_logger

hybrid_graph_router = APIRouter()
logger = get_bridge_logger(__name__)


@hybrid_graph_router.post("/investigations", status_code=status.HTTP_201_CREATED)
async def create_hybrid_graph_investigation(
    config: InvestigationConfigSchema,
    current_user: User = Depends(require_write)
) -> Dict[str, str]:
    """
    Create new hybrid graph investigation.

    Validates configuration, creates database record, and triggers hybrid graph execution.

    Args:
        config: Investigation configuration (entity, time range, tools)
        current_user: Authenticated user from JWT token

    Returns:
        Dictionary with investigation_id

    Raises:
        HTTPException: 400 for validation errors, 500 for internal errors
    """
    try:
        from app.router.controllers.hybrid_graph_investigation_controller import InvestigationController
        from config.hybrid_graph_config import get_hybrid_graph_config

        hg_config = get_hybrid_graph_config()

        if not hg_config.feature_enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Hybrid graph investigations are currently disabled"
            )

        controller = InvestigationController()
        investigation_id = await controller.create_investigation(
            config=config,
            user_id=current_user.user_id
        )

        logger.info(
            f"Created hybrid graph investigation",
            extra={
                "investigation_id": investigation_id,
                "user_id": current_user.user_id,
                "entity_type": config.entity_type,
                "entity_id": config.entity_id
            }
        )

        return {"investigation_id": investigation_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to create investigation: {str(e)}",
            exc_info=True,
            extra={"user_id": current_user.user_id}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create investigation: {str(e)}"
        )


@hybrid_graph_router.get("/investigations/{investigation_id}/status")
async def get_investigation_status(
    investigation_id: str,
    current_user: User = Depends(require_read)
) -> InvestigationStatusSchema:
    """
    Get investigation status for polling.

    Returns current execution phase, progress, agent status, and logs.
    Response is cached for 2 seconds to reduce database load.

    Args:
        investigation_id: Investigation unique identifier
        current_user: Authenticated user from JWT token

    Returns:
        Investigation status with progress and agent details

    Raises:
        HTTPException: 404 if investigation not found
    """
    try:
        from app.router.controllers.hybrid_graph_status_controller import CachedHybridGraphStatusController
        from app.db import get_db_session

        controller = CachedHybridGraphStatusController()

        with get_db_session() as db:
            status_response = await controller.get_status(
                investigation_id=investigation_id,
                user_id=current_user.user_id,
                db=db
            )

        return status_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to fetch status for investigation {investigation_id}: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch investigation status: {str(e)}"
        )


@hybrid_graph_router.get("/investigations/{investigation_id}/results")
async def get_investigation_results(
    investigation_id: str,
    current_user: User = Depends(require_read)
) -> InvestigationResultsSchema:
    """
    Get final investigation results.

    Returns comprehensive results including risk score, findings, evidence, and agent decisions.
    Only available after investigation completes.

    Args:
        investigation_id: Investigation unique identifier
        current_user: Authenticated user from JWT token

    Returns:
        Complete investigation results

    Raises:
        HTTPException: 404 if not found, 409 if not completed
    """
    try:
        from app.router.controllers.investigation_results_controller import InvestigationResultsController

        controller = InvestigationResultsController()
        results = await controller.get_results(
            investigation_id=investigation_id,
            user_id=current_user.user_id
        )

        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to fetch results for investigation {investigation_id}: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch investigation results: {str(e)}"
        )
