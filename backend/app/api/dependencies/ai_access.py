"""AI feature access authorization dependencies.

Freemium model:
  Admin          -> pass (unlimited, no credits deducted)
  Plus (active)  -> pass (generous credits, deducted per use)
  Free           -> pass (limited credits, deducted per use)
  Credit check is done at deduction time, not here.
"""

from fastapi import Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.database import get_database
from app.models.user import User
from app.models.user_state import can_access_ai
from app.api.dependencies.verification import get_current_active_user
from app.services.beta.credit_service import BetaCreditService
from app.services.olorin.metering.service import MeteringService


async def require_ai_access(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Require that the user can access AI features.

    Admins: unlimited access.
    Plus subscribers: access with generous monthly credits.
    Free users: access with limited monthly credits.
    Credit balance enforcement happens at deduction time.

    Raises:
        HTTPException: 403 if user is suspended or otherwise blocked.
    """
    if not can_access_ai(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ai_access_blocked",
        )

    return current_user


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
