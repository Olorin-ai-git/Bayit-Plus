"""
Twilio SMS Service
Handles SMS verification code sending via Twilio API
"""

import logging
import secrets
from typing import Optional

import phonenumbers
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

from app.core.config import settings

logger = logging.getLogger(__name__)


class TwilioService:
    """Service for sending SMS verification codes via Twilio."""

    def __init__(self):
        """Initialize Twilio client with credentials from settings."""
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            logger.warning("Twilio not configured - SMS sending will fail")
            self.client = None
        else:
            self.client = Client(
                settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN
            )
        self.from_number = settings.TWILIO_PHONE_NUMBER

    def generate_code(self) -> str:
        """Generate 6-digit verification code."""
        return "".join([str(secrets.randbelow(10)) for _ in range(6)])

    def validate_phone_number(self, phone_number: str) -> Optional[str]:
        """
        Validate and format phone number to E.164 format.

        Args:
            phone_number: Phone number string (can be in various formats)

        Returns:
            Formatted phone number in E.164 format (e.g., +12125551234)
            None if invalid
        """
        try:
            parsed = phonenumbers.parse(phone_number, None)
            if not phonenumbers.is_valid_number(parsed):
                return None
            return phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )
        except phonenumbers.phonenumberutil.NumberParseException:
            return None

    async def send_verification_code(self, phone_number: str, code: str) -> dict:
        """
        Send SMS verification code via Twilio.

        Args:
            phone_number: Phone number in E.164 format
            code: 6-digit verification code

        Returns:
            Dict with sid and status if successful

        Raises:
            Exception if sending fails
        """
        if not self.client:
            logger.error(
                "Twilio client not initialized - check TWILIO credentials in settings"
            )
            raise Exception("SMS service not configured")

        if not self.from_number:
            logger.error("TWILIO_PHONE_NUMBER not configured")
            raise Exception("SMS service not configured properly")

        try:
            message = self.client.messages.create(
                body=f"Your Bayit+ verification code is: {code}. Valid for 10 minutes.",
                from_=self.from_number,
                to=phone_number,
            )

            logger.info(
                f"✅ SMS sent successfully to {phone_number[:8]}*** (SID: {message.sid})"
            )

            return {"sid": message.sid, "status": message.status, "to": phone_number}

        except TwilioRestException as e:
            logger.error(f"❌ Twilio API error: {e.msg} (code: {e.code})")
            raise Exception(f"Failed to send SMS: {e.msg}")
        except Exception as e:
            logger.error(f"❌ Failed to send SMS: {e}")
            raise


# Global instance
twilio_service = TwilioService()
