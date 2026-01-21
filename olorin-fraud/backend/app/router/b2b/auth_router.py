"""
B2B Partner Authentication Router.

Endpoints for partner user authentication, registration, and token management.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field

from app.security.b2b_auth import (
    B2BPartnerContext,
    create_b2b_access_token,
    create_b2b_refresh_token,
    decode_b2b_token,
    get_b2b_auth_config,
    get_current_b2b_user,
)
from app.service.b2b.partner_service import get_b2b_partner_service
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/auth", tags=["B2B Authentication"])


# ==================== Request/Response Models ====================


class RegisterRequest(BaseModel):
    """Partner registration request."""

    org_id: str = Field(..., min_length=3, max_length=100, description="Unique organization slug")
    org_name: str = Field(..., min_length=1, max_length=255)
    org_name_en: Optional[str] = Field(default=None, max_length=255)
    contact_email: EmailStr
    contact_name: Optional[str] = Field(default=None, max_length=255)
    # Owner user details
    user_name: str = Field(..., min_length=1, max_length=255)
    user_email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class RegisterResponse(BaseModel):
    """Partner registration response."""

    org_id: str
    partner_id: str
    user_id: str
    message: str


class LoginRequest(BaseModel):
    """Login request."""

    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response with tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class RefreshRequest(BaseModel):
    """Token refresh request."""

    refresh_token: str


class RefreshResponse(BaseModel):
    """Token refresh response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


# ==================== Endpoints ====================


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_partner(request: RegisterRequest) -> RegisterResponse:
    """
    Register a new B2B partner organization.

    Creates both the organization and the owner user account.
    """
    partner_service = get_b2b_partner_service()

    try:
        # Create organization
        org, partner_id = await partner_service.create_organization(
            org_id=request.org_id,
            name=request.org_name,
            name_en=request.org_name_en,
            contact_email=request.contact_email,
            contact_name=request.contact_name,
        )

        # Create owner user
        from app.models.b2b.partner import PartnerRole

        user = await partner_service.create_user(
            org_id=request.org_id,
            email=request.user_email,
            name=request.user_name,
            password=request.password,
            role=PartnerRole.OWNER,
        )

        logger.info(f"Registered new B2B partner: {request.org_id}")

        return RegisterResponse(
            org_id=org.org_id,
            partner_id=partner_id,
            user_id=user.user_id,
            message="Partner registration successful. Please verify your email.",
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Partner registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again.",
        )


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    response: Response,
) -> LoginResponse:
    """
    Authenticate a partner user and return access tokens.
    """
    partner_service = get_b2b_partner_service()

    # Authenticate user
    user = await partner_service.authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get organization
    org = await partner_service.get_organization(user.org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization not found or inactive",
        )

    if not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization is suspended",
        )

    # Build scopes based on role
    scopes = _get_scopes_for_role(user.role.value)

    # Create tokens
    config = get_b2b_auth_config()
    access_token = create_b2b_access_token(
        user_id=user.user_id,
        org_id=user.org_id,
        email=user.email,
        role=user.role.value,
        scopes=scopes,
    )
    refresh_token = create_b2b_refresh_token(
        user_id=user.user_id,
        org_id=user.org_id,
    )

    # Update last login
    client_ip = http_request.client.host if http_request.client else None
    await partner_service._successful_login(user.user_id, client_ip)

    logger.info(f"B2B user logged in: {user.email} (org: {user.org_id})")

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=config.access_token_expire_minutes * 60,
        user=user.to_dict(),
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(request: RefreshRequest) -> RefreshResponse:
    """
    Refresh an access token using a refresh token.
    """
    try:
        payload = decode_b2b_token(request.refresh_token)

        # Verify token type
        if payload.get("type") != "b2b_refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user_id = payload.get("sub")
        org_id = payload.get("org_id")

        if not user_id or not org_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        # Get user to verify still active
        partner_service = get_b2b_partner_service()
        user = await partner_service.get_user(user_id)

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        # Build scopes
        scopes = _get_scopes_for_role(user.role.value)

        # Create new access token
        config = get_b2b_auth_config()
        access_token = create_b2b_access_token(
            user_id=user.user_id,
            org_id=user.org_id,
            email=user.email,
            role=user.role.value,
            scopes=scopes,
        )

        return RefreshResponse(
            access_token=access_token,
            expires_in=config.access_token_expire_minutes * 60,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )


@router.post("/logout")
async def logout(
    response: Response,
    context: B2BPartnerContext = Depends(get_current_b2b_user),
) -> dict:
    """
    Logout the current user.

    Note: Since JWT tokens are stateless, this endpoint primarily serves
    as a signal to the client to discard tokens.
    """
    logger.info(f"B2B user logged out: {context.email} (org: {context.org_id})")

    return {"message": "Successfully logged out"}


@router.get("/me")
async def get_current_user(
    context: B2BPartnerContext = Depends(get_current_b2b_user),
) -> dict:
    """
    Get the current authenticated user's information.
    """
    partner_service = get_b2b_partner_service()

    user = await partner_service.get_user(context.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    org = await partner_service.get_organization(context.org_id)

    return {
        "user": user.to_dict(),
        "organization": org.to_dict() if org else None,
    }


# ==================== Helper Functions ====================


def _get_scopes_for_role(role: str) -> list[str]:
    """Get permission scopes based on user role."""
    base_scopes = ["read", "usage:read"]

    role_scopes = {
        "viewer": base_scopes,
        "member": base_scopes + ["write"],
        "admin": base_scopes + ["write", "team:manage", "api_keys:manage", "billing:read"],
        "owner": base_scopes + [
            "write",
            "team:manage",
            "api_keys:manage",
            "billing:read",
            "billing:write",
            "admin",
        ],
    }

    return role_scopes.get(role, base_scopes)
