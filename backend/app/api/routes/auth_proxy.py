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


@router.get("/health")
async def auth_proxy_health():
    """Health check for auth proxy endpoints."""
    return {
        "status": "healthy",
        "auth_service": "https://auth.olorin.ai",
        "proxy_version": "v2",
    }
