"""
Device Pairing API for QR-based TV authentication.
Allows TV apps to generate QR codes that companion devices (phones) can scan
to authenticate the TV session without typing credentials on the TV.
"""

from datetime import datetime
from typing import Optional

from fastapi import (APIRouter, Depends, HTTPException, WebSocket,
                     WebSocketDisconnect, status)
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import (create_access_token, get_current_user,
                                security, verify_password)
from app.models.user import TokenResponse, User
from app.services.pairing_manager import pairing_manager

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================


class InitPairingResponse(BaseModel):
    session_id: str
    pairing_code: str  # URL string for client-side QR generation
    qr_code_data: str  # Base64 PNG (server-generated)
    expires_at: str
    ws_url: str


class VerifySessionRequest(BaseModel):
    session_id: str
    token: str


class VerifySessionResponse(BaseModel):
    valid: bool
    session_id: str
    status: str
    expires_at: str


class CompanionConnectRequest(BaseModel):
    session_id: str
    device_type: str  # "ios", "android", "web"
    browser: Optional[str] = None


class CompleteAuthRequest(BaseModel):
    session_id: str
    email: str
    password: str


class CompleteOAuthRequest(BaseModel):
    session_id: str
    provider: str  # "google"
    token: str  # OAuth access token


# ============================================================================
# REST Endpoints
# ============================================================================


@router.post("/init", response_model=InitPairingResponse)
async def init_pairing():
    """
    Initialize a new device pairing session.
    Called by TV app to generate a QR code for companion device scanning.

    Returns:
        - session_id: Unique identifier for this pairing session
        - qr_code_data: Base64-encoded PNG image of the QR code
        - expires_at: When this session expires (20 minutes)
        - ws_url: WebSocket URL for real-time status updates
    """
    # Get base URL from settings or default
    base_url = getattr(settings, "FRONTEND_URL", "https://bayit.plus")

    session = await pairing_manager.create_session(base_url)

    ws_url = f"{settings.API_V1_PREFIX}/auth/device-pairing/ws/{session.session_id}"

    return InitPairingResponse(
        session_id=session.session_id,
        pairing_code=session.pairing_code,
        qr_code_data=session.qr_code_data,
        expires_at=session.expires_at.isoformat(),
        ws_url=ws_url,
    )


@router.post("/verify", response_model=VerifySessionResponse)
async def verify_session(request: VerifySessionRequest):
    """
    Verify a session token from QR code scan.
    Called by companion device after scanning QR code.

    Returns session validity and status.
    """
    session = await pairing_manager.verify_session_token(
        request.session_id, request.token
    )

    if not session:
        return VerifySessionResponse(
            valid=False,
            session_id=request.session_id,
            status="invalid",
            expires_at="",
        )

    return VerifySessionResponse(
        valid=True,
        session_id=session.session_id,
        status=session.status,
        expires_at=session.expires_at.isoformat(),
    )


@router.post("/companion-connect")
async def companion_connect(request: CompanionConnectRequest):
    """
    Register companion device connection.
    Called by companion after verifying session to notify TV of connection.

    Returns ws_notified flag so the companion knows if the TV received
    the WebSocket notification or will rely on polling.
    """
    device_info = {
        "device_type": request.device_type,
        "browser": request.browser,
        "connected_at": datetime.utcnow().isoformat(),
    }

    result = await pairing_manager.connect_companion(request.session_id, device_info)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired",
        )

    return {
        "status": "connected",
        "ws_notified": result["ws_notified"],
    }


@router.post("/complete", response_model=TokenResponse)
async def complete_auth(request: CompleteAuthRequest):
    """
    DEPRECATED: Legacy HS256 device pairing endpoint.

    This endpoint has been replaced by RS256 authentication from auth.olorin.ai.
    Device pairing now requires RS256 tokens.

    Migration completed: 2026-02-16
    Deprecated since: RS256-only enforcement
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "error": "endpoint_deprecated",
            "message": "Device pairing no longer supported with HS256 tokens. Please update your TV app",
            "migration_guide": "https://docs.bayit.tv/auth-migration#device-pairing",
            "deprecated_since": "2026-02-16",
            "action_required": "update_tv_app",
        }
    )

    # ORIGINAL IMPLEMENTATION REMOVED - Keep for reference in git history
    # Verify session exists
    session = await pairing_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired",
        )

    # Mark as authenticating
    await pairing_manager.start_authentication(request.session_id)

    # Authenticate user
    user = await User.find_one({"email": request.email})

    if not user or not verify_password(request.password, user.hashed_password):
        await pairing_manager.fail_pairing(request.session_id, "Invalid credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        await pairing_manager.fail_pairing(request.session_id, "Account inactive")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    # Update last login
    user.last_login = datetime.utcnow()
    await user.save()

    # Create token
    access_token = create_access_token(data={"sub": str(user.id)})
    user_response = user.to_response()

    # Complete pairing - notify TV
    await pairing_manager.complete_pairing(
        request.session_id,
        str(user.id),
        access_token,
        user_response.model_dump(mode="json"),
    )

    return TokenResponse(
        access_token=access_token,
        user=user_response,
    )


@router.post("/complete-oauth", response_model=TokenResponse)
async def complete_oauth(request: CompleteOAuthRequest):
    """
    Complete authentication via OAuth on companion device.
    Called after OAuth flow completes on companion.
    """
    # This would integrate with Google OAuth similar to auth.py
    # For MVP, we'll focus on password auth
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="OAuth pairing not yet implemented",
    )


class CompleteAuthTokenRequest(BaseModel):
    session_id: str


@router.post("/v2/complete-token")
async def complete_auth_token_v2(
    request: CompleteAuthTokenRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
):
    """
    Complete device pairing using RS256 authentication token.
    Called by the companion iOS/Android app after the user authenticates.

    Forwards the companion's RS256 token to the TV via WebSocket so the TV
    can authenticate as the same user without requiring credentials on the TV.
    """
    session = await pairing_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired",
        )

    await pairing_manager.start_authentication(request.session_id)

    if not current_user.is_active:
        await pairing_manager.fail_pairing(request.session_id, "Account inactive")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    current_user.last_login = datetime.utcnow()
    await current_user.save()

    user_response = current_user.to_response()
    await pairing_manager.complete_pairing(
        request.session_id,
        str(current_user.id),
        credentials.credentials,
        user_response.model_dump(mode="json"),
    )

    return {"status": "success"}


@router.post("/complete-token", response_model=TokenResponse)
async def complete_auth_token(
    request: CompleteAuthTokenRequest,
    current_user: User = Depends(get_current_user),
):
    """
    DEPRECATED: Legacy HS256 device pairing with token endpoint.

    This endpoint has been replaced by RS256 authentication from auth.olorin.ai.
    Device pairing now requires RS256 tokens.

    Migration completed: 2026-02-16
    Deprecated since: RS256-only enforcement
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "error": "endpoint_deprecated",
            "message": "Device pairing with token no longer supported with HS256 tokens. Please update your TV app",
            "migration_guide": "https://docs.bayit.tv/auth-migration#device-pairing",
            "deprecated_since": "2026-02-16",
            "action_required": "update_tv_app",
        }
    )

    # ORIGINAL IMPLEMENTATION REMOVED - Keep for reference in git history
    # Verify session exists
    session = await pairing_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired",
        )

    # Mark as authenticating
    await pairing_manager.start_authentication(request.session_id)

    if not current_user.is_active:
        await pairing_manager.fail_pairing(request.session_id, "Account inactive")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    # Update last login
    current_user.last_login = datetime.utcnow()
    await current_user.save()

    # Create token
    access_token = create_access_token(data={"sub": str(current_user.id)})
    user_response = current_user.to_response()

    # Complete pairing - notify TV
    await pairing_manager.complete_pairing(
        request.session_id,
        str(current_user.id),
        access_token,
        user_response.model_dump(mode="json"),
    )

    return TokenResponse(
        access_token=access_token,
        user=user_response,
    )


@router.get("/status/{session_id}")
async def get_session_status(session_id: str):
    """
    Get current status of a pairing session.

    When status is 'success', includes access_token and user data
    so polling clients can complete authentication without WebSocket.
    """
    status_info = await pairing_manager.get_session_status(session_id)

    if not status_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Resolve user data for completed sessions so polling clients
    # can finish authentication even if the WebSocket message was lost
    if (
        status_info.get("status") == "success"
        and status_info.get("authenticated_user_id")
    ):
        user = await User.get(status_info["authenticated_user_id"])
        if user:
            status_info["user"] = user.to_response().model_dump(mode="json")

    return status_info


@router.delete("/{session_id}")
async def cancel_session(session_id: str):
    """
    Cancel a pairing session.
    Called by TV or companion to abort the pairing process.
    """
    await pairing_manager.remove_session(session_id)
    return {"status": "cancelled"}


# ============================================================================
# WebSocket Endpoint
# ============================================================================


@router.websocket("/ws/{session_id}")
async def pairing_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time pairing status updates.
    TV connects here after calling /init to receive status updates.

    Messages sent to TV:
    - {"type": "connected", "session_id": "...", "expires_at": "..."}
    - {"type": "companion_connected", "device_info": {...}}
    - {"type": "authenticating"}
    - {"type": "pairing_success", "user": {...}, "access_token": "..."}
    - {"type": "pairing_failed", "reason": "..."}
    - {"type": "session_expired"}
    """
    await websocket.accept()

    # Connect to session
    session = await pairing_manager.connect_tv(session_id, websocket)

    if not session:
        await websocket.send_json(
            {
                "type": "error",
                "message": "Session not found or expired",
            }
        )
        await websocket.close()
        return

    # Send initial connected message
    await websocket.send_json(
        {
            "type": "connected",
            "session_id": session_id,
            "expires_at": session.expires_at.isoformat(),
        }
    )

    # If companion already connected, notify
    if session.companion_device_info:
        await websocket.send_json(
            {
                "type": "companion_connected",
                "device_info": session.companion_device_info,
            }
        )

    try:
        # Keep connection alive and handle incoming messages
        while True:
            try:
                data = await websocket.receive_json()

                # Handle ping/pong for keepalive
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})

                # Handle refresh request (generate new QR code)
                elif data.get("type") == "refresh":
                    # Check if session is still valid
                    current_session = await pairing_manager.get_session(session_id)
                    if current_session and current_session.is_expired():
                        await websocket.send_json(
                            {
                                "type": "session_expired",
                            }
                        )
                        break

            except Exception:
                # Connection closed or error
                break

    except WebSocketDisconnect:
        pass
    finally:
        await pairing_manager.disconnect_tv(session_id)
