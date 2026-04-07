"""
Olorin Email - Shared Email Service for Olorin Ecosystem

Provides unified email sending capabilities across all Olorin platforms.
"""

from olorin_email.config import EmailSettings
from olorin_email.models import SendResult
from olorin_email.provider import EmailProvider, ResendProvider, SendGridProvider
from olorin_email.service import EmailService

__version__ = "1.0.0"

__all__ = [
    "EmailService",
    "EmailProvider",
    "ResendProvider",
    "SendGridProvider",
    "EmailSettings",
    "SendResult",
]
