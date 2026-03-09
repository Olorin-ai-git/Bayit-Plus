"""Device code authentication endpoints for TV login (RFC 8628)."""
import secrets
import string
import time
from dataclasses import dataclass
from threading import Lock
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter

logger = get_logger(__name__)
router = APIRouter(tags=["device-code"])

# In-process grant store. Replace with Redis/MongoDB for multi-instance Cloud Run deployments.
_store: dict[str, "_DeviceGrant"] = {}
_store_lock = Lock()


@dataclass
class _DeviceGrant:
    """Pending RFC 8628 device authorization grant."""

    device_code: str
    user_code: str
    device_id: str
    device_name: str
    expires_at: float
    status: str = "authorization_pending"  # authorization_pending | authorized | expired | denied
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


class DeviceCodeRequest(BaseModel):
    """Request body for initiating a device authorization flow."""

    device_id: str = Field(..., min_length=1, max_length=256)
    device_name: str = Field(..., min_length=1, max_length=128)


class DeviceCodeResponse(BaseModel):
    """RFC 8628 device authorization response."""

    device_code: str
    user_code: str
    verification_uri: str
    expires_in: int
    interval: int


class PollRequest(BaseModel):
    """Request body for polling authorization status."""

    device_code: str = Field(..., min_length=1)


class PollResponse(BaseModel):
    """Authorization poll result."""

    status: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


def _generate_user_code() -> str:
    """Return a user code in AAAA-DDDD format using cryptographically secure randomness."""
    alpha = "".join(secrets.choice(string.ascii_uppercase) for _ in range(4))
    digits = "".join(secrets.choice(string.digits) for _ in range(4))
    return f"{alpha}-{digits}"


def _purge_expired() -> None:
    """Evict expired grants from the in-memory store (best-effort)."""
    now = time.time()
    for key in [k for k, v in _store.items() if v.expires_at < now]:
        _store.pop(key, None)


@router.post("/", response_model=DeviceCodeResponse, status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMITS.get("device_code_initiate", "10/minute"))
async def initiate_device_code(request: Request, body: DeviceCodeRequest) -> DeviceCodeResponse:
    """Initiate a device authorization flow (RFC 8628).

    Issues an opaque device_code for machine polling and a short user_code the
    TV displays so the viewer can authorize from a phone or browser.
    """
    _purge_expired()

    device_code = secrets.token_urlsafe(32)
    user_code = _generate_user_code()
    expires_in: int = settings.DEVICE_CODE_EXPIRY_SECONDS
    interval: int = settings.DEVICE_CODE_POLL_INTERVAL_SECONDS

    with _store_lock:
        _store[device_code] = _DeviceGrant(
            device_code=device_code,
            user_code=user_code,
            device_id=body.device_id,
            device_name=body.device_name,
            expires_at=time.time() + expires_in,
        )

    logger.info(
        "Device code issued",
        extra={"device_id": body.device_id, "device_name": body.device_name,
               "user_code": user_code, "expires_in": expires_in},
    )

    return DeviceCodeResponse(
        device_code=device_code,
        user_code=user_code,
        verification_uri=f"{settings.FRONTEND_URL}/tv/activate",
        expires_in=expires_in,
        interval=interval,
    )


@router.post("/poll", response_model=PollResponse, status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMITS.get("device_code_poll", "60/minute"))
async def poll_device_code(request: Request, body: PollRequest) -> PollResponse:
    """Poll authorization status for a pending device code (RFC 8628).

    Returns authorization_pending | authorized | expired | denied.
    Clients must respect the interval from the initiation response.
    """
    with _store_lock:
        grant = _store.get(body.device_code)

    if grant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="device_code not found")

    if grant.expires_at < time.time() and grant.status == "authorization_pending":
        with _store_lock:
            grant.status = "expired"

    return PollResponse(status=grant.status, access_token=grant.access_token,
                        refresh_token=grant.refresh_token)


@router.get("/verify", status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMITS.get("device_code_verify", "30/minute"))
async def verify_user_code(request: Request, code: str) -> dict:
    """Resolve a user_code to its verification page URL.

    The frontend TV activation page calls this to validate the code before
    rendering the confirmation UI. Authorization (linking to a user session)
    is completed by the frontend after the viewer authenticates.
    """
    if not code or len(code) != 9:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_code format. Expected AAAA-DDDD.",
        )

    normalized = code.upper()
    with _store_lock:
        grant = next((g for g in _store.values() if g.user_code == normalized), None)

    if grant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="user_code not found or already used")

    if grant.expires_at < time.time():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="user_code has expired")

    logger.info("User code verified",
                extra={"user_code": normalized, "device_name": grant.device_name})

    return {
        "verification_uri": f"{settings.FRONTEND_URL}/tv/activate?code={normalized}",
        "device_name": grant.device_name,
    }
