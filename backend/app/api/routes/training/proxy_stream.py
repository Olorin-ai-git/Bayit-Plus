"""Proxy streaming for authenticated-source video playback."""

import logging

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

import httpx

from app.api.routes.training.dependencies import (
    get_current_training_user,
    get_training_user_from_token,
)
from app.models.content import Content
from app.models.source_connection import SourceConnection
from app.models.training_user import TrainingUser
from app.services.olorin.source_helpers import get_provider, get_valid_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["training-proxy"])


@router.get("/content/{content_id}/proxy-stream")
async def proxy_stream(
    content_id: str,
    request: Request,
    token: Optional[str] = Query(None, description="JWT for video element auth"),
):
    # HTML <video> elements cannot send Authorization headers.
    # Try Authorization header first, fall back to ?token= query param.
    auth_header = request.headers.get("authorization", "")
    jwt_str = ""
    if auth_header.lower().startswith("bearer "):
        jwt_str = auth_header[7:]
    elif token:
        jwt_str = token
    if not jwt_str:
        raise HTTPException(401, "Authentication required")
    user = await get_training_user_from_token(jwt_str)
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

    try:
        access_token = await get_valid_token(conn)
    except Exception:
        conn.status = "needs_reauth"
        await conn.save()
        raise HTTPException(503, "Source needs re-authorization")

    provider = get_provider(conn)
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

    try:
        access_token = await get_valid_token(conn)
    except Exception:
        conn.status = "needs_reauth"
        await conn.save()
        raise HTTPException(503, "Source needs re-authorization")

    provider = get_provider(conn)
    embed_url = await provider.get_embed_url(access_token, content.source_ref)

    return {
        "embed_url": embed_url,
        "source_type": content.source_type,
        "provider": content.source_type,
    }
