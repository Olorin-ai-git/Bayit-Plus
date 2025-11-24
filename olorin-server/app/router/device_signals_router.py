"""
Device Signals API Router
Feature: 001-composio-tools-integration

Provides REST API endpoints for device fingerprint signal ingestion.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel

from app.models.device_signal import DeviceSignal, DeviceSignalCreate
from app.service.device_fingerprint.signal_processor import SignalProcessor
from app.service.device_fingerprint.sdk_manager import SDKManager
from app.security.auth import User, require_read, require_write

router = APIRouter(
    prefix="/api/device-signals",
    tags=["Device Signals"],
    responses={
        400: {"description": "Bad request"},
        401: {"description": "Unauthorized"},
    },
)


def get_tenant_id(current_user: User) -> str:
    """Extract tenant_id from user context."""
    tenant_scope = next((s for s in current_user.scopes if s.startswith("tenant:")), None)
    if tenant_scope:
        return tenant_scope.split(":", 1)[1]
    
    tenant_id = getattr(current_user, 'tenant_id', None)
    if tenant_id:
        return tenant_id
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Tenant ID could not be determined from user context."
    )


def get_signal_processor() -> SignalProcessor:
    """Dependency for SignalProcessor."""
    return SignalProcessor()


@router.post(
    "/",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Ingest device signal",
    description="Capture and persist device fingerprint signal from edge SDK"
)
async def ingest_device_signal(
    signal: DeviceSignalCreate,
    request: Request,
    current_user: User = Depends(require_write),
    processor: SignalProcessor = Depends(get_signal_processor),
) -> Dict[str, Any]:
    """
    Ingest device fingerprint signal from edge SDK.
    
    Validates signal, persists to Snowflake, and mirrors to Splunk.
    """
    tenant_id = get_tenant_id(current_user)
    
    try:
        # Convert to DeviceSignal model
        device_signal = DeviceSignal(
            **signal.model_dump(),
            tenant_id=tenant_id
        )
        
        # Process signal
        result = processor.process_signal(device_signal, tenant_id)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process device signal: {str(e)}"
        ) from e


@router.post(
    "/fallback",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Ingest fallback device signal",
    description="Capture fallback device signal when SDK fails (uses User-Agent)"
)
async def ingest_fallback_signal(
    transaction_id: str,
    user_id: str = None,
    user_agent: str = None,
    current_user: User = Depends(require_write),
    processor: SignalProcessor = Depends(get_signal_processor),
) -> Dict[str, Any]:
    """
    Ingest fallback device signal when SDK fails.
    
    Uses User-Agent and basic browser info as fallback.
    """
    tenant_id = get_tenant_id(current_user)
    
    try:
        result = processor.process_fallback_signal(
            transaction_id=transaction_id,
            user_id=user_id,
            tenant_id=tenant_id,
            user_agent=user_agent
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process fallback signal: {str(e)}"
        ) from e

