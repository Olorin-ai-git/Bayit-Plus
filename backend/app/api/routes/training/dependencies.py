"""Training platform authentication dependencies."""

import logging
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)

security = HTTPBearer()

TRAINING_TOKEN_EXPIRE_HOURS = 24
INVITE_TOKEN_EXPIRE_HOURS = 168  # 7 days
REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_training_token(user: TrainingUser) -> str:
    """Create a JWT for a training platform user."""
    expire = datetime.now(timezone.utc) + timedelta(
        hours=TRAINING_TOKEN_EXPIRE_HOURS
    )
    payload = {
        "sub": str(user.id),
        "partner_id": user.partner_id,
        "role": user.role,
        "email": user.email,
        "iss": "training.olorin.ai",
        "exp": expire,
    }
    return jwt.encode(
        payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )


def create_training_refresh_token(user: TrainingUser) -> str:
    """Create a long-lived refresh JWT for a training platform user."""
    expire = datetime.now(timezone.utc) + timedelta(
        days=REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(user.id),
        "partner_id": user.partner_id,
        "iss": "training.olorin.ai",
        "token_type": "refresh",
        "exp": expire,
    }
    return jwt.encode(
        payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )


async def validate_refresh_token(refresh_token: str) -> TrainingUser:
    """Validate a refresh JWT and return the user."""
    try:
        payload = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    if payload.get("iss") != "training.olorin.ai":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token issuer",
        )
    if payload.get("token_type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not a refresh token",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    user = await TrainingUser.get(user_id)
    if not user or user.status == "deactivated":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )
    return user


async def get_current_training_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TrainingUser:
    """Authenticate a training platform user from JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid training credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except jwt.PyJWTError:
        raise credentials_exception

    if payload.get("iss") != "training.olorin.ai":
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = await TrainingUser.get(user_id)
    if not user or user.status == "deactivated":
        raise credentials_exception

    return user


async def require_training_admin(
    user: TrainingUser = Depends(get_current_training_user),
) -> TrainingUser:
    """Require admin role and an active trial or paid subscription."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    partner = await IntegrationPartner.find_one({"partner_id": user.partner_id})
    if partner:
        tc = partner.training_config if isinstance(partner.training_config, dict) else {}
        trial_ends = tc.get("trial_ends_at")
        subscription = tc.get("stripe_subscription_id")
        if trial_ends is not None:
            if trial_ends.tzinfo is None:
                trial_ends = trial_ends.replace(tzinfo=timezone.utc)
            if trial_ends < datetime.now(timezone.utc) and not subscription:
                logger.warning(
                    "Trial expired — admin operation blocked",
                    extra={"partner_id": user.partner_id, "trial_ends_at": str(trial_ends)},
                )
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Trial expired. Upgrade your plan to continue.",
                )
    return user


async def require_training_teacher_or_admin(
    user: TrainingUser = Depends(get_current_training_user),
) -> TrainingUser:
    """D-13: teacher or admin can read reports and post overrides; viewer cannot."""
    if user.role not in {"admin", "teacher"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher or admin access required",
        )
    return user


async def require_superadmin(
    user: TrainingUser = Depends(get_current_training_user),
) -> TrainingUser:
    """Require superadmin role — gates all /superadmin routes."""
    if user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )
    return user


from app.services.training.credit_service import TrainingCreditService

_credit_service: TrainingCreditService | None = None


def _get_credit_service() -> TrainingCreditService:
    """Lazy-init singleton credit service."""
    global _credit_service
    if _credit_service is None:
        _credit_service = TrainingCreditService(settings)
    return _credit_service


async def deduct_training_credits(
    feature: str,
    user: TrainingUser,
) -> int:
    """
    Deduct AI credits for a training feature.

    Call this inside route handlers after auth but before
    the expensive AI operation. Returns credits_remaining.

    Raises:
        HTTPException 402 if insufficient credits.
    """
    svc = _get_credit_service()
    success, remaining = await svc.deduct(
        partner_id=user.partner_id,
        feature=feature,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient AI credits. Upgrade your plan for more credits.",
            headers={"X-Credits-Remaining": "0"},
        )
    return remaining
