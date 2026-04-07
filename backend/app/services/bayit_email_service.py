"""
Bayit+ Email Service

Wraps the core olorin-email package and provides Bayit+-specific email templates.
"""

import html
import logging
from datetime import datetime
from typing import Optional

from olorin_email import (
    EmailService, EmailSettings, ResendProvider, SendGridProvider, SendResult,
)

from app.core.config import settings
from app.services.email_templates import get_template_renderer

logger = logging.getLogger(__name__)


def _create_email_provider(email_settings: EmailSettings):
    """Select email provider based on config: resend > sendgrid > none."""
    resend_key = getattr(settings, "RESEND_API_KEY", "")
    if resend_key:
        email_settings.resend_api_key = resend_key
        logger.info("Email provider: Resend")
        return ResendProvider(email_settings)
    sendgrid_key = getattr(settings, "SENDGRID_API_KEY", "")
    if sendgrid_key:
        email_settings.sendgrid_api_key = sendgrid_key
        logger.info("Email provider: SendGrid")
        return SendGridProvider(email_settings)
    logger.warning("No email provider configured (RESEND_API_KEY or SENDGRID_API_KEY)")
    return SendGridProvider(email_settings)


class BayitEmailService:
    """
    Bayit+ specific email service.

    Consumes core olorin-email package and augments with Bayit+ templates:
    - Platform invitations
    - Beta user verification
    - Welcome emails
    - Scheduled sending (future)
    """

    def __init__(self):
        """Initialize Bayit+ email service with Olorin email core."""
        email_settings = EmailSettings(
            from_email=getattr(settings, "SENDGRID_FROM_EMAIL", "noreply@olorin.ai"),
        )

        provider = _create_email_provider(email_settings)
        self.core_service = EmailService(provider)
        self.template_renderer = get_template_renderer()

    async def send_platform_invitation(
        self,
        to_email: str,
        inviter_name: Optional[str] = None,
        personal_message: Optional[str] = None,
    ) -> SendResult:
        """
        Send Bayit+ platform invitation email.

        Args:
            to_email: Recipient email address
            inviter_name: Name of person inviting (optional)
            personal_message: Personal message from inviter (optional)

        Returns:
            SendResult with success status
        """
        try:
            # Build invitation URL
            platform_url = getattr(settings, "PLATFORM_URL", "https://bayitplus.com")
            signup_url = f"{platform_url}/signup"

            # Build personal greeting
            greeting = "You're invited to join Bayit+!"
            if inviter_name:
                greeting = f"{inviter_name} invites you to join Bayit+!"

            # Build personal message section (with XSS protection)
            personal_section = ""
            if personal_message:
                # SECURITY: HTML escape to prevent XSS
                escaped_message = html.escape(personal_message, quote=True)
                personal_section = f"""
                <div style="background-color: #F7FAFC; border-left: 4px solid #6B46C1; padding: 15px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #2D3748; font-weight: bold;">Personal Message:</p>
                    <p style="color: #4A5568; margin: 10px 0 0 0; line-height: 1.6;">
                        "{escaped_message}"
                    </p>
                </div>
                """

            current_year = datetime.now().year
            support_email = getattr(settings, "SUPPORT_EMAIL", "support@bayitplus.com")

            html_content = self.template_renderer.render(
                "platform_invitation.html",
                {
                    "greeting": greeting,
                    "personal_section": personal_section,
                    "signup_url": signup_url,
                    "support_email": support_email,
                    "current_year": current_year,
                },
            )

            # Send via Olorin core email service
            result = await self.core_service.send(
                to=[to_email],
                subject="You're Invited to Bayit+ - Premium Jewish Streaming",
                html_content=html_content,
            )

            if result.success:
                logger.info(
                    "Platform invitation sent successfully",
                    extra={
                        "recipient": to_email,
                        "inviter": inviter_name,
                        "has_personal_message": bool(personal_message),
                    },
                )
            else:
                logger.warning(
                    "Email service not configured or send failed",
                    extra={"recipient": to_email, "error": result.message},
                )

            return result

        except Exception as e:
            logger.error(
                "Failed to send platform invitation",
                extra={"recipient": to_email, "error": str(e)},
            )
            return SendResult(
                success=False,
                message=f"Failed to send invitation: {str(e)}",
                provider="bayit-email-service"
            )

    async def send_beta_verification(
        self,
        to_email: str,
        verification_token: str,
    ) -> SendResult:
        """
        Send Bayit+ beta verification email.

        Args:
            to_email: Recipient email address
            verification_token: HMAC verification token

        Returns:
            SendResult with success status
        """
        try:
            beta_landing_url = getattr(settings, "BETA_LANDING_PAGE_URL", "https://bayitplus.com/beta")
            verification_url = f"{beta_landing_url}/verify?token={verification_token}"
            current_year = datetime.now().year

            html_content = self.template_renderer.render(
                "beta_verification.html",
                {
                    "verification_url": verification_url,
                    "current_year": current_year,
                },
            )

            # Send via Olorin core email service
            result = await self.core_service.send(
                to=[to_email],
                subject="Verify Your Bayit+ Beta Account",
                html_content=html_content,
            )

            if result.success:
                logger.info(
                    "Beta verification email sent",
                    extra={
                        "recipient": to_email,
                        "verification_url": verification_url,
                    },
                )

            return result

        except Exception as e:
            logger.error(
                "Failed to send beta verification email",
                extra={"recipient": to_email, "error": str(e)},
            )
            return SendResult(
                success=False,
                message=f"Failed to send verification: {str(e)}",
                provider="bayit-email-service"
            )

    async def send_household_invitation(
        self,
        to_email: str,
        inviter_name: str,
        household_name: str,
        invitation_code: str,
        role: str,
        expires_at: str,
    ) -> SendResult:
        """
        Send household invitation email.

        Args:
            to_email: Recipient email address
            inviter_name: Name of person inviting
            household_name: Name of the household
            invitation_code: Invitation code (UUID)
            role: Role being offered (CHILD or GUARDIAN)
            expires_at: Expiration date formatted as string

        Returns:
            SendResult with success status
        """
        try:
            platform_url = getattr(settings, "PLATFORM_URL", "https://bayitplus.com")
            accept_url = f"{platform_url}/accept-invitation?code={invitation_code}"
            role_display = "Child" if role == "CHILD" else "Guardian"
            current_year = datetime.now().year
            support_email = getattr(settings, "SUPPORT_EMAIL", "support@bayitplus.com")

            html_content = self.template_renderer.render(
                "household_invitation.html",
                {
                    "inviter_name": inviter_name,
                    "household_name": household_name,
                    "role_display": role_display,
                    "accept_url": accept_url,
                    "expires_at": expires_at,
                    "support_email": support_email,
                    "current_year": current_year,
                },
            )

            # Send via Olorin core email service
            result = await self.core_service.send(
                to=[to_email],
                subject=f"{inviter_name} invited you to join their Bayit+ household",
                html_content=html_content,
            )

            if result.success:
                logger.info(
                    "Household invitation sent successfully",
                    extra={
                        "recipient": to_email,
                        "inviter": inviter_name,
                        "household": household_name,
                        "role": role,
                    },
                )
            else:
                logger.warning(
                    "Email service not configured or send failed",
                    extra={"recipient": to_email, "error": result.message},
                )

            return result

        except Exception as e:
            logger.error(
                "Failed to send household invitation",
                extra={"recipient": to_email, "error": str(e)},
            )
            return SendResult(
                success=False,
                message=f"Failed to send invitation: {str(e)}",
                provider="bayit-email-service"
            )

    async def send_generic_email(
        self,
        to_emails: list[str],
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
    ) -> SendResult:
        """
        Send generic email via Olorin core service.

        Use this for simple emails that don't need a specific template.

        Args:
            to_emails: List of recipient email addresses
            subject: Email subject
            html_content: HTML email body
            from_email: Sender email (optional)

        Returns:
            SendResult with success status
        """
        return await self.core_service.send(
            to=to_emails,
            subject=subject,
            html_content=html_content,
            from_email=from_email,
        )


# Singleton instance
_bayit_email_service = None


def get_bayit_email_service() -> BayitEmailService:
    """Get singleton Bayit email service instance."""
    global _bayit_email_service
    if _bayit_email_service is None:
        _bayit_email_service = BayitEmailService()
    return _bayit_email_service
