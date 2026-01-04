"""
Firebase Authentication Router
Handles Firebase token validation and user claims management
"""

from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from app.service.firebase_admin_service import get_firebase_admin
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/api/auth/firebase", tags=["firebase-auth"])


class TokenValidationRequest(BaseModel):
    """Request body for token validation"""

    id_token: str


class TokenValidationResponse(BaseModel):
    """Response with validated user data"""

    uid: str
    email: str
    name: str
    role: str
    permissions: list[str]
    email_verified: bool


class UserClaimsResponse(BaseModel):
    """Response with user custom claims"""

    uid: str
    role: str
    permissions: list[str]


@router.post("/validate", response_model=TokenValidationResponse)
async def validate_firebase_token(
    request: TokenValidationRequest,
    authorization: Optional[str] = Header(None),
) -> TokenValidationResponse:
    """
    Validate Firebase ID token and return user claims.
    New users are assigned 'viewer' role by default.
    """
    firebase_admin = get_firebase_admin()

    # Use token from request body or Authorization header
    token = request.id_token
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No token provided",
        )

    claims = firebase_admin.verify_id_token(token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # If user has no role, set default role
    if claims.role == "viewer" and not claims.permissions:
        # Check if this is a new user and set initial claims
        user_record = firebase_admin.get_user(claims.uid)
        if user_record and not user_record.custom_claims:
            firebase_admin.set_custom_claims(claims.uid, "viewer", [])
            logger.info(f"Set default role 'viewer' for new user: {claims.uid}")

    return TokenValidationResponse(
        uid=claims.uid,
        email=claims.email,
        name=claims.name,
        role=claims.role,
        permissions=claims.permissions,
        email_verified=claims.email_verified,
    )


@router.get("/claims/{uid}", response_model=UserClaimsResponse)
async def get_user_claims(
    uid: str,
    authorization: str = Header(...),
) -> UserClaimsResponse:
    """
    Get custom claims for a user.
    Requires valid Firebase token in Authorization header.
    """
    firebase_admin = get_firebase_admin()

    # Verify the requesting user's token
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )

    token = authorization[7:]
    requester_claims = firebase_admin.verify_id_token(token)
    if not requester_claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Only admin can view other users' claims
    if requester_claims.uid != uid and requester_claims.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view other users' claims",
        )

    user_record = firebase_admin.get_user(uid)
    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    custom_claims = user_record.custom_claims or {}

    return UserClaimsResponse(
        uid=uid,
        role=custom_claims.get("role", "viewer"),
        permissions=custom_claims.get("permissions", []),
    )
