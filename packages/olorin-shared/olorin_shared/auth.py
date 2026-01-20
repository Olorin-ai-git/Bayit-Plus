"""
Unified JWT authentication for Olorin.ai ecosystem platforms.

Consolidates JWT token creation, verification, and claims handling
used by both Fraud Detection and Bayit+ platforms.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from pydantic import BaseModel, Field


class TokenPayload(BaseModel):
    """JWT token payload schema."""

    sub: str = Field(..., description="Subject (typically user ID)")
    exp: datetime = Field(..., description="Token expiration time")
    iat: datetime = Field(..., description="Token issued at time")
    type: str = Field(default="access", description="Token type (access, refresh)")
    extra_data: Optional[Dict[str, Any]] = Field(default=None, description="Additional claims")


class TokenConfig:
    """JWT configuration parameters."""

    # Load from environment with sensible defaults
    SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY",
        os.getenv("SECRET_KEY", "dev-secret-key-change-in-production"),
    )
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
    secret_key: Optional[str] = None,
    algorithm: Optional[str] = None,
) -> str:
    """
    Create a JWT access token.

    Args:
        data: Claims to include in token (must include 'sub' for subject)
        expires_delta: Optional custom expiration delta
        secret_key: Optional custom secret key (defaults to config)
        algorithm: Optional custom algorithm (defaults to config)

    Returns:
        Encoded JWT token

    Raises:
        ValueError: If 'sub' not in data
    """
    if "sub" not in data:
        raise ValueError("Token data must include 'sub' (subject)")

    to_encode = data.copy()
    now = datetime.now(timezone.utc)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=TokenConfig.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": now,
        "type": to_encode.pop("type", "access"),
    })

    secret = secret_key or TokenConfig.SECRET_KEY
    algo = algorithm or TokenConfig.ALGORITHM

    encoded_jwt = jwt.encode(to_encode, secret, algorithm=algo)
    return encoded_jwt


def create_refresh_token(
    user_id: str,
    expires_delta: Optional[timedelta] = None,
    secret_key: Optional[str] = None,
    algorithm: Optional[str] = None,
) -> str:
    """
    Create a JWT refresh token.

    Args:
        user_id: User ID for subject claim
        expires_delta: Optional custom expiration delta
        secret_key: Optional custom secret key
        algorithm: Optional custom algorithm

    Returns:
        Encoded JWT refresh token
    """
    if expires_delta is None:
        expires_delta = timedelta(days=TokenConfig.REFRESH_TOKEN_EXPIRE_DAYS)

    return create_access_token(
        data={"sub": user_id, "type": "refresh"},
        expires_delta=expires_delta,
        secret_key=secret_key,
        algorithm=algorithm,
    )


def verify_access_token(
    token: str,
    secret_key: Optional[str] = None,
    algorithm: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Verify and decode JWT access token.

    Args:
        token: JWT token to verify
        secret_key: Optional custom secret key
        algorithm: Optional custom algorithm

    Returns:
        Decoded token payload

    Raises:
        jwt.InvalidTokenError: If token is invalid, expired, or malformed
        ValueError: If token type is not 'access'
    """
    secret = secret_key or TokenConfig.SECRET_KEY
    algo = algorithm or TokenConfig.ALGORITHM

    try:
        payload = jwt.decode(token, secret, algorithms=[algo])

        # Verify token type
        token_type = payload.get("type", "access")
        if token_type != "access":
            raise ValueError(f"Invalid token type: {token_type}, expected 'access'")

        return payload

    except jwt.ExpiredSignatureError as e:
        raise jwt.InvalidTokenError("Token has expired") from e
    except jwt.InvalidTokenError as e:
        raise jwt.InvalidTokenError(f"Invalid token: {str(e)}") from e


def verify_refresh_token(
    token: str,
    secret_key: Optional[str] = None,
    algorithm: Optional[str] = None,
) -> str:
    """
    Verify and extract user ID from refresh token.

    Args:
        token: JWT refresh token to verify
        secret_key: Optional custom secret key
        algorithm: Optional custom algorithm

    Returns:
        User ID from token

    Raises:
        jwt.InvalidTokenError: If token is invalid or expired
        ValueError: If token type is not 'refresh'
    """
    secret = secret_key or TokenConfig.SECRET_KEY
    algo = algorithm or TokenConfig.ALGORITHM

    try:
        payload = jwt.decode(token, secret, algorithms=[algo])

        # Verify token type
        token_type = payload.get("type", "access")
        if token_type != "refresh":
            raise ValueError(f"Invalid token type: {token_type}, expected 'refresh'")

        return payload.get("sub", "")

    except jwt.ExpiredSignatureError as e:
        raise jwt.InvalidTokenError("Refresh token has expired") from e
    except jwt.InvalidTokenError as e:
        raise jwt.InvalidTokenError(f"Invalid refresh token: {str(e)}") from e


def extract_user_id(token: str, secret_key: Optional[str] = None) -> Optional[str]:
    """
    Extract user ID from token without full verification (for logging/debugging only).

    Args:
        token: JWT token
        secret_key: Optional custom secret key

    Returns:
        User ID if present in token, None otherwise
    """
    try:
        secret = secret_key or TokenConfig.SECRET_KEY
        algo = TokenConfig.ALGORITHM
        payload = jwt.decode(token, secret, algorithms=[algo])
        return payload.get("sub")
    except jwt.InvalidTokenError:
        return None
