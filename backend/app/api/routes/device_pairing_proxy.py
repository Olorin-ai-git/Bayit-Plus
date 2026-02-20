"""
Device Pairing v2 proxy endpoints that delegate to auth.olorin.ai.

These endpoints maintain the device pairing flow while using RS256 tokens
from the Olorin Auth Service instead of legacy HS256 tokens.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.core.security import get_current_user
from app.models.user import TokenResponse, User
from app.services.audit_logger import audit_logger
from app.services.auth_service_client import get_auth_service_client
from app.services.pairing_manager import pairing_manager

logger = get_logger(__name__)

router = APIRouter(prefix="/v2")


# ============================================================================
# Request/Response Models
# ============================================================================


class CompleteAuthRequest(BaseModel):
    """Complete device pairing with email/password authentication."""
    session_id: str
    email: str
    password: str


class CompleteGoogleRequest(BaseModel):
    """Complete device pairing with Google OAuth."""
    session_id: str
    id_token: str
    device_id: str | None = None


class CompleteAppleRequest(BaseModel):
    """Complete device pairing with Apple Sign In."""
    session_id: str
    id_token: str
    full_name: str | None = None
    email: str | None = None
    device_id: str | None = None


class CompleteTokenRequest(BaseModel):
    """Complete device pairing using an existing RS256 Bearer token."""
    session_id: str


class DevicePairingResponse(BaseModel):
    """Response from device pairing completion."""
    access_token: str
    refresh_token: str
    user: dict
    requires_payment: bool = False


# ============================================================================
# v2 Device Pairing Endpoints
# ============================================================================


@router.post("/complete", response_model=DevicePairingResponse)
@limiter.limit("5/minute")
async def complete_auth_v2(request: Request, auth_request: CompleteAuthRequest):
    """
    Complete device pairing with email/password via Olorin Auth Service.

    Flow:
    1. TV calls /init to get QR code
    2. Phone scans QR and calls /verify
    3. Phone calls /companion-connect
    4. Phone calls THIS endpoint with credentials
    5. This endpoint authenticates with auth.olorin.ai
    6. Returns RS256 tokens to phone
    7. Notifies TV via WebSocket with tokens

    Args:
        auth_request: Session ID and user credentials

    Returns:
        RS256 access/refresh tokens and user info

    Raises:
        404: Session not found or expired
        401: Invalid credentials
    """
    # Verify session exists
    session = await pairing_manager.get_session(auth_request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired",
        )

    # Mark as authenticating
    await pairing_manager.start_authentication(auth_request.session_id)

    auth_client = get_auth_service_client()

    try:
        # Authenticate with auth service
        auth_response = await auth_client.login(
            email=auth_request.email,
            password=auth_request.password,
        )

        # Sync/get user from Bayit+ DB
        user = await auth_client.create_user_in_bayit_db(
            auth_service_user_id=auth_response["user_id"],
            email=auth_response["email"],
            name=auth_response["name"],
            role=auth_response.get("role", "user"),
        )

        # Sync beta user status (Bayit+ specific)
        from app.api.routes.auth import _sync_beta_user_status
        await _sync_beta_user_status(user)

        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await user.save()

        # Audit log
        await audit_logger.log_login_success(user, request, "device_pairing_v2")

        # Complete pairing - notify TV via WebSocket
        await pairing_manager.complete_pairing(
            auth_request.session_id,
            str(user.id),
            auth_response["access_token"],
            user.to_response().model_dump(mode="json"),
            refresh_token=auth_response.get("refresh_token"),
        )

        logger.info(
            "Device pairing v2 completed",
            extra={
                "session_id": auth_request.session_id,
                "user_id": str(user.id),
                "email": user.email,
            }
        )

        return DevicePairingResponse(
            access_token=auth_response["access_token"],
            refresh_token=auth_response["refresh_token"],
            user=user.to_response().model_dump(mode="json"),
            requires_payment=user.payment_pending,
        )

    except ValueError as e:
        # Authentication failed
        await pairing_manager.fail_pairing(auth_request.session_id, str(e))
        await audit_logger.log_login_failure(auth_request.email, request, "device_pairing_v2")

        logger.warning(
            "Device pairing v2 auth failed",
            extra={
                "session_id": auth_request.session_id,
                "email": auth_request.email,
                "error": str(e),
            }
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )
    except Exception as e:
        # Unexpected error
        await pairing_manager.fail_pairing(auth_request.session_id, "Internal error")

        logger.error(
            "Device pairing v2 unexpected error",
            extra={
                "session_id": auth_request.session_id,
                "error": str(e),
            }
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete device pairing",
        )


@router.post("/complete-google", response_model=DevicePairingResponse)
@limiter.limit("10/minute")
async def complete_google_v2(request: Request, auth_request: CompleteGoogleRequest):
    """
    Complete device pairing with Google OAuth via Olorin Auth Service.

    Flow:
    1. TV calls /init to get QR code
    2. Phone scans QR and calls /verify
    3. Phone calls /companion-connect
    4. Phone completes Google OAuth and gets ID token
    5. Phone calls THIS endpoint with Google ID token
    6. This endpoint authenticates with auth.olorin.ai
    7. Returns RS256 tokens to phone
    8. Notifies TV via WebSocket with tokens

    Args:
        auth_request: Session ID and Google ID token

    Returns:
        RS256 access/refresh tokens and user info

    Raises:
        404: Session not found or expired
        401: Invalid Google token
    """
    # Verify session exists
    session = await pairing_manager.get_session(auth_request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired",
        )

    # Mark as authenticating
    await pairing_manager.start_authentication(auth_request.session_id)

    auth_client = get_auth_service_client()

    try:
        # Authenticate with Google via auth service
        auth_response = await auth_client.login_google(
            id_token=auth_request.id_token,
            device_id=auth_request.device_id,
        )

        # Sync/get user from Bayit+ DB
        user = await auth_client.create_user_in_bayit_db(
            auth_service_user_id=auth_response["user_id"],
            email=auth_response["email"],
            name=auth_response["name"],
            role=auth_response.get("role", "user"),
            avatar=auth_response.get("avatar"),
        )

        # Sync beta user status
        from app.api.routes.auth import _sync_beta_user_status
        await _sync_beta_user_status(user)

        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await user.save()

        # Audit log
        await audit_logger.log_oauth_login(user, request, "device_pairing_google_v2")

        # Complete pairing - notify TV via WebSocket
        await pairing_manager.complete_pairing(
            auth_request.session_id,
            str(user.id),
            auth_response["access_token"],
            user.to_response().model_dump(mode="json"),
            refresh_token=auth_response.get("refresh_token"),
        )

        logger.info(
            "Device pairing Google v2 completed",
            extra={
                "session_id": auth_request.session_id,
                "user_id": str(user.id),
                "email": user.email,
            }
        )

        return DevicePairingResponse(
            access_token=auth_response["access_token"],
            refresh_token=auth_response["refresh_token"],
            user=user.to_response().model_dump(mode="json"),
            requires_payment=user.payment_pending,
        )

    except ValueError as e:
        # Authentication failed
        await pairing_manager.fail_pairing(auth_request.session_id, str(e))

        logger.warning(
            "Device pairing Google v2 auth failed",
            extra={
                "session_id": auth_request.session_id,
                "error": str(e),
            }
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google authentication failed: {str(e)}",
        )
    except Exception as e:
        # Unexpected error
        await pairing_manager.fail_pairing(auth_request.session_id, "Internal error")

        logger.error(
            "Device pairing Google v2 unexpected error",
            extra={
                "session_id": auth_request.session_id,
                "error": str(e),
            }
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete device pairing with Google",
        )


@router.post("/complete-apple", response_model=DevicePairingResponse)
@limiter.limit("10/minute")
async def complete_apple_v2(request: Request, auth_request: CompleteAppleRequest):
    """
    Complete device pairing with Apple Sign In via Olorin Auth Service.

    Flow:
    1. TV calls /init to get QR code
    2. Phone scans QR and calls /verify
    3. Phone calls /companion-connect
    4. Phone completes Apple Sign In and gets identity token
    5. Phone calls THIS endpoint with Apple identity token
    6. This endpoint authenticates with auth.olorin.ai
    7. Returns RS256 tokens to phone
    8. Notifies TV via WebSocket with tokens

    Note: full_name and email are only provided by Apple on first sign-in
    and must be forwarded to the auth service for initial user creation.

    Args:
        auth_request: Session ID and Apple identity token

    Returns:
        RS256 access/refresh tokens and user info

    Raises:
        404: Session not found or expired
        401: Invalid Apple token
    """
    # Verify session exists
    session = await pairing_manager.get_session(auth_request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired",
        )

    # Mark as authenticating
    await pairing_manager.start_authentication(auth_request.session_id)

    auth_client = get_auth_service_client()

    try:
        # Authenticate with Apple via auth service
        auth_response = await auth_client.login_apple(
            id_token=auth_request.id_token,
            full_name=auth_request.full_name,
            email=auth_request.email,
            device_id=auth_request.device_id,
        )

        # Sync/get user from Bayit+ DB
        # Prefer client-provided full_name over auth service response
        # (Apple only provides the name on first sign-in)
        display_name = auth_request.full_name or auth_response["name"]
        user = await auth_client.create_user_in_bayit_db(
            auth_service_user_id=auth_response["user_id"],
            email=auth_response["email"],
            name=display_name,
            role=auth_response.get("role", "user"),
            avatar=auth_response.get("avatar"),
        )

        # Sync beta user status
        from app.api.routes.auth import _sync_beta_user_status
        await _sync_beta_user_status(user)

        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await user.save()

        # Audit log
        await audit_logger.log_oauth_login(user, request, "device_pairing_apple_v2")

        # Complete pairing - notify TV via WebSocket
        await pairing_manager.complete_pairing(
            auth_request.session_id,
            str(user.id),
            auth_response["access_token"],
            user.to_response().model_dump(mode="json"),
            refresh_token=auth_response.get("refresh_token"),
        )

        logger.info(
            "Device pairing Apple v2 completed",
            extra={
                "session_id": auth_request.session_id,
                "user_id": str(user.id),
                "email": user.email,
            }
        )

        return DevicePairingResponse(
            access_token=auth_response["access_token"],
            refresh_token=auth_response["refresh_token"],
            user=user.to_response().model_dump(mode="json"),
            requires_payment=user.payment_pending,
        )

    except ValueError as e:
        # Authentication failed
        await pairing_manager.fail_pairing(auth_request.session_id, str(e))

        logger.warning(
            "Device pairing Apple v2 auth failed",
            extra={
                "session_id": auth_request.session_id,
                "error": str(e),
            }
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Apple Sign In failed: {str(e)}",
        )
    except Exception as e:
        # Unexpected error
        await pairing_manager.fail_pairing(auth_request.session_id, "Internal error")

        logger.error(
            "Device pairing Apple v2 unexpected error",
            extra={
                "session_id": auth_request.session_id,
                "error": str(e),
            }
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete device pairing with Apple",
        )


@router.post("/complete-token")
@limiter.limit("10/minute")
async def complete_token_v2(
    request: Request,
    body: CompleteTokenRequest,
    user: User = Depends(get_current_user),
):
    """
    Complete device pairing by forwarding the caller's existing RS256 token.

    Unlike the credential-based endpoints, this is used when the companion
    device (phone) is already authenticated. The endpoint validates the
    Bearer token via ``get_current_user``, then sends that same token to
    the TV via WebSocket so the TV can start an authenticated session.

    Args:
        body: Contains the pairing session_id from the QR code.
        user: Authenticated user resolved from the Authorization header.

    Returns:
        Success status.

    Raises:
        404: Session not found or expired.
        401: Invalid or missing Bearer token (handled by dependency).
    """
    session = await pairing_manager.get_session(body.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired",
        )

    await pairing_manager.start_authentication(body.session_id)

    try:
        # Extract the raw RS256 Bearer token from the Authorization header
        auth_header = request.headers.get("Authorization", "")
        bearer_token = auth_header.removeprefix("Bearer ").strip()

        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await user.save()

        await audit_logger.log_login_success(user, request, "device_pairing_token_v2")

        # Complete pairing - send the existing RS256 token to the TV
        await pairing_manager.complete_pairing(
            body.session_id,
            str(user.id),
            bearer_token,
            user.to_response().model_dump(mode="json"),
        )

        logger.info(
            "Device pairing token v2 completed",
            extra={
                "session_id": body.session_id,
                "user_id": str(user.id),
                "email": user.email,
            },
        )

        return {"status": "paired", "session_id": body.session_id}

    except Exception as e:
        await pairing_manager.fail_pairing(body.session_id, "Internal error")

        logger.error(
            "Device pairing token v2 unexpected error",
            extra={
                "session_id": body.session_id,
                "error": str(e),
            },
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete device pairing",
        )


@router.get("/health")
async def device_pairing_v2_health():
    """Health check for device pairing v2 endpoints."""
    return {
        "status": "healthy",
        "auth_service": "https://auth.olorin.ai",
        "proxy_version": "v2",
        "features": [
            "email_password",
            "google_oauth",
            "apple_signin",
            "token_forward",
        ],
    }
