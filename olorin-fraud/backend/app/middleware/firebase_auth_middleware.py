"""
Firebase Authentication Middleware
Provides dependency injection for protected routes
"""

import os
from typing import Annotated, Optional

from fastapi import Depends, Header, HTTPException, Request, status

from app.service.firebase_admin_service import FirebaseUserClaims, get_firebase_admin
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def _get_dev_bypass_user() -> Optional[FirebaseUserClaims]:
    """
    ⚠️ DEVELOPMENT ONLY: Create a mock user for auth bypass.

    This function should NEVER be used in production.
    Only active when DEV_BYPASS_AUTH=true in environment.
    """
    if os.getenv("DEV_BYPASS_AUTH", "false").lower() != "true":
        return None

    # Log warning every time bypass is used
    logger.warning("🚨 DEV AUTH BYPASS ACTIVE - This should NEVER be enabled in production!")

    return FirebaseUserClaims(
        uid=os.getenv("DEV_BYPASS_USER_UID", "dev-bypass-user-001"),
        email=os.getenv("DEV_BYPASS_USER_EMAIL", "admin@olorin.local"),
        name=os.getenv("DEV_BYPASS_USER_NAME", "Dev Admin"),
        role=os.getenv("DEV_BYPASS_USER_ROLE", "admin"),
        permissions=["read", "write", "admin"],
        email_verified=True
    )


async def get_firebase_user(
    authorization: Optional[str] = Header(None),
) -> Optional[FirebaseUserClaims]:
    """
    Extract and verify Firebase token from Authorization header.
    Returns None if no token or invalid token.

    ⚠️ DEVELOPMENT MODE: If DEV_BYPASS_AUTH=true, returns mock user.
    """
    # ⚠️ DEVELOPMENT BYPASS - NEVER enable in production!
    dev_user = _get_dev_bypass_user()
    if dev_user:
        return dev_user

    # Normal Firebase authentication flow
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]
    firebase_admin = get_firebase_admin()
    return firebase_admin.verify_id_token(token)


async def require_firebase_auth(
    authorization: Optional[str] = Header(None),
) -> FirebaseUserClaims:
    """
    Require valid Firebase authentication.
    Raises 401 if no token or invalid token.

    ⚠️ DEVELOPMENT MODE: If DEV_BYPASS_AUTH=true, bypasses authentication.
    """
    # ⚠️ DEVELOPMENT BYPASS - NEVER enable in production!
    dev_user = _get_dev_bypass_user()
    if dev_user:
        return dev_user

    # Normal Firebase authentication flow
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization[7:]
    firebase_admin = get_firebase_admin()
    claims = firebase_admin.verify_id_token(token)

    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return claims


async def require_admin(
    user: Annotated[FirebaseUserClaims, Depends(require_firebase_auth)],
) -> FirebaseUserClaims:
    """
    Require admin role for the authenticated user.
    Raises 403 if user is not an admin.
    """
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def require_investigator(
    user: Annotated[FirebaseUserClaims, Depends(require_firebase_auth)],
) -> FirebaseUserClaims:
    """
    Require investigator or admin role.
    Raises 403 if user doesn't have sufficient permissions.
    """
    allowed_roles = ["admin", "investigator"]
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Investigator or admin access required",
        )
    return user


def require_role(*allowed_roles: str):
    """
    Factory function to create role requirement dependency.
    Usage: Depends(require_role("admin", "investigator"))
    """

    async def _require_role(
        user: Annotated[FirebaseUserClaims, Depends(require_firebase_auth)],
    ) -> FirebaseUserClaims:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {', '.join(allowed_roles)}",
            )
        return user

    return _require_role


# Type aliases for cleaner route definitions
FirebaseUser = Annotated[FirebaseUserClaims, Depends(require_firebase_auth)]
AdminUser = Annotated[FirebaseUserClaims, Depends(require_admin)]
InvestigatorUser = Annotated[FirebaseUserClaims, Depends(require_investigator)]
OptionalFirebaseUser = Annotated[Optional[FirebaseUserClaims], Depends(get_firebase_user)]
