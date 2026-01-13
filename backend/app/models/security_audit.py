"""
Security Audit Log Model for Authentication Events
Tracks all security-relevant events in the authentication system.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from beanie import Document
from pydantic import Field


class SecurityAuditLog(Document):
    """
    Security audit log for authentication and security events.
    
    Fields:
        event_type: Type of event (login, logout, register, password_change, etc.)
        user_id: User ID if applicable
        user_email: User email for easier searching
        ip_address: IP address of the request
        user_agent: User agent string
        status: Status of the event (success, failure, warning)
        details: Additional details about the event
        metadata: Additional metadata (JSON)
        created_at: Timestamp of the event
    """
    
    event_type: str  # login, logout, register, password_change, password_reset, email_verification, etc.
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    status: str  # success, failure, warning, error
    details: str  # Human-readable description
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)  # Additional context
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "security_audit_logs"
        indexes = [
            "event_type",
            "user_id",
            "user_email",
            "status",
            "created_at",
            [("user_id", 1), ("created_at", -1)],  # Compound index for user history
            [("event_type", 1), ("created_at", -1)],  # Compound index for event type history
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "event_type": "login",
                "user_id": "507f1f77bcf86cd799439011",
                "user_email": "user@example.com",
                "ip_address": "192.168.1.1",
                "user_agent": "Mozilla/5.0...",
                "status": "success",
                "details": "User logged in successfully",
                "metadata": {"method": "email_password"},
            }
        }
