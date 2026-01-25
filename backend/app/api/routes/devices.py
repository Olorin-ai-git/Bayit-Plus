"""
Device Management API Routes

Endpoints for user device registration, listing, and removal.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.security import get_current_active_user
from app.models.user import Device, User
from app.services.device_manager import device_manager
from app.services.session_manager import session_manager

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================


class DeviceRegisterRequest(BaseModel):
    """Request model for device registration"""

    device_id: str = Field(..., description="Unique device fingerprint (SHA-256 hash)")
    device_name: str = Field(..., description="Human-readable device name")
    device_type: str = Field(..., description="Device category (mobile, desktop, tv, tablet)")
    browser: Optional[str] = Field(None, description="Browser name")
    os: Optional[str] = Field(None, description="Operating system")
    platform: Optional[str] = Field(None, description="Platform (iOS, Android, Web, tvOS)")
    ip_address: Optional[str] = Field(None, description="IP address")


class DeviceResponse(BaseModel):
    """Response model for device"""

    device_id: str
    device_name: str
    device_type: str
    browser: Optional[str]
    os: Optional[str]
    platform: Optional[str]
    last_active: str  # ISO format datetime
    registered_at: str  # ISO format datetime
    is_current: bool

    class Config:
        from_attributes = True


class DeviceListResponse(BaseModel):
    """Response model for list of devices"""

    devices: List[DeviceResponse]
    total: int


class HeartbeatRequest(BaseModel):
    """Request model for heartbeat update"""

    device_id: str = Field(..., description="Device fingerprint")


# ============================================================================
# Endpoints
# ============================================================================


@router.get("", response_model=DeviceListResponse)
async def list_devices(current_user: User = Depends(get_current_active_user)):
    """
    Get all registered devices for the current user.

    Returns:
        List of registered devices with last_active timestamps
    """
    try:
        devices = await device_manager.list_devices(str(current_user.id))

        device_responses = [
            DeviceResponse(
                device_id=d.device_id,
                device_name=d.device_name,
                device_type=d.device_type,
                browser=d.browser,
                os=d.os,
                platform=d.platform,
                last_active=d.last_active.isoformat(),
                registered_at=d.registered_at.isoformat(),
                is_current=d.is_current,
            )
            for d in devices
        ]

        return DeviceListResponse(devices=device_responses, total=len(device_responses))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list devices: {str(e)}")


@router.post("/register", response_model=DeviceResponse)
async def register_device(
    request: DeviceRegisterRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Register or update a device for the current user.

    If device already exists, updates its metadata and last_active timestamp.
    If device is new, adds it to user's devices list.

    Args:
        request: Device registration details

    Returns:
        Registered device information
    """
    try:
        device = await device_manager.register_device(
            user_id=str(current_user.id),
            device_id=request.device_id,
            device_name=request.device_name,
            device_type=request.device_type,
            browser=request.browser,
            os=request.os,
            platform=request.platform,
            ip_address=request.ip_address,
        )

        return DeviceResponse(
            device_id=device.device_id,
            device_name=device.device_name,
            device_type=device.device_type,
            browser=device.browser,
            os=device.os,
            platform=device.platform,
            last_active=device.last_active.isoformat(),
            registered_at=device.registered_at.isoformat(),
            is_current=device.is_current,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register device: {str(e)}")


@router.delete("/{device_id}")
async def unregister_device(
    device_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Unregister a device and terminate all active sessions on it.

    This endpoint:
    1. Terminates all active playback sessions on the device
    2. Removes the device from user's devices list

    Args:
        device_id: Device fingerprint to remove

    Returns:
        Success message with count of terminated sessions
    """
    try:
        # Terminate all active sessions on this device
        terminated_sessions = await session_manager.terminate_device_sessions(
            str(current_user.id), device_id
        )

        # Unregister the device
        result = await device_manager.unregister_device(str(current_user.id), device_id)

        if not result:
            raise HTTPException(status_code=404, detail="Device not found")

        return {
            "success": True,
            "message": "Device unregistered successfully",
            "terminated_sessions": terminated_sessions,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unregister device: {str(e)}")


@router.post("/heartbeat")
async def update_heartbeat(
    request: HeartbeatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Update device activity heartbeat.

    Keeps device marked as recently active.

    Args:
        request: Device heartbeat update

    Returns:
        Success confirmation
    """
    try:
        result = await device_manager.update_device_activity(
            str(current_user.id), request.device_id
        )

        if not result:
            raise HTTPException(status_code=404, detail="Device not found")

        return {"success": True, "message": "Heartbeat updated"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update heartbeat: {str(e)}")
