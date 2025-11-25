"""
SOAR Playbooks API Router
Feature: 001-composio-tools-integration

Provides REST API endpoints for SOAR playbook execution:
- Execute playbooks
- Get execution status
- Tenant-scoped operations

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.security.auth import User, require_read, require_write
from app.service.soar.composio_integration import ComposioIntegration
from app.service.soar.playbook_executor import PlaybookExecutor

router = APIRouter(
    prefix="/api/soar/playbooks",
    tags=["SOAR Playbooks"],
    responses={
        404: {"description": "Not found"},
        400: {"description": "Bad request"},
        401: {"description": "Unauthorized"},
    },
)


# Request/Response Models
class ExecutePlaybookRequest(BaseModel):
    playbook_id: str
    investigation_id: Optional[str] = None
    anomaly_id: Optional[str] = None
    trigger_reason: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class PlaybookExecutionResponse(BaseModel):
    id: str
    playbook_id: str
    investigation_id: Optional[str]
    anomaly_id: Optional[str]
    tenant_id: str
    status: str
    trigger_reason: Optional[str]
    started_at: str
    completed_at: Optional[str] = None
    actions_executed: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


def get_tenant_id(current_user: User) -> str:
    """
    Extract tenant_id from user context.

    Args:
        current_user: Authenticated user

    Returns:
        Tenant ID

    Raises:
        HTTPException: If tenant_id cannot be determined
    """
    tenant_scope = next(
        (s for s in current_user.scopes if s.startswith("tenant:")), None
    )
    if tenant_scope:
        return tenant_scope.split(":", 1)[1]

    tenant_id = getattr(current_user, "tenant_id", None)
    if tenant_id:
        return tenant_id

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Tenant ID could not be determined from user context.",
    )


def get_playbook_executor() -> PlaybookExecutor:
    """Dependency for PlaybookExecutor."""
    return PlaybookExecutor()


@router.post(
    "/execute",
    response_model=PlaybookExecutionResponse,
    summary="Execute SOAR playbook",
    description="Execute a SOAR playbook for fraud response automation",
)
async def execute_playbook(
    request: ExecutePlaybookRequest,
    current_user: User = Depends(require_write),
    executor: PlaybookExecutor = Depends(get_playbook_executor),
) -> PlaybookExecutionResponse:
    """
    Execute a SOAR playbook.

    This endpoint triggers a SOAR playbook execution, which can then
    call back to Composio actions via webhook.
    """
    tenant_id = get_tenant_id(current_user)

    try:
        execution = await executor.execute_playbook(
            playbook_id=request.playbook_id,
            investigation_id=request.investigation_id,
            anomaly_id=request.anomaly_id,
            tenant_id=tenant_id,
            trigger_reason=request.trigger_reason,
            context=request.context,
        )

        return PlaybookExecutionResponse(
            id=str(execution.id),
            playbook_id=execution.playbook_id,
            investigation_id=execution.investigation_id,
            anomaly_id=execution.anomaly_id,
            tenant_id=execution.tenant_id,
            status=execution.status,
            trigger_reason=execution.trigger_reason,
            started_at=execution.started_at.isoformat() if execution.started_at else "",
            completed_at=(
                execution.completed_at.isoformat() if execution.completed_at else None
            ),
            actions_executed=execution.actions_executed,
            error_message=execution.error_message,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute playbook: {e}",
        ) from e


@router.get(
    "/executions/{execution_id}",
    response_model=PlaybookExecutionResponse,
    summary="Get playbook execution status",
    description="Get the status of a SOAR playbook execution",
)
async def get_execution_status(
    execution_id: str,
    current_user: User = Depends(require_read),
    executor: PlaybookExecutor = Depends(get_playbook_executor),
) -> PlaybookExecutionResponse:
    """
    Get playbook execution status.

    This endpoint retrieves the current status of a playbook execution,
    including any actions executed and error messages.
    """
    tenant_id = get_tenant_id(current_user)

    execution = await executor.get_execution_status(execution_id, tenant_id)

    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution {execution_id} not found",
        )

    return PlaybookExecutionResponse(
        id=str(execution.id),
        playbook_id=execution.playbook_id,
        investigation_id=execution.investigation_id,
        anomaly_id=execution.anomaly_id,
        tenant_id=execution.tenant_id,
        status=execution.status,
        trigger_reason=execution.trigger_reason,
        started_at=execution.started_at.isoformat() if execution.started_at else "",
        completed_at=(
            execution.completed_at.isoformat() if execution.completed_at else None
        ),
        actions_executed=execution.actions_executed,
        error_message=execution.error_message,
    )
