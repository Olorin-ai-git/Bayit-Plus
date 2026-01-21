"""
Audit Logger Service
Provides comprehensive security event logging.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import Request

from app.models.security_audit import SecurityAuditLog
from app.models.user import User

logger = logging.getLogger(__name__)


class AuditLogger:
    """
    Service for logging security events to database and application logs.
    """

    @staticmethod
    async def log_event(
        event_type: str,
        status: str,
        details: str,
        user: Optional[User] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        request: Optional[Request] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log a security event.

        Args:
            event_type: Type of event (login, logout, register, etc.)
            status: Status (success, failure, warning, error)
            details: Human-readable description
            user: User object (optional)
            user_id: User ID if user object not available
            user_email: User email if user object not available
            request: FastAPI request object for IP/user agent
            metadata: Additional metadata
        """
        try:
            # Extract user info
            if user:
                user_id = str(user.id)
                user_email = user.email

            # Extract request info
            ip_address = None
            user_agent = None
            if request:
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent", "Unknown")

            # Create audit log entry
            audit_log = SecurityAuditLog(
                event_type=event_type,
                user_id=user_id,
                user_email=user_email,
                ip_address=ip_address,
                user_agent=user_agent,
                status=status,
                details=details,
                metadata=metadata or {},
                created_at=datetime.now(timezone.utc),
            )

            # Save to database (async)
            await audit_log.insert()

            # Also log to application logs
            log_message = f"[AUDIT] {event_type.upper()} - {status.upper()}: {details}"
            if user_email:
                log_message += f" | User: {user_email}"
            if ip_address:
                log_message += f" | IP: {ip_address}"

            if status == "success":
                logger.info(log_message)
            elif status == "failure":
                logger.warning(log_message)
            elif status == "error":
                logger.error(log_message)
            else:
                logger.info(log_message)

        except Exception as e:
            # Never let audit logging break the application
            logger.error(f"Failed to create audit log: {e}")

    @staticmethod
    async def log_login_success(
        user: User, request: Request, method: str = "email_password"
    ) -> None:
        """Log successful login."""
        await AuditLogger.log_event(
            event_type="login",
            status="success",
            details=f"User logged in successfully using {method}",
            user=user,
            request=request,
            metadata={"method": method},
        )

    @staticmethod
    async def log_login_failure(
        email: str, request: Request, reason: str = "invalid_credentials"
    ) -> None:
        """Log failed login attempt."""
        await AuditLogger.log_event(
            event_type="login",
            status="failure",
            details=f"Failed login attempt: {reason}",
            user_email=email,
            request=request,
            metadata={"reason": reason},
        )

    @staticmethod
    async def log_account_locked(user: User, request: Request) -> None:
        """Log account lockout event."""
        await AuditLogger.log_event(
            event_type="account_lockout",
            status="warning",
            details="Account temporarily locked due to too many failed login attempts",
            user=user,
            request=request,
            metadata={"failed_attempts": user.failed_login_attempts},
        )

    @staticmethod
    async def log_registration(user: User, request: Request) -> None:
        """Log new user registration."""
        await AuditLogger.log_event(
            event_type="register",
            status="success",
            details="New user registered",
            user=user,
            request=request,
        )

    @staticmethod
    async def log_email_verification(
        user: User, request: Optional[Request] = None
    ) -> None:
        """Log email verification."""
        await AuditLogger.log_event(
            event_type="email_verification",
            status="success",
            details="Email address verified",
            user=user,
            request=request,
        )

    @staticmethod
    async def log_password_change(user: User, request: Request) -> None:
        """Log password change."""
        await AuditLogger.log_event(
            event_type="password_change",
            status="success",
            details="User changed password",
            user=user,
            request=request,
        )

    @staticmethod
    async def log_password_reset_request(email: str, request: Request) -> None:
        """Log password reset request."""
        await AuditLogger.log_event(
            event_type="password_reset_request",
            status="success",
            details="Password reset requested",
            user_email=email,
            request=request,
        )

    @staticmethod
    async def log_password_reset_complete(user: User, request: Request) -> None:
        """Log completed password reset."""
        await AuditLogger.log_event(
            event_type="password_reset_complete",
            status="success",
            details="Password reset completed",
            user=user,
            request=request,
        )

    @staticmethod
    async def log_oauth_login(
        user: User, request: Request, provider: str = "google"
    ) -> None:
        """Log OAuth login."""
        await AuditLogger.log_event(
            event_type="oauth_login",
            status="success",
            details=f"User logged in via {provider}",
            user=user,
            request=request,
            metadata={"provider": provider},
        )


# Singleton instance
audit_logger = AuditLogger()
