"""SCORM export token generation, validation, and usage tracking."""

import secrets
from datetime import datetime, timezone

from app.core.logging_config import get_logger
from app.models.scorm_export import ScormExport

logger = get_logger(__name__)


class TokenValidationError(Exception):
    """Raised when an export token fails validation."""


def generate_export_token() -> str:
    """Generate a crypto-random URL-safe export token."""
    return secrets.token_urlsafe(32)


async def validate_export_token(
    token: str, content_id: str
) -> ScormExport:
    """
    Validate an export token for a live interaction request.

    Checks: exists, content scope, cap, expiry.
    Returns the ScormExport if valid.
    Raises TokenValidationError with reason if invalid.
    """
    export = await ScormExport.find_one(
        ScormExport.export_token == token
    )
    if not export:
        raise TokenValidationError("Invalid export token")

    if export.content_id != content_id:
        raise TokenValidationError("Token scope mismatch")

    if export.token_used >= export.token_cap:
        raise TokenValidationError("Token usage cap reached")

    if export.token_expires_at:
        now = datetime.now(timezone.utc)
        expires = export.token_expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if now > expires:
            raise TokenValidationError("Token expired")

    return export


async def increment_token_usage(export: ScormExport) -> None:
    """Increment the usage counter for an export token."""
    export.token_used += 1
    await export.save()
    logger.info(
        "SCORM token usage incremented",
        extra={
            "export_id": str(export.id),
            "token_used": export.token_used,
            "token_cap": export.token_cap,
        },
    )
