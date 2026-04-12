"""Shared helpers for authenticated source connector operations."""

from datetime import datetime, timezone

from app.core.config import settings
from app.models.source_connection import SourceConnection
from app.services.olorin.source_providers.base import SourceProvider
from app.services.olorin.source_providers.google_workspace import GoogleWorkspaceProvider
from app.services.olorin.source_providers.panopto import PanoptoProvider
from app.services.olorin.token_encryption import decrypt_token, encrypt_token


def get_provider(conn: SourceConnection) -> SourceProvider:
    """Build the correct provider instance for a connection."""
    if conn.provider == "google_workspace":
        return GoogleWorkspaceProvider(
            client_id=settings.SOURCE_GOOGLE_CLIENT_ID,
            client_secret=settings.SOURCE_GOOGLE_CLIENT_SECRET,
        )
    return PanoptoProvider(
        client_id=settings.SOURCE_PANOPTO_CLIENT_ID,
        client_secret=settings.SOURCE_PANOPTO_CLIENT_SECRET,
        server_url=conn.panopto_server_url or "",
    )


async def get_valid_token(conn: SourceConnection) -> str:
    """Decrypt and auto-refresh the access token if expired.

    On refresh, updates the connection document with new encrypted token.
    Raises the provider's exception on refresh failure — callers should
    handle this (e.g., route handlers may want to set needs_reauth).
    """
    enc_key = settings.SOURCE_TOKEN_ENCRYPTION_KEY
    access_token = decrypt_token(conn.encrypted_access_token, enc_key)
    now = datetime.now(timezone.utc)
    expires = conn.token_expires_at
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires and expires <= now:
        provider = get_provider(conn)
        refresh = decrypt_token(conn.encrypted_refresh_token, enc_key)
        tokens = await provider.refresh_access_token(refresh)
        conn.encrypted_access_token = encrypt_token(tokens.access_token, enc_key)
        conn.token_expires_at = now
        conn.updated_at = now
        await conn.save()
        access_token = tokens.access_token
    return access_token
