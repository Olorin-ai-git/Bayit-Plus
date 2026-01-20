"""
WebAuthn (Passkey) API endpoints.

Handles passkey registration, authentication, and session management.
"""

import logging
from typing import Optional

from app.core.security import get_current_active_user, get_optional_user
from app.models.user import User
from app.services.webauthn_service import WebAuthnService, get_webauthn_service
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================
# Request/Response Models
# ============================================


class RegistrationOptionsRequest(BaseModel):
    """Request for passkey registration options."""

    device_name: Optional[str] = Field(
        None,
        description="Optional friendly name for this passkey (e.g., 'iPhone 15 Pro')",
        max_length=100,
    )


class RegistrationOptionsResponse(BaseModel):
    """Response containing WebAuthn registration options."""

    options: dict
    challenge_id: str


class RegistrationVerifyRequest(BaseModel):
    """Request to verify passkey registration."""

    credential: dict = Field(
        ..., description="Credential from navigator.credentials.create()"
    )
    device_name: Optional[str] = Field(None, max_length=100)


class CredentialResponse(BaseModel):
    """Response for a passkey credential."""

    id: str
    device_name: Optional[str]
    created_at: str
    last_used_at: Optional[str]


class AuthenticationOptionsRequest(BaseModel):
    """Request for passkey authentication options."""

    is_qr_flow: bool = Field(
        False,
        description="Whether this is for cross-device QR authentication",
    )


class AuthenticationOptionsResponse(BaseModel):
    """Response containing WebAuthn authentication options."""

    options: dict
    challenge_id: str
    qr_session_id: Optional[str] = None


class AuthenticationVerifyRequest(BaseModel):
    """Request to verify passkey authentication."""

    credential: dict = Field(
        ..., description="Credential from navigator.credentials.get()"
    )
    challenge_id: Optional[str] = None
    qr_session_id: Optional[str] = None


class AuthenticationVerifyResponse(BaseModel):
    """Response after successful passkey authentication."""

    session_token: str
    expires_at: str
    user_id: str


class QRStatusResponse(BaseModel):
    """Response for QR authentication status polling."""

    status: str  # "pending", "authenticated", "expired"
    session_token: Optional[str] = None
    user_id: Optional[str] = None


class SessionStatusResponse(BaseModel):
    """Response for session status check."""

    valid: bool
    user_id: Optional[str] = None
    expires_at: Optional[str] = None


# ============================================
# Registration Endpoints (Passkey Setup)
# ============================================


@router.post("/register/options", response_model=RegistrationOptionsResponse)
async def get_registration_options(
    request: RegistrationOptionsRequest,
    current_user: User = Depends(get_current_active_user),
    webauthn: WebAuthnService = Depends(get_webauthn_service),
):
    """
    Get WebAuthn registration options to create a new passkey.

    The returned options should be passed to navigator.credentials.create()
    on the client side.
    """
    try:
        result = await webauthn.generate_registration_options_for_user(
            user_id=str(current_user.id),
            user_email=current_user.email,
            user_name=current_user.name,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating registration options: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate registration options",
        )


@router.post("/register/verify", response_model=CredentialResponse)
async def verify_registration(
    request: RegistrationVerifyRequest,
    current_user: User = Depends(get_current_active_user),
    webauthn: WebAuthnService = Depends(get_webauthn_service),
):
    """
    Verify passkey registration and store the credential.

    Submit the credential response from navigator.credentials.create().
    """
    try:
        credential = await webauthn.verify_registration(
            user_id=str(current_user.id),
            credential=request.credential,
            device_name=request.device_name,
        )
        return {
            "id": str(credential.id),
            "device_name": credential.device_name,
            "created_at": credential.created_at.isoformat(),
            "last_used_at": None,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error verifying registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify registration",
        )


# ============================================
# Authentication Endpoints (Unlock Content)
# ============================================


@router.post("/authenticate/options", response_model=AuthenticationOptionsResponse)
async def get_authentication_options(
    request: AuthenticationOptionsRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    webauthn: WebAuthnService = Depends(get_webauthn_service),
):
    """
    Get WebAuthn authentication options to authenticate with a passkey.

    The returned options should be passed to navigator.credentials.get()
    on the client side.

    If user is logged in, only their passkeys are allowed.
    For QR flow (cross-device), any discoverable credential is accepted.
    """
    try:
        user_id = (
            str(current_user.id) if current_user and not request.is_qr_flow else None
        )
        result = await webauthn.generate_authentication_options_for_user(
            user_id=user_id,
            is_qr_flow=request.is_qr_flow,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating authentication options: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate authentication options",
        )


@router.post("/authenticate/verify", response_model=AuthenticationVerifyResponse)
async def verify_authentication(
    request: AuthenticationVerifyRequest,
    http_request: Request,
    webauthn: WebAuthnService = Depends(get_webauthn_service),
):
    """
    Verify passkey authentication and create a session.

    Submit the credential response from navigator.credentials.get().
    Returns a session token to use for accessing protected content.
    """
    # Extract client info
    device_info = http_request.headers.get("User-Agent")
    ip_address = http_request.client.host if http_request.client else None

    try:
        session, user_id = await webauthn.verify_authentication(
            credential=request.credential,
            challenge_id=request.challenge_id,
            qr_session_id=request.qr_session_id,
            device_info=device_info,
            ip_address=ip_address,
        )
        return {
            "session_token": session.session_token,
            "expires_at": session.expires_at.isoformat(),
            "user_id": user_id,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error verifying authentication: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify authentication",
        )


# ============================================
# Cross-Device (QR Flow) Endpoints
# ============================================


@router.post("/qr/generate", response_model=AuthenticationOptionsResponse)
async def generate_qr_authentication(
    webauthn: WebAuthnService = Depends(get_webauthn_service),
):
    """
    Generate a QR code authentication challenge.

    Used by TV/web devices to initiate cross-device authentication.
    The QR code should encode the authentication URL with qr_session_id.
    """
    try:
        result = await webauthn.generate_authentication_options_for_user(
            user_id=None,  # Any user can authenticate
            is_qr_flow=True,
        )
        return result
    except Exception as e:
        logger.error(f"Error generating QR authentication: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate QR authentication",
        )


@router.get("/qr/status/{qr_session_id}", response_model=QRStatusResponse)
async def check_qr_status(
    qr_session_id: str,
    webauthn: WebAuthnService = Depends(get_webauthn_service),
):
    """
    Check if QR-based authentication has been completed.

    Poll this endpoint after displaying the QR code to detect
    when the user has authenticated on their phone.
    """
    result = await webauthn.check_qr_authentication_status(qr_session_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR session not found",
        )

    return result


# ============================================
# Credential Management Endpoints
# ============================================


@router.get("/credentials", response_model=list[CredentialResponse])
async def list_credentials(
    current_user: User = Depends(get_current_active_user),
    webauthn: WebAuthnService = Depends(get_webauthn_service),
):
    """
    List all registered passkeys for the current user.
    """
    credentials = await webauthn.get_user_credentials(str(current_user.id))
    return credentials


@router.delete("/credentials/{credential_id}")
async def remove_credential(
    credential_id: str,
    current_user: User = Depends(get_current_active_user),
    webauthn: WebAuthnService = Depends(get_webauthn_service),
):
    """
    Remove a passkey.
    """
    success = await webauthn.remove_credential(
        user_id=str(current_user.id),
        credential_db_id=credential_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Passkey not found or not owned by user",
        )

    return {"status": "success", "message": "Passkey removed"}


# ============================================
# Session Management Endpoints
# ============================================


@router.get("/session/status", response_model=SessionStatusResponse)
async def check_session_status(
    http_request: Request,
    webauthn: WebAuthnService = Depends(get_webauthn_service),
):
    """
    Check if the current passkey session is valid.

    Reads the session token from the X-Passkey-Session header.
    """
    session_token = http_request.headers.get("X-Passkey-Session")

    if not session_token:
        return {"valid": False}

    session = await webauthn.validate_session(session_token)

    if not session:
        return {"valid": False}

    return {
        "valid": True,
        "user_id": session.user_id,
        "expires_at": session.expires_at.isoformat(),
    }


@router.post("/session/revoke")
async def revoke_session(
    http_request: Request,
    webauthn: WebAuthnService = Depends(get_webauthn_service),
):
    """
    Revoke the current passkey session.

    Reads the session token from the X-Passkey-Session header.
    """
    session_token = http_request.headers.get("X-Passkey-Session")

    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No session token provided",
        )

    success = await webauthn.revoke_session(
        session_token=session_token,
        reason="User requested revocation",
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    return {"status": "success", "message": "Session revoked"}


@router.post("/session/revoke-all")
async def revoke_all_sessions(
    current_user: User = Depends(get_current_active_user),
    webauthn: WebAuthnService = Depends(get_webauthn_service),
):
    """
    Revoke all passkey sessions for the current user.

    Useful when user wants to sign out all devices.
    """
    count = await webauthn.revoke_all_user_sessions(
        user_id=str(current_user.id),
        reason="User requested revocation of all sessions",
    )

    return {
        "status": "success",
        "message": f"Revoked {count} session(s)",
        "revoked_count": count,
    }
