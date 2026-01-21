"""
SQLAlchemy Model: ComposioConnection
Feature: 001-composio-tools-integration

Maps to composio_connections table in schema-locked database.
Implements tenant-scoped OAuth connections to external tools via Composio.

SYSTEM MANDATE Compliance:
- Schema-locked: Maps to existing table, no DDL
- No hardcoded values: All constraints match database schema
- Complete implementation: No placeholders or TODOs
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.persistence.database import Base


class ComposioConnection(Base):
    """
    Composio OAuth connection model for tenant-scoped external tool integrations.

    Schema Reference: 008_create_composio_tables.sql
    Table: composio_connections
    """

    __tablename__ = "composio_connections"

    # Primary Key
    id = Column(
        String(36),
        primary_key=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
        comment="Unique connection identifier",
    )

    # Tenant and Connection Info
    tenant_id = Column(
        String(255),
        nullable=False,
        index=True,
        comment="Tenant ID for multi-tenant isolation",
    )

    toolkit_name = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Composio toolkit name (e.g., 'stripe', 'shopify', 'okta')",
    )

    connection_id = Column(
        String(255), nullable=False, comment="Composio connection ID"
    )

    # Connection Status
    status = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Connection status: 'active', 'expired', 'revoked'",
    )

    # Encrypted Credentials (AES-256-GCM encrypted at rest)
    encrypted_access_token = Column(
        Text, nullable=False, comment="Encrypted access token"
    )

    refresh_token = Column(
        Text, nullable=True, comment="Encrypted refresh token (optional)"
    )

    # Timestamps
    expires_at = Column(
        DateTime(timezone=True), nullable=True, comment="Token expiration timestamp"
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
        comment="Connection creation timestamp",
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        comment="Last update timestamp",
    )

    last_used_at = Column(
        DateTime(timezone=True), nullable=True, comment="Last usage timestamp"
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "toolkit_name",
            "connection_id",
            name="uq_composio_connections_tenant_toolkit_connection",
        ),
        CheckConstraint(
            "status IN ('active', 'expired', 'revoked')",
            name="chk_composio_connection_status",
        ),
        Index("idx_composio_connections_tenant", "tenant_id"),
        Index("idx_composio_connections_status", "status"),
        Index("idx_composio_connections_toolkit", "toolkit_name"),
    )

    def __repr__(self) -> str:
        return f"<ComposioConnection(id={self.id!r}, tenant_id={self.tenant_id!r}, toolkit={self.toolkit_name!r}, status={self.status!r})>"

    def to_dict(self) -> dict:
        """Convert model to dictionary representation (excluding encrypted tokens)."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "toolkit_name": self.toolkit_name,
            "connection_id": self.connection_id,
            "status": self.status,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_used_at": (
                self.last_used_at.isoformat() if self.last_used_at else None
            ),
        }

    def is_expired(self) -> bool:
        """Check if connection token has expired."""
        if self.expires_at is None:
            return False
        return (
            datetime.now(self.expires_at.tzinfo) >= self.expires_at
            if self.expires_at.tzinfo
            else datetime.now() >= self.expires_at.replace(tzinfo=None)
        )

    def is_active(self) -> bool:
        """Check if connection is active and not expired."""
        return self.status == "active" and not self.is_expired()
