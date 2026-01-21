"""
B2B Partner Management Router.

Endpoints for managing partner organizations, users, and API keys.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.models.b2b.partner import PartnerRole, ServiceCategory
from app.security.b2b_auth import (
    B2BPartnerContext,
    get_b2b_partner_context,
    require_b2b_admin,
    require_b2b_owner,
)
from app.service.b2b.partner_service import get_b2b_partner_service
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/partner", tags=["B2B Partner Management"])


# ==================== Request/Response Models ====================


class UpdateOrganizationRequest(BaseModel):
    """Update organization request."""

    name: Optional[str] = Field(default=None, max_length=500)
    name_en: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = Field(default=None, max_length=2000)
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_name: Optional[str] = Field(default=None, max_length=255)
    technical_contact_email: Optional[EmailStr] = None


class InviteUserRequest(BaseModel):
    """Invite team member request."""

    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    role: str = Field(default="member", pattern="^(member|admin|viewer)$")


class UpdateUserRequest(BaseModel):
    """Update user request."""

    name: Optional[str] = Field(default=None, max_length=255)
    role: Optional[str] = Field(default=None, pattern="^(member|admin|viewer)$")


class CreateApiKeyRequest(BaseModel):
    """Create API key request."""

    name: str = Field(..., min_length=1, max_length=255)
    scopes: Optional[List[str]] = None
    expires_days: Optional[int] = Field(default=None, ge=1, le=365)


class CreateApiKeyResponse(BaseModel):
    """Create API key response - includes raw key (shown only once)."""

    key_id: str
    name: str
    api_key: str  # Only returned on creation!
    scopes: List[str]
    expires_at: Optional[str]
    message: str


class ConfigureWebhookRequest(BaseModel):
    """Configure webhook request."""

    webhook_url: str
    events: List[str]


# ==================== Organization Endpoints ====================


@router.get("/me")
async def get_organization(
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> dict:
    """
    Get the current organization's information.
    """
    partner_service = get_b2b_partner_service()

    org = await partner_service.get_organization(context.org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return {"organization": org.to_dict()}


@router.put("/me")
async def update_organization(
    request: UpdateOrganizationRequest,
    context: B2BPartnerContext = Depends(require_b2b_admin),
) -> dict:
    """
    Update the current organization's information.

    Requires admin or owner role.
    """
    partner_service = get_b2b_partner_service()

    # Build update dict with only provided fields
    updates = request.model_dump(exclude_unset=True, exclude_none=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    org = await partner_service.update_organization(context.org_id, **updates)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    logger.info(f"Organization updated: {context.org_id}")

    return {"organization": org.to_dict(), "message": "Organization updated successfully"}


@router.post("/me/webhook")
async def configure_webhook(
    request: ConfigureWebhookRequest,
    context: B2BPartnerContext = Depends(require_b2b_admin),
) -> dict:
    """
    Configure webhook for organization events.

    Requires admin or owner role.
    """
    partner_service = get_b2b_partner_service()

    org = await partner_service.configure_webhook(
        org_id=context.org_id,
        webhook_url=request.webhook_url,
        events=request.events,
    )

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    logger.info(f"Webhook configured for organization: {context.org_id}")

    return {
        "message": "Webhook configured successfully",
        "webhook_url": request.webhook_url,
        "events": request.events,
    }


# ==================== Team Management Endpoints ====================


@router.get("/me/team")
async def list_team_members(
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> dict:
    """
    List all team members in the organization.
    """
    partner_service = get_b2b_partner_service()

    users = await partner_service.list_organization_users(context.org_id)

    return {
        "team_members": [u.to_dict() for u in users],
        "total": len(users),
    }


@router.post("/me/team", status_code=status.HTTP_201_CREATED)
async def invite_team_member(
    request: InviteUserRequest,
    context: B2BPartnerContext = Depends(require_b2b_admin),
) -> dict:
    """
    Invite a new team member to the organization.

    Requires admin or owner role.
    """
    partner_service = get_b2b_partner_service()

    # Check if user already exists
    existing = await partner_service.get_user_by_email(request.email, context.org_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists in organization",
        )

    # Generate temporary password (user will be prompted to change)
    import secrets

    temp_password = secrets.token_urlsafe(16)

    try:
        user = await partner_service.create_user(
            org_id=context.org_id,
            email=request.email,
            name=request.name,
            password=temp_password,
            role=PartnerRole(request.role),
        )

        logger.info(f"Team member invited: {request.email} to org: {context.org_id}")

        return {
            "user": user.to_dict(),
            "temporary_password": temp_password,  # Return only on creation
            "message": "Team member invited successfully. Share the temporary password securely.",
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put("/me/team/{user_id}")
async def update_team_member(
    user_id: str,
    request: UpdateUserRequest,
    context: B2BPartnerContext = Depends(require_b2b_admin),
) -> dict:
    """
    Update a team member's information.

    Requires admin or owner role.
    """
    partner_service = get_b2b_partner_service()

    # Get user to verify same org
    user = await partner_service.get_user(user_id)
    if not user or user.org_id != context.org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in organization",
        )

    # Prevent demoting owner
    if user.role == PartnerRole.OWNER and request.role and request.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change owner role. Transfer ownership first.",
        )

    # Build update dict
    updates = {}
    if request.name:
        updates["name"] = request.name
    if request.role:
        updates["role"] = PartnerRole(request.role)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    updated_user = await partner_service.update_user(user_id, **updates)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    logger.info(f"Team member updated: {user_id} in org: {context.org_id}")

    return {"user": updated_user.to_dict(), "message": "User updated successfully"}


@router.delete("/me/team/{user_id}")
async def remove_team_member(
    user_id: str,
    context: B2BPartnerContext = Depends(require_b2b_admin),
) -> dict:
    """
    Remove a team member from the organization.

    Requires admin or owner role.
    """
    partner_service = get_b2b_partner_service()

    # Get user to verify same org
    user = await partner_service.get_user(user_id)
    if not user or user.org_id != context.org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in organization",
        )

    # Prevent removing owner
    if user.role == PartnerRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove organization owner",
        )

    # Prevent self-removal
    if user_id == context.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself. Ask another admin.",
        )

    success = await partner_service.delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove user",
        )

    logger.info(f"Team member removed: {user_id} from org: {context.org_id}")

    return {"message": "Team member removed successfully"}


# ==================== API Key Endpoints ====================


@router.get("/api-keys")
async def list_api_keys(
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> dict:
    """
    List all API keys for the organization.
    """
    partner_service = get_b2b_partner_service()

    keys = await partner_service.list_organization_api_keys(context.org_id)

    return {
        "api_keys": [k.to_dict() for k in keys],
        "total": len(keys),
    }


@router.post("/api-keys", response_model=CreateApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    request: CreateApiKeyRequest,
    context: B2BPartnerContext = Depends(require_b2b_admin),
) -> CreateApiKeyResponse:
    """
    Create a new API key for the organization.

    Requires admin or owner role.

    IMPORTANT: The raw API key is only returned once on creation!
    Store it securely as it cannot be retrieved again.
    """
    partner_service = get_b2b_partner_service()

    # Calculate expiration if provided
    expires_at = None
    if request.expires_days:
        from datetime import timedelta, timezone

        expires_at = datetime.now(timezone.utc) + timedelta(days=request.expires_days)

    try:
        api_key, raw_key = await partner_service.create_api_key(
            org_id=context.org_id,
            created_by_user_id=context.user_id,
            name=request.name,
            scopes=request.scopes,
            expires_at=expires_at,
        )

        logger.info(f"API key created: {api_key.key_id} for org: {context.org_id}")

        return CreateApiKeyResponse(
            key_id=api_key.key_id,
            name=api_key.name,
            api_key=raw_key,  # Only returned once!
            scopes=api_key.scopes,
            expires_at=api_key.expires_at.isoformat() if api_key.expires_at else None,
            message="API key created successfully. Store it securely - it won't be shown again!",
        )

    except Exception as e:
        logger.error(f"Failed to create API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key",
        )


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    context: B2BPartnerContext = Depends(require_b2b_admin),
) -> dict:
    """
    Revoke an API key.

    Requires admin or owner role.
    """
    partner_service = get_b2b_partner_service()

    # Get key to verify same org
    api_key = await partner_service.get_api_key(key_id)
    if not api_key or api_key.org_id != context.org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    revoked = await partner_service.revoke_api_key(key_id, context.user_id)
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke API key",
        )

    logger.info(f"API key revoked: {key_id} in org: {context.org_id}")

    return {"message": "API key revoked successfully"}
