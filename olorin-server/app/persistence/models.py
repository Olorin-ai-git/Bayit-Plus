"""
Olorin Database Models

SQLAlchemy models for the Olorin fraud investigation platform.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from .database import Base


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""
    
    created_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )


class InvestigationRecord(Base, TimestampMixin):
    """Investigation record model for fraud investigations."""
    
    __tablename__ = "investigations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=False)  # user, device, transaction, etc.
    entity_id = Column(String, nullable=False, index=True)
    investigation_type = Column(String, nullable=False)  # fraud, ato, etc.
    status = Column(String, default="pending", nullable=False)
    priority = Column(String, default="medium", nullable=False)
    
    # Investigation details
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    findings = Column(JSON, nullable=True)
    risk_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    
    # Agent and workflow tracking
    assigned_agent = Column(String, nullable=True)
    workflow_state = Column(JSON, nullable=True)
    
    # Metadata
    tags = Column(JSON, nullable=True)
    meta_data = Column(JSON, nullable=True)
    
    def __repr__(self):
        return f"<InvestigationRecord(id={self.id}, user_id={self.user_id}, status={self.status})>"


class UserRecord(Base, TimestampMixin):
    """User record model for authentication and user management."""
    
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    
    # User details
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    
    # Authentication
    last_login = Column(DateTime(timezone=True), nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<UserRecord(id={self.id}, username={self.username}, email={self.email})>"


class EntityRecord(Base, TimestampMixin):
    """Generic entity record for tracking investigated entities."""
    
    __tablename__ = "entities"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String, nullable=False, index=True)  # user, device, account, etc.
    entity_id = Column(String, nullable=False, index=True)
    
    # Entity attributes
    attributes = Column(JSON, nullable=True)
    risk_indicators = Column(JSON, nullable=True)
    
    # Analysis results
    risk_score = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)  # low, medium, high, critical
    
    # Relationships and connections
    related_entities = Column(JSON, nullable=True)
    
    # Status tracking
    status = Column(String, default="active", nullable=False)
    last_analyzed = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<EntityRecord(id={self.id}, entity_type={self.entity_type}, entity_id={self.entity_id})>"


class AuditLog(Base, TimestampMixin):
    """Audit log for tracking all system actions."""
    
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=True, index=True)
    
    # Action details
    details = Column(JSON, nullable=True)
    ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    # Status
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, success={self.success})>"