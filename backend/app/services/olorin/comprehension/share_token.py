"""Share-token generator for public capability URLs (D-09).

secrets.token_urlsafe(24) produces 32 URL-safe characters — the minimum
acceptable entropy for an unauthenticated capability URL per D-09.
"""
import secrets

from app.core.config import settings
from app.models.comprehension_session import ComprehensionSession


def generate_share_token() -> str:
    """Return a cryptographically random URL-safe share token."""
    return secrets.token_urlsafe(settings.COMPREHENSION_SHARE_TOKEN_BYTES)


async def ensure_share_token(session: ComprehensionSession) -> str:
    """Populate session.share_token if missing, persist, and return it."""
    if session.share_token:
        return session.share_token
    session.share_token = generate_share_token()
    await session.save()
    return session.share_token
