"""Proxy streaming for authenticated-source video playback."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

import httpx

from app.api.routes.training.dependencies import get_current_training_user
from app.core.config import settings
from app.models.content import Content
from app.models.source_connection import SourceConnection
from app.models.training_user import TrainingUser
from app.services.olorin.source_providers.google_workspace import GoogleWorkspaceProvider
from app.services.olorin.source_providers.panopto import PanoptoProvider
from app.services.olorin.token_encryption import decrypt_token, encrypt_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["training-proxy"])


def _get_provider(conn: SourceConnection):
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


async def _ensure_valid_token(conn: SourceConnection) -> str:
    """Get a valid access token, refreshing if expired."""
    enc_key = settings.SOURCE_TOKEN_ENCRYPTION_KEY
    access_token = decrypt_token(conn.encrypted_access_token, enc_key)
    now = datetime.now(timezone.utc)
    if conn.token_expires_at and conn.token_expires_at <= now:
        provider = _get_provider(conn)
        refresh = decrypt_token(conn.encrypted_refresh_token, enc_key)
        try:
            tokens = await provider.refresh_access_token(refresh)
        except Exception:
            conn.status = "needs_reauth"
            await conn.save()
            raise HTTPException(503, "Source needs re-authorization")
        conn.encrypted_access_token = encrypt_token(tokens.access_token, enc_key)
        conn.token_expires_at = now
        await conn.save()
        access_token = tokens.access_token
    return access_token


@router.get("/content/{content_id}/proxy-stream")
async def proxy_stream(
    content_id: str,
    request: Request,
    user: TrainingUser = Depends(get_current_training_user),
):
    content = await Content.get(content_id)
    if not content or content.partner_id != user.partner_id:
        raise HTTPException(404, "Content not found")

    if content.source_type == "url":
        raise HTTPException(400, "Proxy not needed for public URLs")

    if not content.source_connection_id or not content.source_ref:
        raise HTTPException(400, "Content missing source reference")

    conn = await SourceConnection.find_one(
        {"connection_id": content.source_connection_id}
    )
    if not conn or conn.status != "active":
        raise HTTPException(503, "Source connection unavailable")

    access_token = await _ensure_valid_token(conn)
    provider = _get_provider(conn)
    stream_url = await provider.get_stream_url(access_token, content.source_ref)

    upstream_headers = {"Authorization": f"Bearer {access_token}"}
    range_header = request.headers.get("range")
    if range_header:
        upstream_headers["Range"] = range_header

    client = httpx.AsyncClient(timeout=600)
    upstream_req = client.build_request("GET", stream_url, headers=upstream_headers)
    upstream_resp = await client.send(upstream_req, stream=True)

    response_headers = {}
    for key in ("content-type", "content-length", "content-range", "accept-ranges"):
        val = upstream_resp.headers.get(key)
        if val:
            response_headers[key] = val

    async def stream_body():
        try:
            async for chunk in upstream_resp.aiter_bytes(chunk_size=65536):
                yield chunk
        finally:
            await upstream_resp.aclose()
            await client.aclose()

    return StreamingResponse(
        stream_body(),
        status_code=upstream_resp.status_code,
        headers=response_headers,
    )


@router.get("/content/{content_id}/embed-url")
async def get_embed_url(
    content_id: str,
    user: TrainingUser = Depends(get_current_training_user),
):
    content = await Content.get(content_id)
    if not content or content.partner_id != user.partner_id:
        raise HTTPException(404, "Content not found")

    if content.source_type == "url":
        return {"embed_url": content.stream_url, "source_type": "url"}

    if not content.source_connection_id or not content.source_ref:
        raise HTTPException(400, "Content missing source reference")

    conn = await SourceConnection.find_one(
        {"connection_id": content.source_connection_id}
    )
    if not conn or conn.status != "active":
        raise HTTPException(503, "Source connection unavailable")

    access_token = await _ensure_valid_token(conn)
    provider = _get_provider(conn)
    embed_url = await provider.get_embed_url(access_token, content.source_ref)

    return {
        "embed_url": embed_url,
        "source_type": content.source_type,
        "provider": content.source_type,
    }
