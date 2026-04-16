"""Training platform authentication dependencies."""

import logging
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser
from app.models.trial_config import TrialConfig
from app.services.training.trial_service import check_trial_permits

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


async def _resolve_user_from_jwt(token: str) -> TrainingUser:
    """Decode a training JWT and return the user. Raises 401 on failure."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid training credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
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


def _parse_trial_config(partner) -> TrialConfig | None:
    """Extract a TrialConfig from the partner's dict-based training_config.

    Returns None when the partner has no training_config or no
    trial_config key inside it — i.e. paid orgs.
    """
    tc_raw = partner.training_config
    if tc_raw is None:
        return None
    if isinstance(tc_raw, dict):
        inner = tc_raw.get("trial_config")
    else:
        inner = getattr(tc_raw, "trial_config", None)
    if inner is None:
        return None
    if isinstance(inner, TrialConfig):
        return inner
    return TrialConfig(**inner)


async def _load_partner_for_user(user: TrainingUser):
    """Load the IntegrationPartner associated with a training user."""
    return await IntegrationPartner.find_one(
        {"partner_id": user.partner_id}
    )


async def get_current_training_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TrainingUser:
    """Authenticate a training platform user from JWT.

    Also enforces trial state: viewers (and admins) on a locked /
    cancelled / purged trial are blocked with 402.
    """
    user = await _resolve_user_from_jwt(credentials.credentials)

    partner = await _load_partner_for_user(user)
    if partner is not None:
        tc = _parse_trial_config(partner)
        # Wrap so check_trial_permits can access .training_config.trial_config
        wrapper = SimpleNamespace(
            training_config=SimpleNamespace(trial_config=tc)
        )
        await check_trial_permits(wrapper, "viewer_feature")

    return user


async def get_training_user_from_token(token: str) -> TrainingUser:
    """Authenticate from a raw JWT string (e.g. query param).

    Used by the proxy-stream endpoint where <video> elements cannot
    send Authorization headers.
    """
    return await _resolve_user_from_jwt(token)


_ADMIN_BLOCK_STATES = {"locked", "cancelled", "purged"}


async def require_training_admin(
    user: TrainingUser = Depends(get_current_training_user),
) -> TrainingUser:
    """Require admin role and an active trial or paid subscription.

    Uses TrialConfig.state instead of date-math so that the 3-day
    grace window (state="grace") is respected.
    """
    if user.role not in {"admin", "superadmin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    partner = await _load_partner_for_user(user)
    if partner is not None:
        tc = _parse_trial_config(partner)
        if tc is not None and tc.state in _ADMIN_BLOCK_STATES:
            logger.warning(
                "Trial %s — admin operation blocked",
                tc.state,
                extra={"partner_id": user.partner_id, "state": tc.state},
            )
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Trial ended. Upgrade to resume admin actions.",
            )
    return user


async def require_training_teacher_or_admin(
    user: TrainingUser = Depends(get_current_training_user),
) -> TrainingUser:
    """D-13: teacher or admin can read reports and post overrides; viewer cannot."""
    if user.role not in {"admin", "superadmin", "teacher"}:
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
