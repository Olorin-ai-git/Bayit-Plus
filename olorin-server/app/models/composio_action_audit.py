"""
SQLAlchemy Model: ComposioActionAudit
Feature: 001-composio-tools-integration

Maps to composio_action_audit table in schema-locked database.
Audit log for all Composio action executions.
"""

from sqlalchemy import Column, String, Text, Integer, DateTime, CheckConstraint, Index
from sqlalchemy.sql import func
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import json

from app.persistence.database import Base


class ComposioActionAudit(Base):
    """
    Composio action audit model for tracking all action executions.
    
    Schema Reference: 008_create_composio_tables.sql
    Table: composio_action_audit
    """
    
    __tablename__ = "composio_action_audit"
    
    # Primary Key
    id = Column(
        String(36),
        primary_key=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
        comment="Unique audit record identifier"
    )
    
    # Action Identification
    action_id = Column(
        String(255),
        nullable=False,
        comment="Unique action execution identifier"
    )
    
    execution_id = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Links to soar_playbook_executions.id"
    )
    
    toolkit_name = Column(
        String(100),
        nullable=False,
        comment="Composio toolkit name (e.g., 'stripe', 'shopify')"
    )
    
    action_name = Column(
        String(100),
        nullable=False,
        comment="Action name (e.g., 'void_payment', 'cancel_order')"
    )
    
    # Tenant and Connection
    tenant_id = Column(
        String(255),
        nullable=False,
        index=True,
        comment="Tenant ID for multi-tenant isolation"
    )
    
    connection_id = Column(
        String(255),
        nullable=False,
        comment="Composio connection ID used for execution"
    )
    
    # Action Parameters and Results
    parameters = Column(
        Text,
        nullable=True,
        comment="JSON object of action parameters"
    )
    
    result = Column(
        Text,
        nullable=True,
        comment="JSON object of action result"
    )
    
    # Execution Status
    status = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Execution status: 'success', 'failed', 'retrying'"
    )
    
    executed_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
        index=True,
        comment="Action execution timestamp"
    )
    
    retry_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of retry attempts"
    )
    
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if execution failed"
    )
    
    __table_args__ = (
        CheckConstraint("status IN ('success', 'failed', 'retrying')", name='chk_composio_audit_status'),
        Index('idx_composio_audit_tenant', 'tenant_id'),
        Index('idx_composio_audit_execution', 'execution_id'),
        Index('idx_composio_audit_status', 'status'),
        Index('idx_composio_audit_executed', 'executed_at'),
    )
    
    def __repr__(self) -> str:
        return f"<ComposioActionAudit(id={self.id!r}, toolkit={self.toolkit_name!r}, action={self.action_name!r}, status={self.status!r})>"
    
    def to_dict(self) -> dict:
        """Convert model to dictionary representation."""
        return {
            "id": self.id,
            "action_id": self.action_id,
            "execution_id": self.execution_id,
            "toolkit_name": self.toolkit_name,
            "action_name": self.action_name,
            "tenant_id": self.tenant_id,
            "connection_id": self.connection_id,
            "parameters": json.loads(self.parameters) if self.parameters else {},
            "result": json.loads(self.result) if self.result else {},
            "status": self.status,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "retry_count": self.retry_count,
            "error_message": self.error_message,
        }
    
    def get_parameters(self) -> Dict[str, Any]:
        """Get parsed parameters JSON."""
        if not self.parameters:
            return {}
        try:
            return json.loads(self.parameters)
        except json.JSONDecodeError:
            return {}
    
    def set_parameters(self, params: Dict[str, Any]) -> None:
        """Set parameters as JSON."""
        self.parameters = json.dumps(params) if params else None
    
    def get_result(self) -> Dict[str, Any]:
        """Get parsed result JSON."""
        if not self.result:
            return {}
        try:
            return json.loads(self.result)
        except json.JSONDecodeError:
            return {}
    
    def set_result(self, result: Dict[str, Any]) -> None:
        """Set result as JSON."""
        self.result = json.dumps(result) if result else None

