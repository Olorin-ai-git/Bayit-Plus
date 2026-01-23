from datetime import timedelta
from typing import Callable, List, Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from olorin_shared.auth import \
    create_access_token as shared_create_access_token
from olorin_shared.auth import \
    verify_access_token as shared_verify_access_token
from passlib.context import CryptContext

from app.core.config import settings
from app.models.passkey_credential import PasskeySession
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token using unified olorin-shared implementation."""
    return shared_create_access_token(
        data=data,
        expires_delta=expires_delta,
        secret_key=settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = shared_verify_access_token(
            token=token, secret_key=settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )
        return payload
    except (jwt.InvalidTokenError, ValueError):
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """Get the current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = await User.get(user_id)
    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current user and verify they are active."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[User]:
    """Get user if authenticated, otherwise return None."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def get_current_premium_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Get current user and verify they have premium access."""
    if not current_user.can_access_premium_features():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required for this feature",
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Get current user and verify they have admin access."""
    if not current_user.is_admin_user():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def require_role(allowed_roles: List[str]) -> Callable:
    """
    Create a dependency that requires the user to have one of the specified roles.

    Args:
        allowed_roles: List of role names that are allowed (e.g., ['admin', 'support'])

    Returns:
        A FastAPI dependency function that validates user role.

    Usage:
        @router.get('/admin/endpoint')
        async def admin_endpoint(current_user: User = Depends(require_role(['admin']))):
            ...
    """

    async def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        # super_admin has access to everything
        if current_user.role == "super_admin":
            return current_user

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


async def get_passkey_session(request: Request) -> Optional[PasskeySession]:
    """
    Get the passkey session from X-Passkey-Session header if present and valid.

    Returns the session if valid, None otherwise.
    """
    session_token = request.headers.get("X-Passkey-Session")
    if not session_token:
        return None

    session = await PasskeySession.find_one(
        PasskeySession.session_token == session_token,
        PasskeySession.is_revoked == False,
    )

    if not session or not session.is_valid():
        return None

    return session


# Alias for semantic clarity in proxy endpoints
# Indicates that this dependency verifies OAuth token credentials
verify_oauth_token = get_current_user


async def has_passkey_access(request: Request) -> bool:
    """
    Check if the request has a valid passkey session.

    Returns True if the request includes a valid passkey session token.
    """
    session = await get_passkey_session(request)
    return session is not None


async def require_passkey_session(
    request: Request,
) -> PasskeySession:
    """
    Require a valid passkey session for this endpoint.

    Raises 403 if no valid passkey session is present.
    """
    session = await get_passkey_session(request)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Passkey authentication required to access this content",
        )
    return session
