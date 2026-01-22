"""
Login Attempt Tracking Model
Tracks failed login attempts for account lockout functionality
"""

from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class LoginAttempt(Document):
    """
    Track failed login attempts for security.

    Implements account lockout after multiple failed attempts.
    """

    email: str = Field(..., description="Email address of login attempt")
    ip_address: str = Field(..., description="IP address of requester")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    success: bool = Field(default=False, description="Whether attempt succeeded")
    user_agent: Optional[str] = Field(None, description="Browser user agent")

    class Settings:
        name = "login_attempts"
        indexes = [
            IndexModel([("email", ASCENDING)], name="idx_email"),
            IndexModel([("ip_address", ASCENDING)], name="idx_ip_address"),
            IndexModel([("email", ASCENDING), ("timestamp", -1)], name="idx_email_timestamp"),
            IndexModel([("ip_address", ASCENDING), ("timestamp", -1)], name="idx_ip_timestamp"),
            IndexModel([("email", ASCENDING), ("success", ASCENDING), ("timestamp", -1)], name="idx_email_success_timestamp"),
            IndexModel(
                [("timestamp", ASCENDING)],
                expireAfterSeconds=24 * 60 * 60,  # 24 hour TTL - auto-delete old login attempts
                name="idx_ttl_login_attempts"
            ),
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "ip_address": "192.168.1.1",
                "timestamp": "2024-01-01T00:00:00Z",
                "success": False,
                "user_agent": "Mozilla/5.0...",
            }
        }
