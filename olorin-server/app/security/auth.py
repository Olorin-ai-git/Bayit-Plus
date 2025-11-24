"""
JWT Authentication and Authorization for Olorin API
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class TokenData(BaseModel):
    username: Optional[str] = None
    scopes: list[str] = []


class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None
    scopes: list[str] = []


class UserInDB(User):
    hashed_password: str


# Security configuration - Load JWT secret from Firebase Secrets Manager with development fallback
def _get_jwt_secret() -> str:
    """
    Get JWT secret from Firebase Secrets Manager with fallback for development.
    """
    try:
        from app.service.config_loader import get_config_loader
        config_loader = get_config_loader()
        jwt_config = config_loader.load_jwt_config()
        secret_key = jwt_config.get("secret_key")
        
        if secret_key:
            logger.info("JWT secret loaded from Firebase Secrets Manager")
            return secret_key
    except Exception as e:
        logger.warning(f"Failed to load JWT secret from Firebase Secrets Manager: {e}")
    
    # Fallback to environment variable for development
    env_secret = os.getenv("JWT_SECRET_KEY")
    if env_secret:
        logger.info("Using JWT secret from environment variable")
        return env_secret
    
    # Final fallback for development/testing
    logger.warning("Using fallback JWT secret for development - DO NOT USE IN PRODUCTION")
    return "olorin-development-jwt-secret-key-fallback-for-testing-only"


SECRET_KEY = _get_jwt_secret()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token
security = HTTPBearer()

# Fake users database (replace with real database in production)
fake_users_db = {
    "admin": {
        "username": "admin",
        "full_name": "Admin User",
        "email": "admin@olorin.com",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
        "disabled": False,
        "scopes": ["read", "write", "admin"],
    },
    "investigator": {
        "username": "investigator",
        "full_name": "Fraud Investigator",
        "email": "investigator@olorin.com",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
        "disabled": False,
        "scopes": ["read", "write"],
    },
    "viewer": {
        "username": "viewer",
        "full_name": "Read Only User",
        "email": "viewer@olorin.com",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
        "disabled": False,
        "scopes": ["read"],
    },
}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def get_user(db: Dict[str, Any], username: str) -> Optional[UserInDB]:
    """Get user from database."""
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None


def authenticate_user(
    fake_db: Dict[str, Any], username: str, password: str
) -> Optional[UserInDB]:
    """Authenticate a user."""
    user = get_user(fake_db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """Get the current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, scopes=payload.get("scopes", []))
    except JWTError:
        raise credentials_exception

    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception

    return User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        disabled=user.disabled,
        scopes=user.scopes,
    )


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get the current active user."""
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_scopes(required_scopes: list[str]):
    """Dependency to require specific scopes."""

    async def check_scopes(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        for scope in required_scopes:
            if scope not in current_user.scopes:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Operation requires scope: {scope}",
                )
        return current_user

    return check_scopes


# Development mode auth bypass helper
def _get_dev_user() -> User:
    """Get a mock user for development mode without authentication."""
    return User(
        username="dev-user",
        email="dev@olorin.local",
        full_name="Development User",
        disabled=False,
        scopes=["read", "write", "admin"],
    )


def _create_dev_aware_scope_checker(required_scopes: list[str]):
    """Create a scope checker that allows dev mode without authentication."""

    async def check_scopes_with_dev(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(
            HTTPBearer(auto_error=False)
        ),
    ) -> User:
        env = os.getenv("APP_ENV", "local")

        # In development/staging, bypass authentication if no credentials provided
        if env != "prd" and credentials is None:
            return _get_dev_user()

        # If no credentials in production or credentials not provided, require auth
        if credentials is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Validate credentials
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            token = credentials.credentials
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
            token_data = TokenData(
                username=username, scopes=payload.get("scopes", [])
            )
        except JWTError:
            raise credentials_exception

        user = get_user(fake_users_db, username=token_data.username)
        if user is None:
            raise credentials_exception

        current_user = User(
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            disabled=user.disabled,
            scopes=user.scopes,
        )

        # Check if user is active
        if current_user.disabled:
            raise HTTPException(status_code=400, detail="Inactive user")

        # Check required scopes
        for scope in required_scopes:
            if scope not in current_user.scopes:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Operation requires scope: {scope}",
                )

        return current_user

    return check_scopes_with_dev


# Development-aware permission dependencies
require_read_or_dev = _create_dev_aware_scope_checker(["read"])
require_write_or_dev = _create_dev_aware_scope_checker(["write"])


# Common permission dependencies
require_read = require_scopes(["read"])
require_write = require_scopes(["write"])
require_admin = require_scopes(["admin"])


class SecurityHeaders:
    """
    Security headers for responses.

    This class now delegates to the configurable security headers middleware
    to comply with SYSTEM MANDATE requirement of no hardcoded values.
    """

    @staticmethod
    def get_headers() -> Dict[str, str]:
        """
        Get security headers from environment-driven configuration.

        Returns:
            Dictionary of security header names and values from config
        """
        from app.middleware.security_headers import get_security_headers
        return get_security_headers()
