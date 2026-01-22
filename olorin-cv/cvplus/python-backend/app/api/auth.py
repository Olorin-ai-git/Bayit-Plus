"""
Authentication API Module
Main entry point for authentication functionality

This module has been split into smaller files for maintainability:
- auth_schemas.py: Pydantic request/response models
- auth_dependencies.py: Dependency injection functions
- auth_endpoints.py: FastAPI route handlers
"""

from app.api.auth_schemas import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
)

from app.api.auth_dependencies import (
    security,
    get_current_user,
    get_current_user_response,
)

from app.api.auth_endpoints import router

__all__ = [
    "router",
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "UserResponse",
    "security",
    "get_current_user",
    "get_current_user_response",
]
