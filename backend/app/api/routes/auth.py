from datetime import datetime
from urllib.parse import urlencode
import httpx
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from app.models.user import User, UserCreate, UserLogin, UserUpdate, UserResponse, TokenResponse
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user,
)
from app.core.config import settings


class GoogleAuthCode(BaseModel):
    code: str
    redirect_uri: str | None = None

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Register a new user."""
    # Check if user exists
    existing_user = await User.find_one(User.email == user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user as "viewer" (unverified)
    user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=get_password_hash(user_data.password),
        role="viewer",
        email_verified=False,
        phone_verified=False,
        is_verified=False,
    )
    await user.insert()

    # Auto-send email verification
    try:
        from app.services.verification_service import verification_service
        await verification_service.initiate_email_verification(user)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to send verification email during registration: {e}")

    # Create token
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        user=user.to_response(),
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with email and password."""
    user = await User.find_one(User.email == credentials.email)

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    # Update last login
    user.last_login = datetime.utcnow()
    await user.save()

    # Create token
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        user=user.to_response(),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Get current user info."""
    return current_user.to_response()


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    updates: UserUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update user profile."""
    if updates.name:
        current_user.name = updates.name
    if updates.email:
        # Check if email is taken
        existing = await User.find_one(User.email == updates.email)
        if existing and str(existing.id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use",
            )
        current_user.email = updates.email

    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    return current_user.to_response()


@router.post("/reset-password")
async def reset_password(email: str):
    """Request password reset."""
    user = await User.find_one(User.email == email)
    # Always return success to prevent email enumeration
    return {"message": "If an account exists, a password reset email has been sent"}


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    """Logout user (client should delete token)."""
    return {"message": "Logged out successfully"}


@router.get("/google/url")
async def get_google_auth_url(redirect_uri: str | None = None):
    """Get Google OAuth authorization URL."""
    # Use provided redirect_uri or fall back to configured default
    final_redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": final_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"url": url}


@router.post("/google/callback", response_model=TokenResponse)
async def google_callback(auth_data: GoogleAuthCode):
    """Handle Google OAuth callback."""
    # Use provided redirect_uri or fall back to configured default
    final_redirect_uri = auth_data.redirect_uri or settings.GOOGLE_REDIRECT_URI

    # Log the OAuth parameters for debugging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Google OAuth callback - code: {auth_data.code[:20]}..., redirect_uri: {final_redirect_uri}")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": auth_data.code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": final_redirect_uri,
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code != 200:
            # Log the actual error from Google
            error_detail = token_response.json() if token_response.text else {}
            logger.error(f"Google token exchange failed: status={token_response.status_code}, response={error_detail}")

            # Return Google's error message to help debugging
            google_error = error_detail.get("error_description", error_detail.get("error", "Failed to exchange code for token"))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google OAuth error: {google_error}",
            )

        tokens = token_response.json()
        access_token = tokens.get("access_token")

        # Get user info from Google
        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google",
            )

        google_user = userinfo_response.json()

    google_id = google_user.get("id")
    email = google_user.get("email")
    name = google_user.get("name", email.split("@")[0])

    # Check if user exists by google_id or email
    user = await User.find_one(User.google_id == google_id)

    if not user:
        # Check if email exists (user registered with email/password)
        user = await User.find_one(User.email == email)

        if user:
            # Link Google account to existing user
            user.google_id = google_id
            user.auth_provider = "google"
            user.email_verified = True  # Google pre-verified email
            user.email_verified_at = datetime.utcnow()
            user.update_verification_status()
            await user.save()
        else:
            # Create new user as "viewer" with email verified
            user = User(
                email=email,
                name=name,
                google_id=google_id,
                auth_provider="google",
                role="viewer",
                email_verified=True,  # Google pre-verified
                email_verified_at=datetime.utcnow(),
                phone_verified=False,
                is_verified=False,  # Still need phone verification
            )
            await user.insert()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    # Update last login
    user.last_login = datetime.utcnow()
    await user.save()

    # Create JWT token
    jwt_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=jwt_token,
        user=user.to_response(),
    )
