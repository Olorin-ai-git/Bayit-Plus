"""AI feature access authorization dependencies.

Enforces the AI access tier logic:
  Admin          -> pass (unlimited, no credits deducted)
  Premium/Family -> pass (unlimited, no credits deducted)
  Beta-500       -> pass (caller deducts credits per use)
  Basic/Free     -> 403 Forbidden
"""

from fastapi import Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.database import get_database
from app.models.user import User
from app.api.dependencies.verification import get_current_active_user
from app.services.beta.credit_service import BetaCreditService
from app.services.olorin.metering.service import MeteringService


async def require_ai_access(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Require Admin, Premium/Family subscription, or Beta-500 enrollment.

    Does NOT check credit balance -- route handlers deduct credits
    for Beta users after this check passes.

    Raises:
        HTTPException: 403 if user lacks AI feature access.
    """
    if current_user.is_admin_role():
        return current_user

    if current_user.subscription_tier in ["premium", "family"]:
        return current_user

    if current_user.is_beta_user:
        return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="ai_feature_requires_premium",
    )


async def get_credit_service(
    settings: Settings = Depends(get_settings),
    db=Depends(get_database),
) -> BetaCreditService:
    """Dependency injection for BetaCreditService."""
    metering_service = MeteringService()
    return BetaCreditService(
        settings=settings,
        metering_service=metering_service,
        db=db,
    )
