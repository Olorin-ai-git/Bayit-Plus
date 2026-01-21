"""
Admin Router for Role Management
Allows admins to manage user roles and permissions
"""

from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.middleware.firebase_auth_middleware import AdminUser
from app.service.firebase_admin_service import get_firebase_admin
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Valid roles for the application
UserRole = Literal["admin", "investigator", "analyst", "viewer"]


class RoleUpdateRequest(BaseModel):
    """Request body for updating user role"""

    role: UserRole
    permissions: Optional[list[str]] = None


class RoleUpdateResponse(BaseModel):
    """Response after updating user role"""

    uid: str
    role: str
    permissions: list[str]
    success: bool
    message: str


class UserListItem(BaseModel):
    """User item in list response"""

    uid: str
    email: str
    display_name: Optional[str]
    role: str
    disabled: bool


class UserListResponse(BaseModel):
    """Response with list of users"""

    users: list[UserListItem]
    total: int


@router.put("/users/{uid}/role", response_model=RoleUpdateResponse)
async def update_user_role(
    uid: str,
    request: RoleUpdateRequest,
    current_user: AdminUser,
) -> RoleUpdateResponse:
    """
    Update user role (admin only).
    Sets Firebase custom claims for the specified user.
    """
    firebase_admin = get_firebase_admin()

    # Prevent self-demotion from admin
    if uid == current_user.uid and request.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot demote yourself from admin role",
        )

    # Verify target user exists
    user_record = firebase_admin.get_user(uid)
    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Set custom claims
    permissions = request.permissions or []
    success = firebase_admin.set_custom_claims(uid, request.role, permissions)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user role",
        )

    logger.info(
        f"Admin {current_user.email} updated role for {user_record.email}: {request.role}"
    )

    return RoleUpdateResponse(
        uid=uid,
        role=request.role,
        permissions=permissions,
        success=True,
        message=f"Role updated to {request.role}",
    )


@router.get("/users", response_model=UserListResponse)
async def list_users(
    current_user: AdminUser,
    limit: int = 100,
) -> UserListResponse:
    """
    List all users with their roles (admin only).
    Returns paginated list of users.
    """
    from firebase_admin import auth

    firebase_admin = get_firebase_admin()

    try:
        users_list = []
        page = auth.list_users(max_results=limit)

        for user in page.users:
            custom_claims = user.custom_claims or {}
            users_list.append(
                UserListItem(
                    uid=user.uid,
                    email=user.email or "",
                    display_name=user.display_name,
                    role=custom_claims.get("role", "viewer"),
                    disabled=user.disabled,
                )
            )

        return UserListResponse(
            users=users_list,
            total=len(users_list),
        )

    except Exception as e:
        logger.error(f"Failed to list users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list users",
        )


@router.get("/users/{uid}", response_model=UserListItem)
async def get_user(
    uid: str,
    current_user: AdminUser,
) -> UserListItem:
    """
    Get user details (admin only).
    """
    firebase_admin = get_firebase_admin()

    user_record = firebase_admin.get_user(uid)
    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    custom_claims = user_record.custom_claims or {}

    return UserListItem(
        uid=user_record.uid,
        email=user_record.email or "",
        display_name=user_record.display_name,
        role=custom_claims.get("role", "viewer"),
        disabled=user_record.disabled,
    )
