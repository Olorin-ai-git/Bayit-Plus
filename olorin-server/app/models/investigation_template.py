"""
SQLAlchemy Model: InvestigationTemplate
Feature: 005-polling-and-persistence

Maps to investigation_templates table in schema-locked database.
Implements template management for saving and reusing investigation configurations.

SYSTEM MANDATE Compliance:
- Schema-locked: Maps to existing table, no DDL
- No hardcoded values: All constraints match database schema
- Complete implementation: No placeholders or TODOs
"""

from sqlalchemy import Column, String, Text, Integer, DateTime, CheckConstraint, Index, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from typing import Optional
from datetime import datetime

Base = declarative_base()


class InvestigationTemplate(Base):
    """
    Investigation template model for saving and reusing configurations.

    Schema Reference: 001_add_wizard_state_tables.sql
    Table: investigation_templates
    Columns: 10 (template_id, user_id, name, description, tags, template_json,
             created_at, updated_at, usage_count, last_used)
    Indexes: 3 (user, usage, updated)
    Constraints: UNIQUE(user_id, name), CHECK(usage_count >= 0)
    """

    __tablename__ = "investigation_templates"

    # Primary Key
    template_id = Column(
        String(255),
        primary_key=True,
        nullable=False,
        comment="Unique template identifier"
    )

    # Ownership
    user_id = Column(
        String(255),
        nullable=False,
        index=True,
        comment="User who owns this template"
    )

    # Template Metadata
    name = Column(
        String(255),
        nullable=False,
        comment="Template name (unique per user)"
    )

    description = Column(
        Text,
        nullable=True,
        comment="Template description"
    )

    tags = Column(
        Text,
        nullable=True,
        comment="Comma-separated tags for categorization"
    )

    # Template Configuration
    template_json = Column(
        Text,
        nullable=False,
        comment="Template configuration JSON (entities, tools, time_range, correlation_mode)"
    )

    # Usage Statistics
    usage_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of times template has been used"
    )

    last_used = Column(
        DateTime,
        nullable=True,
        comment="When template was last applied"
    )

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        comment="When template was created"
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        index=True,
        comment="When template was last updated"
    )

    # Table Arguments: Constraints and Indexes
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "name",
            name="uq_template_user_name"
        ),
        CheckConstraint(
            "usage_count >= 0",
            name="chk_usage_count"
        ),
        Index("idx_investigation_templates_user", "user_id"),
        Index("idx_investigation_templates_usage", "usage_count", "last_used"),
        Index("idx_investigation_templates_updated", "updated_at"),
    )

    def __repr__(self) -> str:
        """String representation for debugging."""
        return (
            f"<InvestigationTemplate("
            f"template_id={self.template_id!r}, "
            f"user_id={self.user_id!r}, "
            f"name={self.name!r}, "
            f"usage_count={self.usage_count}"
            f")>"
        )

    def to_dict(self) -> dict:
        """
        Convert model to dictionary representation.

        Returns:
            Dictionary with all model fields
        """
        return {
            "template_id": self.template_id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "tags": self.tags,
            "template_json": self.template_json,
            "usage_count": self.usage_count,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
