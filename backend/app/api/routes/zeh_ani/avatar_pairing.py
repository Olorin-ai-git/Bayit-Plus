"""Zeh Ani Avatar Pairing API for tvOS QR code avatar creation."""

import secrets
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.logging_config import get_logger
from app.core.redis_client import get_redis_client
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User

logger = get_logger(__name__)
router = APIRouter(prefix="/zeh-ani/avatar/pairing", tags=["zeh-ani"])

PAIRING_TTL_SECONDS = 600
PAIRING_CODE_LENGTH = 6
REDIS_KEY_PREFIX = "avatar_pairing"


class StartPairingRequest(BaseModel):
    profile_id: str


class StartPairingResponse(BaseModel):
    session_id: str
    pairing_code: str
    qr_url: str
    expires_at: str


class StatusResponse(BaseModel):
    status: str
    created_avatar_id: str | None = None


class CompletePairingRequest(BaseModel):
    avatar_id: str


def _redis_key(session_id: str) -> str:
    return f"{REDIS_KEY_PREFIX}:{session_id}"


def _generate_pairing_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(PAIRING_CODE_LENGTH))


def _build_qr_url(session_id: str) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/pair/avatar/{session_id}"


async def _get_session(session_id: str, user: User) -> dict:
    redis = await get_redis_client()
    session = await redis.get(_redis_key(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Pairing session not found or expired")
    if session["user_id"] != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized for this session")
    return session


async def _update_session(session_id: str, session: dict) -> None:
    redis = await get_redis_client()
    await redis.set_with_ttl(_redis_key(session_id), session, PAIRING_TTL_SECONDS)


@router.post("/start", response_model=StartPairingResponse)
async def start_pairing(
    request: StartPairingRequest,
    user: User = Depends(get_current_user),
):
    """Create a new avatar pairing session for tvOS QR code flow."""
    session_id = secrets.token_urlsafe(32)
    pairing_code = _generate_pairing_code()
    expires_at = datetime.now(timezone.utc).isoformat()

    session = {
        "session_id": session_id,
        "pairing_code": pairing_code,
        "user_id": str(user.id),
        "profile_id": request.profile_id,
        "status": "waiting",
        "created_avatar_id": None,
        "expires_at": expires_at,
    }

    redis = await get_redis_client()
    await redis.set_with_ttl(_redis_key(session_id), session, PAIRING_TTL_SECONDS)

    qr_url = _build_qr_url(session_id)
    logger.info(
        "Avatar pairing session created",
        extra={"session_id": session_id, "user_id": str(user.id)},
    )

    return StartPairingResponse(
        session_id=session_id,
        pairing_code=pairing_code,
        qr_url=qr_url,
        expires_at=expires_at,
    )


@router.get("/{session_id}/status", response_model=StatusResponse)
async def get_pairing_status(
    session_id: str,
    user: User = Depends(get_current_user),
):
    """Poll pairing session status (tvOS polls every 3s)."""
    session = await _get_session(session_id, user)
    return StatusResponse(
        status=session["status"],
        created_avatar_id=session.get("created_avatar_id"),
    )


@router.post("/{session_id}/scan")
async def scan_pairing(
    session_id: str,
    user: User = Depends(get_current_user),
):
    """Mobile app notifies that the QR code was scanned."""
    session = await _get_session(session_id, user)

    if session["status"] not in ("waiting", "scanned"):
        raise HTTPException(status_code=409, detail="Session not in scannable state")

    session["status"] = "scanned"
    await _update_session(session_id, session)

    logger.info(
        "Avatar pairing scanned",
        extra={"session_id": session_id, "user_id": str(user.id)},
    )
    return {"status": "scanned"}


@router.post("/{session_id}/complete")
async def complete_pairing(
    session_id: str,
    request: CompletePairingRequest,
    user: User = Depends(get_current_user),
):
    """Mobile app notifies that avatar creation is complete."""
    session = await _get_session(session_id, user)

    if session["status"] == "completed":
        raise HTTPException(status_code=409, detail="Session already completed")

    session["status"] = "completed"
    session["created_avatar_id"] = request.avatar_id
    await _update_session(session_id, session)

    logger.info(
        "Avatar pairing completed",
        extra={
            "session_id": session_id,
            "avatar_id": request.avatar_id,
            "user_id": str(user.id),
        },
    )
    return {"status": "completed", "avatar_id": request.avatar_id}
