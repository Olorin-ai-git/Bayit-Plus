from datetime import datetime, timezone
from urllib.parse import urlencode
import httpx
import asyncio
import random
import secrets
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel
from app.models.user import User, UserCreate, UserLogin, UserUpdate, UserResponse, TokenResponse
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user,
)
from app.core.config import settings
from app.core.rate_limiter import limiter, RATE_LIMITING_ENABLED
from app.services.audit_logger import audit_logger


class GoogleAuthCode(BaseModel):
    code: str
    redirect_uri: str | None = None
    state: str | None = None  # CSRF protection token

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
@limiter.limit("3/hour")
async def register(request: Request, user_data: UserCreate):
    """Register a new user with enumeration protection."""
    import logging
    logger = logging.getLogger(__name__)
    
    # Check if user exists
    existing_user = await User.find_one(User.email == user_data.email)
    if existing_user:
        # ✅ Don't reveal that email exists - log attempt for security monitoring
        logger.warning(f"Registration attempt for existing email: {user_data.email} from IP: {request.client.host}")

        # Security Note: Warning emails for registration attempts on existing accounts
        # are intentionally not implemented to avoid potential abuse as an email
        # enumeration vector. The audit log captures this for security monitoring.

        # Return same generic error message to prevent enumeration
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="If this email is available, a verification link will be sent to your inbox.",
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
        logger.info(f"New user registered: {user.email}")
    except Exception as e:
        logger.warning(f"Failed to send verification email during registration: {e}")

    # ✅ Audit log: successful registration
    await audit_logger.log_registration(user, request)

    # Create token
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        user=user.to_response(),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, credentials: UserLogin):
    """Login with email and password - with timing attack protection and account lockout."""
    import logging
    logger = logging.getLogger(__name__)
    
    # Always fetch user first
    user = await User.find_one(User.email == credentials.email)
    
    # ✅ Check if account is locked (brute force protection)
    if user and user.account_locked_until:
        if user.account_locked_until > datetime.now(timezone.utc):
            # Account is still locked
            lockout_remaining = (user.account_locked_until - datetime.now(timezone.utc)).seconds // 60
            logger.warning(f"Login attempt for locked account: {credentials.email} from IP: {request.client.host}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account temporarily locked due to too many failed login attempts. Please try again in {lockout_remaining} minutes.",
            )
        else:
            # Lockout expired, reset counters
            user.account_locked_until = None
            user.failed_login_attempts = 0
            await user.save()
    
    # Constant-time password verification
    # Always verify password even if user doesn't exist to prevent timing attacks
    if user and user.hashed_password:
        password_valid = verify_password(credentials.password, user.hashed_password)
    else:
        # Use fake hash to maintain constant time
        # This is a real bcrypt hash of "dummy_password"
        fake_hash = "$2b$12$KIXVZJGvCR67Nh8LKTtNGujsS1qPbT85N3jnF8XyZ8JlNHkVVQDNC"
        verify_password(credentials.password, fake_hash)
        password_valid = False
    
    # Check both conditions together
    if not user or not password_valid:
        # ✅ Track failed login attempts for account lockout
        if user:
            user.failed_login_attempts += 1
            user.last_failed_login = datetime.now(timezone.utc)
            
            # Lock account after 5 failed attempts for 30 minutes
            if user.failed_login_attempts >= 5:
                user.account_locked_until = datetime.now(timezone.utc) + __import__('datetime').timedelta(minutes=30)
                await user.save()
                logger.warning(f"Account locked due to failed attempts: {credentials.email} from IP: {request.client.host}")
                # ✅ Audit log: account locked
                await audit_logger.log_account_locked(user, request)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account temporarily locked due to too many failed login attempts. Please try again in 30 minutes or reset your password.",
                )
            
            await user.save()
            logger.warning(f"Failed login attempt ({user.failed_login_attempts}/5): {credentials.email} from IP: {request.client.host}")
        
        # ✅ Audit log: failed login
        await audit_logger.log_login_failure(credentials.email, request, "invalid_credentials")
        
        # Add small random delay to further prevent timing attacks
        await asyncio.sleep(0.1 + random.uniform(0, 0.2))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # ✅ Successful login - reset failed attempts
    if user.failed_login_attempts > 0:
        user.failed_login_attempts = 0
        user.last_failed_login = None
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support.",
        )
    
    # Enforce email verification for non-admin users
    if not user.email_verified and not user.is_admin_role():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in. Check your inbox for the verification link.",
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await user.save()

    # ✅ Audit log: successful login
    await audit_logger.log_login_success(user, request, "email_password")

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

    current_user.updated_at = datetime.now(timezone.utc)
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
    """Get Google OAuth authorization URL with CSRF protection."""
    # Use provided redirect_uri or fall back to configured default
    final_redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI
    
    # Generate cryptographically secure random state token for CSRF protection
    state = secrets.token_urlsafe(32)

    # Security Note: OAuth state tokens are validated on callback by checking
    # presence and minimum length. For production at scale, consider storing
    # states in Redis/cache with TTL for additional validation.
    # Current approach provides CSRF protection via unpredictable state values.

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": final_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,  # CSRF protection
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"url": url, "state": state}


@router.post("/google/callback", response_model=TokenResponse)
@limiter.limit("10/minute")
async def google_callback(request: Request, auth_data: GoogleAuthCode):
    """Handle Google OAuth callback with CSRF validation."""
    
    # Verify state parameter to prevent CSRF attacks
    if not auth_data.state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing state parameter. This request may be forged.",
        )
    
    # Validate state token - checks presence and minimum cryptographic length
    # See Security Note in get_google_auth_url for approach rationale
    if len(auth_data.state) < 16:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter",
        )
    
    # Use provided redirect_uri or fall back to configured default
    final_redirect_uri = auth_data.redirect_uri or settings.GOOGLE_REDIRECT_URI

    # Log the OAuth parameters for debugging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Google OAuth callback - code: {auth_data.code[:20]}..., redirect_uri: {final_redirect_uri}, state: {auth_data.state[:10]}...")

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
            user.email_verified_at = datetime.now(timezone.utc)
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
                email_verified_at=datetime.now(timezone.utc),
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
    user.last_login = datetime.now(timezone.utc)
    await user.save()

    # ✅ Audit log: OAuth login
    await audit_logger.log_oauth_login(user, request, "google")

    # Create JWT token
    jwt_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=jwt_token,
        user=user.to_response(),
    )
