"""
Beta Sessions API

Endpoints for managing dubbing sessions with credit checkpointing.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.database import get_database
from app.services.beta.credit_service import BetaCreditService
from app.services.beta.session_service import SessionBasedCreditService
from app.services.olorin.metering.service import MeteringService
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/beta/sessions", tags=["beta-sessions"])


class StartSessionRequest(BaseModel):
    """Start session request."""
    user_id: str
    feature: str = "live_dubbing"
    metadata: dict = {}


class StartSessionResponse(BaseModel):
    """Start session response."""
    session_id: str
    message: str


class CheckpointResponse(BaseModel):
    """Checkpoint response."""
    success: bool
    remaining_credits: int
    message: str


class EndSessionRequest(BaseModel):
    """End session request."""
    reason: str = "completed"


class EndSessionResponse(BaseModel):
    """End session response."""
    success: bool
    remaining_credits: int
    duration_seconds: float
    credits_consumed: int
    message: str


async def get_session_service(
    settings: Settings = Depends(get_settings),
    db = Depends(get_database)
) -> SessionBasedCreditService:
    """Dependency injection for SessionBasedCreditService."""
    metering_service = MeteringService()
    credit_service = BetaCreditService(
        settings=settings,
        metering_service=metering_service,
        db=db
    )
    return SessionBasedCreditService(
        credit_service=credit_service,
        settings=settings
    )


@router.post("/start", response_model=StartSessionResponse)
async def start_session(
    request: StartSessionRequest,
    session_service: SessionBasedCreditService = Depends(get_session_service)
):
    """
    Start a new dubbing session.

    Args:
        request: Start session request

    Returns:
        Session ID and confirmation
    """
    try:
        session_id = await session_service.start_dubbing_session(
            user_id=request.user_id,
            feature=request.feature,
            metadata=request.metadata
        )

        if not session_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to start session"
            )

        return StartSessionResponse(
            session_id=session_id,
            message="Session started successfully"
        )

    except Exception as e:
        logger.error(
            "Start session error",
            extra={"user_id": request.user_id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start session"
        )


@router.post("/{session_id}/checkpoint", response_model=CheckpointResponse)
async def checkpoint_session(
    session_id: str,
    session_service: SessionBasedCreditService = Depends(get_session_service)
):
    """
    Checkpoint session - deduct accumulated credits.

    Args:
        session_id: Session ID

    Returns:
        Checkpoint result with remaining credits
    """
    try:
        remaining = await session_service.checkpoint_session(session_id)

        if remaining is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or not active"
            )

        if remaining == 0:
            return CheckpointResponse(
                success=False,
                remaining_credits=0,
                message="Insufficient credits - session ended"
            )

        return CheckpointResponse(
            success=True,
            remaining_credits=remaining,
            message="Checkpoint completed"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Checkpoint error",
            extra={"session_id": session_id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Checkpoint failed"
        )


@router.post("/{session_id}/end", response_model=EndSessionResponse)
async def end_session(
    session_id: str,
    request: EndSessionRequest,
    session_service: SessionBasedCreditService = Depends(get_session_service)
):
    """
    End dubbing session - final credit deduction.

    Args:
        session_id: Session ID
        request: End session request

    Returns:
        Session summary with credits consumed
    """
    try:
        from app.models.beta_session import BetaSession
        
        # Get session before ending
        session = await BetaSession.find_one(BetaSession.session_id == session_id)
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # End session
        remaining = await session_service.end_session(
            session_id=session_id,
            reason=request.reason
        )

        # Refresh session to get final values
        session = await BetaSession.find_one(BetaSession.session_id == session_id)

        return EndSessionResponse(
            success=True,
            remaining_credits=remaining or 0,
            duration_seconds=session.duration_seconds(),
            credits_consumed=session.credits_consumed,
            message=f"Session ended: {request.reason}"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "End session error",
            extra={"session_id": session_id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end session"
        )
