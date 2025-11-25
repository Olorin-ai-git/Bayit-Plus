"""
Tenant Configuration API Router
Feature: 001-composio-tools-integration

Provides REST API endpoints for tenant configuration:
- Device fingerprint SDK selection
- Graph database selection
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.persistence.database import get_db
from app.security.auth import User, require_read, require_write

router = APIRouter(
    prefix="/api/tenants",
    tags=["Tenant Configuration"],
    responses={
        404: {"description": "Not found"},
        400: {"description": "Bad request"},
    },
)


# Request/Response Models
class DeviceSDKConfig(BaseModel):
    sdk_provider: str  # 'fingerprint_pro', 'seon', 'ipqs'


class GraphDBConfig(BaseModel):
    graph_provider: str  # 'neo4j', 'tigergraph'


def get_tenant_id(current_user: User) -> str:
    """Extract tenant_id from user context."""
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


# TODO: Implement actual storage (PostgreSQL table or Redis)
# For now, using in-memory storage as placeholder
_tenant_configs: dict = {}


@router.get(
    "/{tenant_id}/device-sdk-config",
    response_model=DeviceSDKConfig,
    summary="Get device SDK configuration",
    description="Get tenant's device fingerprint SDK configuration",
)
async def get_device_sdk_config(
    tenant_id: str,
    current_user: User = Depends(require_read),
    db: Session = Depends(get_db),
) -> DeviceSDKConfig:
    """Get device SDK configuration for tenant."""
    # Verify tenant access
    user_tenant_id = get_tenant_id(current_user)
    if tenant_id != user_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this tenant"
        )

    # Get config from storage (placeholder - should use database)
    config = _tenant_configs.get(
        f"{tenant_id}:device_sdk", {"sdk_provider": "fingerprint_pro"}
    )

    return DeviceSDKConfig(**config)


@router.post(
    "/{tenant_id}/device-sdk-config",
    response_model=DeviceSDKConfig,
    summary="Update device SDK configuration",
    description="Update tenant's device fingerprint SDK configuration",
)
async def update_device_sdk_config(
    tenant_id: str,
    config: DeviceSDKConfig,
    current_user: User = Depends(require_write),
    db: Session = Depends(get_db),
) -> DeviceSDKConfig:
    """Update device SDK configuration for tenant."""
    # Verify tenant access
    user_tenant_id = get_tenant_id(current_user)
    if tenant_id != user_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this tenant"
        )

    # Validate SDK provider
    valid_providers = ["fingerprint_pro", "seon", "ipqs"]
    if config.sdk_provider not in valid_providers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid SDK provider. Must be one of: {', '.join(valid_providers)}",
        )

    # Store config (placeholder - should use database)
    _tenant_configs[f"{tenant_id}:device_sdk"] = config.dict()

    return config


@router.get(
    "/{tenant_id}/graph-db-config",
    response_model=GraphDBConfig,
    summary="Get graph database configuration",
    description="Get tenant's graph database configuration",
)
async def get_graph_db_config(
    tenant_id: str,
    current_user: User = Depends(require_read),
    db: Session = Depends(get_db),
) -> GraphDBConfig:
    """Get graph database configuration for tenant."""
    # Verify tenant access
    user_tenant_id = get_tenant_id(current_user)
    if tenant_id != user_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this tenant"
        )

    # Get config from storage (placeholder - should use database)
    config = _tenant_configs.get(f"{tenant_id}:graph_db", {"graph_provider": "neo4j"})

    return GraphDBConfig(**config)


@router.post(
    "/{tenant_id}/graph-db-config",
    response_model=GraphDBConfig,
    summary="Update graph database configuration",
    description="Update tenant's graph database configuration",
)
async def update_graph_db_config(
    tenant_id: str,
    config: GraphDBConfig,
    current_user: User = Depends(require_write),
    db: Session = Depends(get_db),
) -> GraphDBConfig:
    """Update graph database configuration for tenant."""
    # Verify tenant access
    user_tenant_id = get_tenant_id(current_user)
    if tenant_id != user_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this tenant"
        )

    # Validate graph provider
    valid_providers = ["neo4j", "tigergraph"]
    if config.graph_provider not in valid_providers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid graph provider. Must be one of: {', '.join(valid_providers)}",
        )

    # Store config (placeholder - should use database)
    _tenant_configs[f"{tenant_id}:graph_db"] = config.dict()

    return config
