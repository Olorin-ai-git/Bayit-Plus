"""Authenticated source connection model for OAuth-connected video platforms."""

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from beanie import Document
from pydantic import Field
from pymongo import IndexModel


PROVIDER_TYPES = ("google_workspace", "panopto")
CONNECTION_STATUSES = ("active", "needs_reauth", "disconnected")


class SourceConnection(Document):
    """An org's OAuth connection to an external video platform."""

    connection_id: str = Field(
        default_factory=lambda: uuid.uuid4().hex,
        description="Unique connection identifier",
    )
    partner_id: str = Field(..., description="Owning org partner_id")
    provider: Literal["google_workspace", "panopto"] = Field(
        ..., description="Source platform type",
    )
    status: Literal["active", "needs_reauth", "disconnected"] = Field(
        default="active",
    )
    authorized_by: str = Field(
        ..., description="user_id of admin who authorized",
    )
    authorized_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    encrypted_access_token: str = Field(
        ..., description="Fernet-encrypted OAuth access token",
    )
    encrypted_refresh_token: str = Field(
        ..., description="Fernet-encrypted OAuth refresh token",
    )
    token_expires_at: Optional[datetime] = Field(
        default=None, description="Access token expiry time",
    )
    panopto_server_url: Optional[str] = Field(
        default=None, description="Panopto instance base URL",
    )
    scopes: List[str] = Field(
        default_factory=list, description="OAuth scopes granted",
    )
    last_used_at: Optional[datetime] = Field(
        default=None, description="Last time tokens were used",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    class Settings:
        name = "source_connections"
        indexes = [
            "partner_id",
            "connection_id",
            IndexModel(
                [("partner_id", 1), ("provider", 1)],
                name="partner_provider_idx",
            ),
        ]
