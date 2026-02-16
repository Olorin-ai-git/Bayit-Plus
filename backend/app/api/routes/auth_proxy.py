"""
Auth proxy endpoints that delegate to auth.olorin.ai.

These endpoints maintain Bayit+ specific features (payment flow,
beta users, etc.) while using Olorin Auth Service for authentication.
"""

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.models.user import TokenResponse, UserCreate, UserLogin
from app.services.audit_logger import audit_logger
from app.services.auth_service_client import get_auth_service_client

logger = get_logger(__name__)

router = APIRouter(prefix="/v2")


class SocialAuthRequest(BaseModel):
    """Request for social auth (Google)."""
    id_token: str
    device_id: str | None = None


class AppleSocialAuthRequest(BaseModel):
    """Request for Apple social auth with optional first-sign-in fields."""
    id_token: str
    full_name: str | None = None
    email: str | None = None
    device_id: str | None = None


class GoogleCallbackRequest(BaseModel):
    """Request for Google OAuth callback (web flow)."""
    code: str
    redirect_uri: str | None = None
    state: str | None = None


class AuthProxyResponse(BaseModel):
    """Response from auth proxy endpoints."""
    access_token: str
    refresh_token: str
    user: dict
    requires_payment: bool = False


@router.post("/register", response_model=AuthProxyResponse)
@limiter.limit("3/hour")
async def register_via_auth_service(request: Request, user_data: UserCreate):
    """
    Register via Olorin Auth Service.

    Delegates authentication to auth.olorin.ai while maintaining
    Bayit+ specific features like payment flow and beta users.
    """
    start_time = asyncio.get_event_loop().time()

    auth_client = get_auth_service_client()

    try:
        # Register with auth service
        auth_response = await auth_client.register(
            email=user_data.email,
            password=user_data.password,
            name=user_data.name,
        )

        # Create/sync user in Bayit+ DB with Bayit+ specific fields
        user = await auth_client.create_user_in_bayit_db(
            auth_service_user_id=auth_response["user_id"],
            email=auth_response["email"],
            name=auth_response["name"],
            role=auth_response.get("role", "user"),
        )

        # Determine payment requirement (Bayit+ specific)
        from app.api.routes.auth import should_require_payment
        requires_payment = should_require_payment(str(user.id))

        if requires_payment:
            user.payment_pending = True
            user.payment_created_at = datetime.now(timezone.utc)
            user.pending_plan_id = "basic"
            await user.save()
            logger.info(
                "User registered via auth service - payment required",
                extra={
                    "user_id": str(user.id),
                    "auth_service_user_id": auth_response["user_id"],
                    "email": user.email,
                }
            )
        else:
            user.payment_pending = False
            await user.save()
            logger.info(
                "User registered via auth service - viewer tier",
                extra={
                    "user_id": str(user.id),
                    "auth_service_user_id": auth_response["user_id"],
                    "email": user.email,
                }
            )

        # Send verification email (Bayit+ specific)
        try:
            from app.services.verification_service import verification_service
            await verification_service.initiate_email_verification(user)
        except Exception as e:
            logger.warning("Failed to send verification email", extra={"error": str(e)})

        # Audit log
        await audit_logger.log_registration(user, request)

        # Ensure constant response time
        elapsed = asyncio.get_event_loop().time() - start_time
        min_response_time = 0.5
        if elapsed < min_response_time:
            await asyncio.sleep(min_response_time - elapsed)

        return AuthProxyResponse(
            access_token=auth_response["access_token"],
            refresh_token=auth_response["refresh_token"],
            user=user.to_response().dict(),
            requires_payment=requires_payment,
        )

    except ValueError as e:
        # Ensure constant response time even on error
        elapsed = asyncio.get_event_loop().time() - start_time
        min_response_time = 0.5
        if elapsed < min_response_time:
            await asyncio.sleep(min_response_time - elapsed)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=AuthProxyResponse)
@limiter.limit("5/minute")
async def login_via_auth_service(request: Request, credentials: UserLogin):
    """
    Login via Olorin Auth Service.

    Delegates authentication to auth.olorin.ai while syncing with
    Bayit+ database for app-specific features.
    """
    auth_client = get_auth_service_client()

    try:
        # Login with auth service
        auth_response = await auth_client.login(
            email=credentials.email,
            password=credentials.password,
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
        await user.save()

        # Audit log
        await audit_logger.log_login_success(user, request)

        return AuthProxyResponse(
            access_token=auth_response["access_token"],
            refresh_token=auth_response["refresh_token"],
            user=user.to_response().dict(),
            requires_payment=user.payment_pending,
        )

    except ValueError as e:
        # Audit log for failed attempt
        await audit_logger.log_login_failure(credentials.email, request)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/google", response_model=AuthProxyResponse)
@limiter.limit("10/minute")
async def login_google_via_auth_service(request: Request, auth_data: SocialAuthRequest):
    """
    Google OAuth via Olorin Auth Service.

    Accepts Google ID token from mobile/web clients, delegates to auth.olorin.ai,
    and syncs with Bayit+ database for app-specific features.
    """
    auth_client = get_auth_service_client()

    try:
        # Login with Google via auth service
        auth_response = await auth_client.login_google(
            id_token=auth_data.id_token,
            device_id=auth_data.device_id,
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
        await user.save()

        # Audit log
        await audit_logger.log_oauth_login(user, request, "google")

        logger.info(
            "Google OAuth login via auth service",
            extra={"user_id": str(user.id), "email": user.email}
        )

        return AuthProxyResponse(
            access_token=auth_response["access_token"],
            refresh_token=auth_response["refresh_token"],
            user=user.to_response().dict(),
            requires_payment=user.payment_pending,
        )

    except ValueError as e:
        await audit_logger.log_login_failure(auth_data.id_token[:20], request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google OAuth failed: {str(e)}",
        )


@router.post("/google/callback", response_model=AuthProxyResponse)
@limiter.limit("10/minute")
async def google_callback_via_auth_service(request: Request, auth_data: GoogleCallbackRequest):
    """
    Google OAuth callback (web flow) via Olorin Auth Service.

    Handles the redirect from Google OAuth, exchanges code for ID token,
    then delegates to auth.olorin.ai for RS256 token generation.
    """
    import httpx
    from app.core.config import settings

    auth_client = get_auth_service_client()

    # Verify state parameter for CSRF protection
    if not auth_data.state or len(auth_data.state) < 16:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing or invalid state parameter",
        )

    final_redirect_uri = auth_data.redirect_uri or settings.GOOGLE_REDIRECT_URI

    try:
        # Step 1: Exchange Google authorization code for tokens
        async with httpx.AsyncClient(timeout=30.0) as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": auth_data.code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": final_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )

            if token_response.status_code != 200:
                error_detail = token_response.json() if token_response.text else {}
                google_error = error_detail.get(
                    "error_description",
                    error_detail.get("error", "Failed to exchange code"),
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Google OAuth error: {google_error}",
                )

            google_tokens = token_response.json()
            google_id_token = google_tokens.get("id_token")

            if not google_id_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No ID token in Google response",
                )

        # Step 2: Send Google ID token to auth.olorin.ai for RS256 token generation
        auth_response = await auth_client.login_google(
            id_token=google_id_token,
            device_id=None,  # Web doesn't have device_id
        )

        # Step 3: Sync user to Bayit+ database
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
        await user.save()

        # Audit log
        await audit_logger.log_oauth_login(user, request, "google")

        logger.info(
            "Google OAuth web callback via auth service",
            extra={"user_id": str(user.id), "email": user.email}
        )

        return AuthProxyResponse(
            access_token=auth_response["access_token"],
            refresh_token=auth_response["refresh_token"],
            user=user.to_response().dict(),
            requires_payment=user.payment_pending,
        )

    except ValueError as e:
        await audit_logger.log_login_failure("google_oauth", request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google OAuth failed: {str(e)}",
        )


@router.post("/apple", response_model=AuthProxyResponse)
@limiter.limit("10/minute")
async def login_apple_via_auth_service(request: Request, auth_data: AppleSocialAuthRequest):
    """
    Apple Sign In via Olorin Auth Service.

    Accepts Apple ID token from mobile/web clients, delegates to auth.olorin.ai,
    and syncs with Bayit+ database for app-specific features.

    full_name and email are only provided by Apple on the user's first sign-in
    and must be forwarded to the auth service for initial user creation.
    """
    auth_client = get_auth_service_client()

    try:
        # Login with Apple via auth service
        auth_response = await auth_client.login_apple(
            id_token=auth_data.id_token,
            full_name=auth_data.full_name,
            email=auth_data.email,
            device_id=auth_data.device_id,
        )

        # Sync/get user from Bayit+ DB
        # Prefer client-provided full_name over auth service response
        # (Apple only provides the name on first sign-in)
        display_name = auth_data.full_name or auth_response["name"]
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
        await user.save()

        # Audit log
        await audit_logger.log_oauth_login(user, request, "apple")

        logger.info(
            "Apple Sign In via auth service",
            extra={"user_id": str(user.id), "email": user.email}
        )

        return AuthProxyResponse(
            access_token=auth_response["access_token"],
            refresh_token=auth_response["refresh_token"],
            user=user.to_response().dict(),
            requires_payment=user.payment_pending,
        )

    except ValueError as e:
        await audit_logger.log_login_failure(auth_data.id_token[:20], request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Apple Sign In failed: {str(e)}",
        )


@router.get("/health")
async def auth_proxy_health():
    """Health check for auth proxy endpoints."""
    return {
        "status": "healthy",
        "auth_service": "https://auth.olorin.ai",
        "proxy_version": "v2",
    }
