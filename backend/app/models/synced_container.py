"""Synced container model for automated folder-level content sync."""

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class SyncedContainer(Document):
    """A folder in a connected source that auto-syncs new videos."""

    container_id: str = Field(
        default_factory=lambda: uuid.uuid4().hex,
    )
    connection_id: str = Field(
        ..., description="SourceConnection.connection_id",
    )
    partner_id: str = Field(..., description="Owning org")
    provider_folder_ref: str = Field(
        ..., description="Provider folder/channel ID",
    )
    folder_path: str = Field(
        ..., description="Human-readable breadcrumb",
    )
    status: Literal["active", "paused", "connection_lost"] = Field(
        default="active",
    )
    auto_import_new: bool = Field(
        default=True,
        description="Auto-import new videos found in folder",
    )
    last_poll_at: Optional[datetime] = Field(default=None)
    last_webhook_event_at: Optional[datetime] = Field(default=None)
    poll_interval_hours: int = Field(
        default=24, ge=6, le=168,
        description="Hours between poll cycles",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    created_by: str = Field(
        ..., description="Admin who set up the sync",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    class Settings:
        name = "synced_containers"
        indexes = [
            "partner_id",
            "connection_id",
            "container_id",
            IndexModel(
                [("connection_id", 1), ("provider_folder_ref", 1)],
                unique=True,
                name="connection_folder_unique",
            ),
        ]
