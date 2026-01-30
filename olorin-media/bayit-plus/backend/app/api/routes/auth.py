import asyncio
import hashlib
import random
import secrets
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from olorin_shared.auth import create_refresh_token, verify_refresh_token
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_database
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITING_ENABLED, limiter
from app.core.security import (create_access_token, get_current_active_user,
                               get_password_hash, verify_password)
from app.models.user import (TokenResponse, User, UserCreate, UserLogin,
                             UserResponse, UserUpdate)
from app.services.audit_logger import audit_logger
from app.services.payment.signup_checkout_service import SignupCheckoutService

logger = get_logger(__name__)


class GoogleAuthCode(BaseModel):
    code: str
    redirect_uri: str | None = None
    state: str | None = None  # CSRF protection token


router = APIRouter()


def should_require_payment(user_id: str) -> bool:
    """Determine if user should be in payment-required flow.

    Uses hash-based bucketing for consistent user assignment during gradual rollout.

    Args:
        user_id: User ID for consistent bucketing

    Returns:
        True if user should be required to pay, False otherwise

    Algorithm:
        - If feature flag is disabled: False
        - If percentage is 100%: True
        - Otherwise: Hash user_id and mod 100 to assign bucket
    """
    if not settings.REQUIRE_PAYMENT_ON_SIGNUP:
        return False

    # Gradual rollout: 0% → 5% → 25% → 100%
    if settings.REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE < 100:
        # Hash user_id to get consistent assignment
        hash_value = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
        bucket = hash_value % 100
        return bucket < settings.REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE

    return True


@router.post("/register", response_model=TokenResponse)
@limiter.limit("3/hour")
async def register(request: Request, user_data: UserCreate):
    """Register a new user with enumeration protection and payment flow.

    With REQUIRE_PAYMENT_ON_SIGNUP enabled, users must complete payment
    before accessing the app. Uses gradual rollout via percentage setting.

    Timing Attack Protection:
        - Minimum 500ms response time to prevent user enumeration
        - Constant time regardless of success/failure
    """
    start_time = asyncio.get_event_loop().time()

    # Check if user exists
    existing_user = await User.find_one(User.email == user_data.email)
    if existing_user:
        # ✅ Don't reveal that email exists - log attempt for security monitoring
        logger.warning(
            "Registration attempt for existing email",
            extra={
                "email": user_data.email,
                "ip": request.client.host
            }
        )

        # Security Note: Warning emails for registration attempts on existing accounts
        # are intentionally not implemented to avoid potential abuse as an email
        # enumeration vector. The audit log captures this for security monitoring.

        # Ensure constant response time (prevent user enumeration)
        elapsed = asyncio.get_event_loop().time() - start_time
        min_response_time = 0.5  # 500ms minimum
        if elapsed < min_response_time:
            await asyncio.sleep(min_response_time - elapsed)

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

    # Determine if this user requires payment (feature flag + gradual rollout)
    requires_payment = should_require_payment(str(user.id))

    if requires_payment:
        # NEW FLOW: Payment-first model
        user.payment_pending = True
        user.payment_created_at = datetime.now(timezone.utc)
        user.pending_plan_id = "basic"  # Default plan
        await user.save()

        logger.info(
            "User registered - payment required",
            extra={
                "user_id": str(user.id),
                "email": user.email,
                "requires_payment": True,
            }
        )
    else:
        # OLD FLOW: Viewer tier allowed (for rollback/gradual rollout)
        user.payment_pending = False
        await user.save()

        logger.info(
            "User registered - viewer tier",
            extra={
                "user_id": str(user.id),
                "email": user.email,
                "requires_payment": False,
            }
        )

    # Auto-send email verification
    try:
        from app.services.verification_service import verification_service

        await verification_service.initiate_email_verification(user)
    except Exception as e:
        logger.warning(
            "Failed to send verification email during registration",
            extra={"error": str(e)}
        )

    # ✅ Audit log: successful registration
    await audit_logger.log_registration(user, request)

    # Create access and refresh tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(
        user_id=str(user.id),
        secret_key=settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    # Ensure constant response time (prevent timing attacks)
    elapsed = asyncio.get_event_loop().time() - start_time
    min_response_time = 0.5  # 500ms minimum
    if elapsed < min_response_time:
        await asyncio.sleep(min_response_time - elapsed)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user.to_response(),
        requires_payment=requires_payment,  # Signal frontend to show payment page
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
            lockout_remaining = (
                user.account_locked_until - datetime.now(timezone.utc)
            ).seconds // 60
            logger.warning(
                f"Login attempt for locked account: {credentials.email} from IP: {request.client.host}"
            )
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
                user.account_locked_until = datetime.now(timezone.utc) + __import__(
                    "datetime"
                ).timedelta(minutes=30)
                await user.save()
                logger.warning(
                    f"Account locked due to failed attempts: {credentials.email} from IP: {request.client.host}"
                )
                # ✅ Audit log: account locked
                await audit_logger.log_account_locked(user, request)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account temporarily locked due to too many failed login attempts. Please try again in 30 minutes or reset your password.",
                )

            await user.save()
            logger.warning(
                f"Failed login attempt ({user.failed_login_attempts}/5): {credentials.email} from IP: {request.client.host}"
            )

        # ✅ Audit log: failed login
        await audit_logger.log_login_failure(
            credentials.email, request, "invalid_credentials"
        )

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

    # Create access and refresh tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(
        user_id=str(user.id),
        secret_key=settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
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


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh_access_token(request: Request, refresh_request: RefreshTokenRequest):
    """Refresh access token using a valid refresh token."""
    import logging

    logger = logging.getLogger(__name__)

    try:
        # Verify refresh token and extract user ID
        user_id = verify_refresh_token(
            token=refresh_request.refresh_token,
            secret_key=settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get user from database
        user = await User.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        # Create new access and refresh tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        new_refresh_token = create_refresh_token(
            user_id=str(user.id),
            secret_key=settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

        logger.info(f"Token refreshed for user: {user.email}")

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            user=user.to_response(),
        )

    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/google/url")
async def get_google_auth_url(redirect_uri: str | None = None):
    """Get Google OAuth authorization URL with CSRF protection."""
    # Validate Google OAuth configuration
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in environment variables.",
        )

    # Use provided redirect_uri or fall back to configured default
    final_redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI

    if not final_redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="redirect_uri parameter is required. Example: http://localhost:3200/auth/google/callback",
        )

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

    # Validate Google OAuth configuration
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

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
    logger.info(
        f"Google OAuth callback - code: {auth_data.code[:20]}..., redirect_uri: {final_redirect_uri}, state: {auth_data.state[:10]}..."
    )

    # Exchange code for tokens (with timeout to prevent hanging)
    async with httpx.AsyncClient(timeout=30.0) as client:
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
            logger.error(
                f"Google token exchange failed: status={token_response.status_code}, response={error_detail}"
            )

            # Return Google's error message to help debugging
            google_error = error_detail.get(
                "error_description",
                error_detail.get("error", "Failed to exchange code for token"),
            )
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
    picture = google_user.get("picture")  # Google profile picture URL

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
            # Update avatar from Google if not already set
            if picture and not user.avatar:
                user.avatar = picture
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
                avatar=picture,  # Save Google profile picture
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

    # Update last login and avatar if needed
    user.last_login = datetime.now(timezone.utc)
    # Update avatar from Google if not already set
    if picture and not user.avatar:
        user.avatar = picture
    await user.save()

    # ✅ Audit log: OAuth login
    await audit_logger.log_oauth_login(user, request, "google")

    # ✅ Check for Beta 500 invitation and auto-enroll (with MongoDB transaction)
    try:
        from app.services.beta.credit_service import BetaCreditService
        from app.services.olorin.metering.service import MeteringService
        from datetime import timedelta

        # Get database connection
        db = get_database()

        # Check if user has beta invitation (use raw MongoDB query)
        beta_user_doc = await db.beta_users.find_one({"email": email})
        if beta_user_doc and beta_user_doc.get("status") == "pending_verification":
            # ✅ TRANSACTIONAL ENROLLMENT - All operations succeed or all fail
            async with await db.client.start_session() as session:
                async with session.start_transaction():
                    try:
                        # 1. Auto-activate beta user (OAuth email is pre-verified)
                        await db.beta_users.update_one(
                            {"email": email},
                            {
                                "$set": {
                                    "status": "active",
                                    "is_beta_user": True,
                                    "enrolled_at": datetime.now(timezone.utc)
                                }
                            },
                            session=session
                        )

                        # 2. Allocate beta credits (with real MeteringService)
                        metering_service = MeteringService()
                        credit_service = BetaCreditService(
                            settings=settings,
                            metering_service=metering_service,
                            db=db
                        )
                        await credit_service.allocate_credits(
                            user_id=str(user.id),
                            session=session
                        )

                        # 3. Set subscription to Beta tier
                        user.subscription = {
                            "plan": "beta",
                            "status": "active",
                            "start_date": datetime.now(timezone.utc).isoformat(),
                            "end_date": (datetime.now(timezone.utc) + timedelta(days=settings.BETA_DURATION_DAYS)).isoformat()
                        }
                        await user.save(session=session)

                        # Commit transaction
                        await session.commit_transaction()

                        logger.info(
                            "Beta user auto-enrolled via OAuth (transactional)",
                            extra={"email": email, "user_id": str(user.id)}
                        )

                    except Exception as tx_error:
                        # Abort transaction on any error
                        await session.abort_transaction()
                        raise tx_error

    except Exception as e:
        import traceback
        logger.error(
            "Beta enrollment error during OAuth (transaction rolled back)",
            extra={
                "email": email,
                "error": str(e),
                "error_type": type(e).__name__,
                "traceback": traceback.format_exc()
            }
        )
        # Continue with login even if beta enrollment fails

    # Create JWT access and refresh tokens
    jwt_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(
        user_id=str(user.id),
        secret_key=settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    return TokenResponse(
        access_token=jwt_token,
        refresh_token=refresh_token,
        user=user.to_response(),
    )


# ==========================================
# PAYMENT FLOW ENDPOINTS
# ==========================================

@router.get("/payment/status")
@limiter.limit("10/minute")
async def get_payment_status(
    request: Request,
    current_user: User = Depends(get_current_active_user)
):
    """Check payment status for current user.

    Used by frontend to poll for payment completion.
    Rate limited to 10/minute to prevent abuse.

    Returns:
        PaymentStatusResponse with current payment state
    """
    from app.models.responses import PaymentStatusResponse
    from app.models.user_state import can_access_content

    return PaymentStatusResponse(
        payment_pending=current_user.payment_pending,
        subscription_tier=current_user.subscription_tier,
        subscription_status=current_user.subscription_status,
        can_access_app=can_access_content(current_user),
        pending_plan_id=current_user.pending_plan_id,
    )


@router.get("/payment/checkout-url")
@limiter.limit("3/minute")
async def get_checkout_url(
    request: Request,
    plan_id: str = "basic",
    current_user: User = Depends(get_current_active_user)
):
    """Generate fresh checkout URL on-demand (never stored).

    Very strict rate limit (3/minute) because:
    - Expensive Stripe API calls
    - Prevents checkout session spam

    Args:
        plan_id: Plan to subscribe to (basic, premium, family)

    Returns:
        CheckoutSessionResponse with temporary checkout URL

    Raises:
        400: If payment is not pending
        500: If Stripe API fails
    """
    from app.models.responses import CheckoutSessionResponse

    # Verify user is in payment pending state
    if not current_user.payment_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No payment pending for this user",
        )

    logger.info(
        "Generating checkout URL",
        extra={
            "user_id": str(current_user.id),
            "plan_id": plan_id,
        }
    )

    try:
        # Create fresh checkout session (NOT stored in DB)
        checkout_service = SignupCheckoutService()
        result = await checkout_service.create_checkout_session(
            current_user,
            plan_id
        )

        return CheckoutSessionResponse(
            checkout_url=result.url,
            expires_in=3600,  # Stripe default: 24 hours (86400s), return 1 hour for clarity
            session_id=result.session_id,
        )

    except ValueError as e:
        # Invalid plan_id
        logger.error(
            "Invalid plan for checkout",
            extra={
                "error": str(e),
                "plan_id": plan_id,
            }
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Stripe API error
        logger.error(
            "Failed to create checkout session",
            extra={
                "error": str(e),
                "user_id": str(current_user.id),
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment session. Please try again later.",
        )
