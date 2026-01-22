"""
Authentication API Endpoints
Route handlers for user registration, login, logout, and token management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPAuthorizationCredentials

from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.core.password_validator import validate_password_strength
from app.services.account_lockout_service import AccountLockoutService
from app.models import User
from app.core.config import get_settings
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

router = APIRouter(prefix="/auth", tags=["authentication"])
settings = get_settings()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, response: Response):
    """
    Register a new user account

    Creates a new user with hashed password and returns JWT access token
    """
    existing_user = await User.find_one(User.email == user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    password_error = validate_password_strength(user_data.password)
    if password_error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=password_error,
        )

    hashed_password = get_password_hash(user_data.password)

    user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        role="FREE_USER",
        subscription_tier="free",
        is_active=True,
    )

    await user.save()

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.jwt_access_token_expire_minutes * 60,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_access_token_expire_minutes * 60,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "subscription_tier": user.subscription_tier,
            "is_active": user.is_active,
        },
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request, response: Response):
    """
    Authenticate user and return JWT access token

    Validates credentials and returns token if authentication succeeds
    """
    is_locked = await AccountLockoutService.is_account_locked(credentials.email)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked due to multiple failed attempts. Please try again in 15 minutes.",
        )

    user = await User.find_one(User.email == credentials.email)
    client_ip = request.client.host if request.client else "unknown"

    if not user:
        await AccountLockoutService.record_login_attempt(
            credentials.email, client_ip, success=False
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(credentials.password, user.password_hash):
        await AccountLockoutService.record_login_attempt(
            credentials.email, client_ip, success=False
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    await AccountLockoutService.record_login_attempt(
        credentials.email, client_ip, success=True
    )
    await AccountLockoutService.clear_failed_attempts(credentials.email)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.jwt_access_token_expire_minutes * 60,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_access_token_expire_minutes * 60,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "subscription_tier": user.subscription_tier,
            "is_active": user.is_active,
        },
    )


@router.post("/logout")
async def logout(response: Response, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Logout user (clear httpOnly cookie)

    Clears the httpOnly access_token cookie to log user out
    """
    response.delete_cookie(key="access_token", samesite="strict", secure=True)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user_response: UserResponse = Depends(get_current_user_response),
):
    """
    Get current authenticated user information

    Returns user profile data for the authenticated user
    """
    return user_response


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(user: User = Depends(get_current_user)):
    """
    Refresh JWT access token

    Issues a new token with extended expiration
    """
    new_access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=settings.jwt_access_token_expire_minutes * 60,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "subscription_tier": user.subscription_tier,
            "is_active": user.is_active,
        },
    )
