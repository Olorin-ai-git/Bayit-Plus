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
    """Decode and validate a JWT token with fallback for zero-downtime rotation.

    During JWT secret rotation, attempts validation with new SECRET_KEY first,
    then falls back to SECRET_KEY_OLD if present. This enables zero-downtime
    secret rotation where old tokens remain valid for 7 days.
    """
    try:
        # Try new secret first
        payload = shared_verify_access_token(
            token=token, secret_key=settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )
        return payload
    except (jwt.InvalidTokenError, ValueError) as e:
        # If new secret fails and old secret exists, try old secret
        if settings.SECRET_KEY_OLD:
            try:
                payload = shared_verify_access_token(
                    token=token,
                    secret_key=settings.SECRET_KEY_OLD,
                    algorithm=settings.ALGORITHM,
                )
                # Log successful validation with old secret for monitoring
                import logging

                logger = logging.getLogger(__name__)
                logger.warning(
                    "Token validated with OLD secret during rotation",
                    extra={"user_id": payload.get("sub"), "rotation_active": True},
                )
                return payload
            except (jwt.InvalidTokenError, ValueError):
                # Both secrets failed
                return None
        # No old secret configured, return None
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


async def verify_content_access(
    content,
    user: Optional[User],
    action: str = "view",
) -> None:
    """
    Verify that a user has permission to perform an action on content.

    Args:
        content: The content to check access for
        user: The current user (or None for anonymous)
        action: The action being performed (e.g., "view", "search", "stream")

    Raises:
        HTTPException: If access is denied
    """
    # Check if content is published
    if not getattr(content, "is_published", True):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )

    # Check visibility mode
    visibility_mode = getattr(content, "visibility_mode", "public")
    if visibility_mode == "private":
        # Private content requires authentication
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to access this content",
            )

    # Check subscription requirements
    requires_subscription = getattr(content, "requires_subscription", "none")
    if requires_subscription != "none":
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to access this content",
            )

        # Premium content requires premium or family subscription
        if requires_subscription in ["premium", "family"]:
            if not user.can_access_premium_features():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Premium subscription required to access this content",
                )

    # Check audiobook streaming restrictions
    if action == "stream":
        content_format = getattr(content, "content_format", None)
        if content_format == "audiobook":
            # Only admins can stream audiobooks
            if not user or not user.is_admin_user():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Audio content streaming is restricted to administrators",
                )


# ==========================================
# SESSION TOKEN SECURITY (PAYMENT FLOW)
# ==========================================

import hmac
import hashlib
from datetime import datetime, timezone

from app.core.logging_config import get_logger

logger = get_logger(__name__)


def generate_session_token(user_id: str, plan_id: str, secret_key: str) -> str:
    """Generate HMAC-signed token to bind checkout session to user.

    This prevents metadata tampering attacks where an attacker could:
    1. Intercept checkout session creation
    2. Modify metadata to change user_id or plan_id
    3. Complete payment for different user/plan

    By signing the metadata with HMAC-SHA256, we can verify:
    - Token was generated by our backend
    - Metadata has not been tampered with
    - Token is not expired

    Args:
        user_id: User ID to bind to session
        plan_id: Plan ID to bind to session
        secret_key: Secret key for HMAC signing

    Returns:
        Signed token in format: "user_id:plan_id:timestamp:signature"

    Example:
        >>> token = generate_session_token("123", "premium", secret)
        >>> # Returns: "123:premium:1706543210.123:abc123def..."
    """
    timestamp = str(datetime.now(timezone.utc).timestamp())
    message = f"{user_id}:{plan_id}:{timestamp}"

    # HMAC-SHA256 signature (tamper-proof)
    signature = hmac.new(
        secret_key.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    return f"{message}:{signature}"


def verify_session_token(
    token: str,
    secret_key: str,
    max_age_seconds: int = 7200,  # 2 hours default
) -> tuple[str, str]:
    """Verify session token and extract user_id, plan_id.

    Args:
        token: Signed token from generate_session_token
        secret_key: Secret key for HMAC verification
        max_age_seconds: Maximum token age in seconds (default 2 hours)

    Returns:
        Tuple of (user_id, plan_id)

    Raises:
        ValueError: If token is invalid, tampered, or expired

    Security Features:
        - Constant-time signature comparison (prevents timing attacks)
        - Timestamp validation (prevents replay attacks)
        - HMAC-SHA256 verification (prevents tampering)
    """
    try:
        parts = token.split(":")
        if len(parts) != 4:
            raise ValueError("Invalid token format")

        user_id, plan_id, timestamp_str, signature = parts
        message = f"{user_id}:{plan_id}:{timestamp_str}"

        # Verify signature using constant-time comparison
        expected_signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            logger.warning(
                "Session token signature mismatch",
                extra={"token_prefix": token[:20]}
            )
            raise ValueError("Invalid signature")

        # Check expiration
        timestamp = float(timestamp_str)
        age = datetime.now(timezone.utc).timestamp() - timestamp
        if age > max_age_seconds:
            logger.warning(
                "Session token expired",
                extra={"age_seconds": int(age), "max_age": max_age_seconds}
            )
            raise ValueError("Token expired")

        if age < 0:
            # Token from future (clock skew or tampering)
            logger.warning(
                "Session token from future",
                extra={"age_seconds": int(age)}
            )
            raise ValueError("Token from future")

        return user_id, plan_id

    except ValueError:
        raise
    except Exception as e:
        logger.error(
            "Session token verification failed",
            extra={"error": str(e)}
        )
        raise ValueError(f"Invalid token: {e}")
