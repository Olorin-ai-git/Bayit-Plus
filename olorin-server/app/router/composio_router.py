"""
Composio API Router
Feature: 001-composio-tools-integration

Provides REST API endpoints for Composio OAuth flows and connection management:
- OAuth initiation and callback handling
- Connection listing and management
- Connection testing
- Tenant-scoped operations

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from starlette.requests import Request

from app.persistence.database import get_db
from app.service.composio.oauth_manager import OAuthManager
from app.service.composio.action_executor import ActionExecutor
from app.service.composio.exceptions import (
    ComposioError,
    ComposioOAuthError,
    ComposioConnectionError,
    ComposioActionError
)
from app.models.composio_connection import ComposioConnection
from app.security.auth import User, require_read, require_write

router = APIRouter(
    prefix="/api/composio",
    tags=["Composio"],
    responses={
        404: {"description": "Not found"},
        400: {"description": "Bad request"},
        401: {"description": "Unauthorized"},
    },
)


# Request/Response Models
class OAuthInitiateRequest(BaseModel):
    redirect_uri: str
    scopes: Optional[List[str]] = None


class OAuthCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None


class TestConnectionRequest(BaseModel):
    toolkit: str
    action: str
    parameters: Dict[str, Any]


class ConnectionResponse(BaseModel):
    id: str
    tenant_id: str
    toolkit_name: str
    connection_id: str
    status: str
    expires_at: Optional[str] = None
    created_at: str
    updated_at: str
    last_used_at: Optional[str] = None


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
    # Extract tenant_id from user scopes (format: "tenant:{tenant_id}")
    tenant_scope = next((s for s in current_user.scopes if s.startswith("tenant:")), None)
    if tenant_scope:
        return tenant_scope.split(":", 1)[1]
    
    # Check user record for tenant_id attribute
    tenant_id = getattr(current_user, 'tenant_id', None)
    if tenant_id:
        return tenant_id
    
    # If tenant_id cannot be determined, raise error
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Tenant ID could not be determined from user context."
    )


def get_oauth_manager() -> OAuthManager:
    """Dependency for OAuthManager."""
    return OAuthManager()


def get_action_executor() -> ActionExecutor:
    """Dependency for ActionExecutor."""
    return ActionExecutor()


@router.post(
    "/connect/{toolkit}",
    response_model=Dict[str, str],
    summary="Initiate OAuth flow",
    description="Generate OAuth authorization URL for connecting a toolkit"
)
async def initiate_oauth(
    toolkit: str,
    request: OAuthInitiateRequest,
    current_user: User = Depends(require_write),
    oauth_manager: OAuthManager = Depends(get_oauth_manager),
) -> Dict[str, str]:
    """
    Initiate OAuth flow for a toolkit.
    
    Returns OAuth authorization URL that user should redirect to.
    """
    tenant_id = get_tenant_id(current_user)
    
    try:
        oauth_url = oauth_manager.initiate_oauth(
            toolkit=toolkit,
            tenant_id=tenant_id,
            redirect_uri=request.redirect_uri,
            scopes=request.scopes or []
        )
        
        return {
            "oauth_url": oauth_url,
            "toolkit": toolkit,
            "tenant_id": tenant_id
        }
    except ComposioOAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e


@router.get(
    "/callback",
    response_model=ConnectionResponse,
    summary="OAuth callback handler",
    description="Process OAuth callback and store connection"
)
async def oauth_callback(
    toolkit: str = Query(..., description="Toolkit name"),
    code: str = Query(..., description="Authorization code"),
    state: Optional[str] = Query(None, description="State parameter"),
    redirect_uri: str = Query(..., description="Redirect URI used in OAuth flow"),
    current_user: User = Depends(require_write),
    oauth_manager: OAuthManager = Depends(get_oauth_manager),
) -> ConnectionResponse:
    """
    Process OAuth callback and store connection.
    
    This endpoint is called by Composio after user authorizes the connection.
    """
    tenant_id = get_tenant_id(current_user)
    
    try:
        connection = oauth_manager.process_callback(
            toolkit=toolkit,
            code=code,
            redirect_uri=redirect_uri,
            tenant_id=tenant_id,
            state=state
        )
        
        return ConnectionResponse(**connection.to_dict())
    except ComposioOAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e


@router.get(
    "/connections",
    response_model=List[ConnectionResponse],
    summary="List connections",
    description="List all Composio connections for the tenant"
)
async def list_connections(
    toolkit: Optional[str] = Query(None, description="Filter by toolkit name"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(require_read),
    db: Session = Depends(get_db),
) -> List[ConnectionResponse]:
    """
    List all Composio connections for the tenant.
    
    Optionally filter by toolkit or status.
    """
    tenant_id = get_tenant_id(current_user)
    
    from sqlalchemy import and_
    query = db.query(ComposioConnection).filter(
        ComposioConnection.tenant_id == tenant_id
    )
    
    if toolkit:
        query = query.filter(ComposioConnection.toolkit_name == toolkit)
    if status_filter:
        query = query.filter(ComposioConnection.status == status_filter)
    
    connections = query.all()
    return [ConnectionResponse(**conn.to_dict()) for conn in connections]


@router.get(
    "/connections/{connection_id}",
    response_model=ConnectionResponse,
    summary="Get connection",
    description="Get connection details by ID"
)
async def get_connection(
    connection_id: str,
    current_user: User = Depends(require_read),
    db: Session = Depends(get_db),
) -> ConnectionResponse:
    """Get connection details by ID."""
    tenant_id = get_tenant_id(current_user)
    
    from sqlalchemy import and_
    connection = db.query(ComposioConnection).filter(
        and_(
            ComposioConnection.connection_id == connection_id,
            ComposioConnection.tenant_id == tenant_id
        )
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection {connection_id} not found"
        )
    
    return ConnectionResponse(**connection.to_dict())


@router.delete(
    "/connections/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete connection",
    description="Delete a Composio connection"
)
async def delete_connection(
    connection_id: str,
    current_user: User = Depends(require_write),
    db: Session = Depends(get_db),
):
    """Delete a Composio connection."""
    tenant_id = get_tenant_id(current_user)
    
    from sqlalchemy import and_
    connection = db.query(ComposioConnection).filter(
        and_(
            ComposioConnection.connection_id == connection_id,
            ComposioConnection.tenant_id == tenant_id
        )
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection {connection_id} not found"
        )
    
    # Update status to revoked instead of deleting (for audit trail)
    connection.status = 'revoked'
    db.commit()


@router.post(
    "/test-connection/{connection_id}",
    response_model=Dict[str, Any],
    summary="Test connection",
    description="Test a connection by executing a test action"
)
async def test_connection(
    connection_id: str,
    request: TestConnectionRequest,
    current_user: User = Depends(require_write),
    action_executor: ActionExecutor = Depends(get_action_executor),
) -> Dict[str, Any]:
    """
    Test a connection by executing a test action.
    
    Common test actions:
    - stripe: "get_account" (no parameters)
    - shopify: "get_shop_info" (no parameters)
    - okta: "get_user" (parameters: {"user_id": "..."})
    """
    tenant_id = get_tenant_id(current_user)
    
    try:
        result = action_executor.execute_action(
            toolkit=request.toolkit,
            action=request.action,
            connection_id=connection_id,
            parameters=request.parameters,
            tenant_id=tenant_id
        )
        
        return {
            "success": True,
            "result": result,
            "connection_id": connection_id,
            "toolkit": request.toolkit,
            "action": request.action
        }
    except ComposioConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except ComposioActionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e


@router.get(
    "/toolkits",
    response_model=List[Dict[str, Any]],
    summary="List toolkits",
    description="List available Composio toolkits"
)
async def list_toolkits(
    current_user: User = Depends(require_read),
    oauth_manager: OAuthManager = Depends(get_oauth_manager),
) -> List[Dict[str, Any]]:
    """List available Composio toolkits."""
    try:
        toolkits = oauth_manager.composio_client.list_toolkits()
        return toolkits
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list toolkits: {e}"
        ) from e


@router.get(
    "/toolkits/{toolkit}/actions",
    response_model=List[Dict[str, Any]],
    summary="List toolkit actions",
    description="List available actions for a toolkit"
)
async def list_toolkit_actions(
    toolkit: str,
    current_user: User = Depends(require_read),
    oauth_manager: OAuthManager = Depends(get_oauth_manager),
) -> List[Dict[str, Any]]:
    """List available actions for a toolkit."""
    try:
        actions = oauth_manager.composio_client.list_actions(toolkit=toolkit)
        return actions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list actions: {e}"
        ) from e


@router.post(
    "/soar-action",
    response_model=Dict[str, Any],
    summary="SOAR webhook endpoint",
    description="Receive SOAR playbook action requests and execute Composio actions"
)
async def soar_action_webhook(
    request: Request,
    current_user: Optional[User] = Depends(require_write),
) -> Dict[str, Any]:
    """
    SOAR webhook endpoint for executing Composio actions.
    
    This endpoint is called by SOAR playbooks to execute Composio actions.
    It validates the webhook signature and executes the requested action.
    """
    from app.service.soar.composio_integration import ComposioIntegration
    
    tenant_id = get_tenant_id(current_user) if current_user else None
    
    # Get request body
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON payload: {e}"
        ) from e
    
    # Get signature header
    signature = request.headers.get("X-SOAR-Signature")
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing SOAR signature header"
        )
    
    # Validate signature
    composio_integration = ComposioIntegration()
    import json
    payload_str = json.dumps(body, sort_keys=True)
    
    if not composio_integration.validate_soar_signature(payload_str, signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SOAR signature"
        )
    
    # Extract action details
    toolkit = body.get("toolkit")
    action = body.get("action")
    connection_id = body.get("connection_id")
    parameters = body.get("parameters", {})
    execution_id = body.get("execution_id")
    
    if not all([toolkit, action, connection_id]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields: toolkit, action, connection_id"
        )
    
    # Execute action
    result = await composio_integration.execute_soar_action(
        toolkit=toolkit,
        action=action,
        connection_id=connection_id,
        parameters=parameters,
        tenant_id=tenant_id or body.get("tenant_id", "unknown"),
        execution_id=execution_id
    )
    
    return result

