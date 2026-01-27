"""Server-side OAuth state token management for Audible integration.

Stores and validates CSRF protection state tokens to prevent state parameter attacks.
Uses in-memory storage (can be extended to Redis for distributed deployments).
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.logging_config import get_logger

logger = get_logger(__name__)

# In-memory state store with expiration (15 minutes)
# Format: {state_token: (user_id, created_at, code_verifier, code_challenge)}
_STATE_STORE: dict[str, tuple[str, datetime, str, str]] = {}
STATE_EXPIRATION_MINUTES = 15


def store_state_token(state: str, user_id: str, code_verifier: str, code_challenge: str) -> None:
    """Store state token for validation on callback.

    Args:
        state: State token from authorization URL
        user_id: User making the authorization request
        code_verifier: PKCE code verifier
        code_challenge: PKCE code challenge
    """
    _STATE_STORE[state] = (user_id, datetime.now(timezone.utc), code_verifier, code_challenge)
    logger.debug("Stored OAuth state token", extra={"state": state[:10], "user_id": user_id})


def validate_state_token(state: str, user_id: str) -> Optional[tuple[str, str]]:
    """Validate state token and retrieve PKCE pair.

    Args:
        state: State token from OAuth callback
        user_id: User making the callback

    Returns:
        Tuple of (code_verifier, code_challenge) if valid, None otherwise

    Raises:
        ValueError: If state is invalid or expired
    """
    if not state or state not in _STATE_STORE:
        logger.warning("Invalid state token in OAuth callback")
        raise ValueError("Invalid state token")

    stored_user_id, created_at, code_verifier, code_challenge = _STATE_STORE[state]

    # Check expiration
    if datetime.now(timezone.utc) - created_at > timedelta(minutes=STATE_EXPIRATION_MINUTES):
        logger.warning("Expired state token", extra={"state": state[:10]})
        _STATE_STORE.pop(state, None)
        raise ValueError("State token expired")

    # Check user ID matches
    if stored_user_id != user_id:
        logger.warning(
            "State token user mismatch",
            extra={"expected": stored_user_id, "actual": user_id},
        )
        raise ValueError("State token does not match user")

    # Remove state after validation (one-time use)
    _STATE_STORE.pop(state, None)

    logger.debug("Validated OAuth state token", extra={"state": state[:10]})
    return code_verifier, code_challenge


def cleanup_expired_states() -> None:
    """Remove expired state tokens from store."""
    current_time = datetime.now(timezone.utc)
    expired = [
        state
        for state, (_, created_at, _, _) in _STATE_STORE.items()
        if current_time - created_at > timedelta(minutes=STATE_EXPIRATION_MINUTES)
    ]

    for state in expired:
        _STATE_STORE.pop(state, None)

    if expired:
        logger.debug(f"Cleaned up {len(expired)} expired state tokens")
