"""OAuth connection flow and connection management routes."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import require_training_admin
from app.core.config import settings
from app.models.source_connection import SourceConnection
from app.models.synced_container import SyncedContainer
from app.models.training_user import TrainingUser
from app.services.olorin.source_providers.google_workspace import GoogleWorkspaceProvider
from app.services.olorin.source_providers.panopto import PanoptoProvider
from app.services.olorin.token_encryption import encrypt_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sources", tags=["training-sources"])


class OAuthStartRequest(BaseModel):
    provider: Literal["google_workspace", "panopto"]
    panopto_server_url: str | None = None


class OAuthCallbackRequest(BaseModel):
    provider: Literal["google_workspace", "panopto"]
    code: str
    state: str
    panopto_server_url: str | None = None


@router.post("/oauth/start")
async def start_oauth(
    body: OAuthStartRequest,
    admin: TrainingUser = Depends(require_training_admin),
):
    state = uuid.uuid4().hex
    redirect_uri = settings.SOURCE_GOOGLE_REDIRECT_URI

    if body.provider == "google_workspace":
        provider = GoogleWorkspaceProvider(
            client_id=settings.SOURCE_GOOGLE_CLIENT_ID,
            client_secret=settings.SOURCE_GOOGLE_CLIENT_SECRET,
        )
        auth_url = provider.get_auth_url(redirect_uri, state)
    elif body.provider == "panopto":
        if not body.panopto_server_url:
            raise HTTPException(400, "panopto_server_url required")
        provider = PanoptoProvider(
            client_id=settings.SOURCE_PANOPTO_CLIENT_ID,
            client_secret=settings.SOURCE_PANOPTO_CLIENT_SECRET,
            server_url=body.panopto_server_url,
        )
        auth_url = provider.get_auth_url(redirect_uri, state)
    else:
        raise HTTPException(400, f"Unknown provider: {body.provider}")

    return {"auth_url": auth_url, "state": state}


@router.post("/oauth/callback")
async def handle_oauth_callback(
    body: OAuthCallbackRequest,
    admin: TrainingUser = Depends(require_training_admin),
):
    enc_key = settings.SOURCE_TOKEN_ENCRYPTION_KEY
    if not enc_key:
        raise HTTPException(500, "Token encryption not configured")

    redirect_uri = settings.SOURCE_GOOGLE_REDIRECT_URI

    if body.provider == "google_workspace":
        provider = GoogleWorkspaceProvider(
            client_id=settings.SOURCE_GOOGLE_CLIENT_ID,
            client_secret=settings.SOURCE_GOOGLE_CLIENT_SECRET,
        )
    elif body.provider == "panopto":
        if not body.panopto_server_url:
            raise HTTPException(400, "panopto_server_url required")
        provider = PanoptoProvider(
            client_id=settings.SOURCE_PANOPTO_CLIENT_ID,
            client_secret=settings.SOURCE_PANOPTO_CLIENT_SECRET,
            server_url=body.panopto_server_url,
        )
    else:
        raise HTTPException(400, f"Unknown provider: {body.provider}")

    tokens = await provider.exchange_code(body.code, redirect_uri)

    now = datetime.now(timezone.utc)
    conn = SourceConnection(
        partner_id=admin.partner_id,
        provider=body.provider,
        authorized_by=str(admin.id),
        encrypted_access_token=encrypt_token(tokens.access_token, enc_key),
        encrypted_refresh_token=encrypt_token(tokens.refresh_token, enc_key),
        token_expires_at=now,
        panopto_server_url=body.panopto_server_url,
        scopes=tokens.scopes,
    )
    await conn.insert()

    logger.info(
        "Source connection created",
        extra={
            "partner_id": admin.partner_id,
            "provider": body.provider,
            "connection_id": conn.connection_id,
        },
    )
    return {
        "connection_id": conn.connection_id,
        "provider": conn.provider,
        "status": conn.status,
    }


@router.get("/connections")
async def list_connections(
    admin: TrainingUser = Depends(require_training_admin),
):
    conns = await SourceConnection.find(
        {"partner_id": admin.partner_id}
    ).sort("-created_at").to_list()

    return [
        {
            "connection_id": c.connection_id,
            "provider": c.provider,
            "status": c.status,
            "authorized_by": c.authorized_by,
            "authorized_at": c.authorized_at.isoformat(),
            "panopto_server_url": c.panopto_server_url,
            "last_used_at": c.last_used_at.isoformat() if c.last_used_at else None,
        }
        for c in conns
    ]


@router.delete("/connections/{connection_id}")
async def disconnect_source(
    connection_id: str,
    admin: TrainingUser = Depends(require_training_admin),
):
    conn = await SourceConnection.find_one(
        {"connection_id": connection_id, "partner_id": admin.partner_id}
    )
    if not conn:
        raise HTTPException(404, "Connection not found")

    conn.status = "disconnected"
    conn.updated_at = datetime.now(timezone.utc)
    await conn.save()

    # Pause all synced containers for this connection
    await SyncedContainer.find(
        {"connection_id": connection_id}
    ).update_many({"$set": {"status": "connection_lost"}})

    # Flag content from this connection
    from app.models.content import Content
    await Content.find(
        {"source_connection_id": connection_id, "partner_id": admin.partner_id}
    ).update_many(
        {"$set": {
            "source_status": "connection_lost",
            "source_unavailable_since": datetime.now(timezone.utc),
        }}
    )

    logger.info("Source disconnected", extra={"connection_id": connection_id})
    return {"status": "disconnected"}
