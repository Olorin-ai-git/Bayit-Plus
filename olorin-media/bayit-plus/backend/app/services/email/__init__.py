"""
Bayit+ Email Service

Wraps the olorin_email core package with Bayit-specific branding,
template registration, and typed convenience methods.
"""

from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
from olorin_email import (
    EmailBuilder,
    EmailSender,
    EmailSettings,
    SendGridProvider,
    TemplateEngine,
    TemplateRegistry,
)
from olorin_email.provider.base import EmailMessage, SendResult

from app.core.config import Settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Path to Bayit+ email templates
_BAYIT_TEMPLATES_DIR = str(Path(__file__).resolve().parents[2] / "templates" / "email")


class BayitEmailService:
    """Bayit+ email service with branded templates and convenience methods."""

    def __init__(self, settings: Settings) -> None:
        # Build email settings from app settings
        self._email_settings = EmailSettings(
            SENDGRID_API_KEY=settings.SENDGRID_API_KEY,
            SENDGRID_FROM_EMAIL=settings.SENDGRID_FROM_EMAIL,
            SENDGRID_FROM_NAME=settings.SENDGRID_FROM_NAME,
            SENDGRID_WEBHOOK_VERIFICATION_KEY=settings.SENDGRID_WEBHOOK_VERIFICATION_KEY,
            EMAIL_TEMPLATE_DIRS=[_BAYIT_TEMPLATES_DIR],
            EMAIL_DEFAULT_REPLY_TO=settings.EMAIL_DEFAULT_REPLY_TO,
            EMAIL_UNSUBSCRIBE_URL=settings.EMAIL_UNSUBSCRIBE_URL,
        )

        # Initialize core components
        self._http_client = httpx.AsyncClient(timeout=30.0)
        self._provider = SendGridProvider(self._http_client, self._email_settings)
        self._engine = TemplateEngine(
            self._email_settings,
            translate_fn=self._translate,
        )
        self._registry = TemplateRegistry(self._email_settings)
        self._registry.register_template_dir(_BAYIT_TEMPLATES_DIR)
        self._sender = EmailSender(
            self._email_settings, self._provider, self._engine
        )
        self._settings = settings

        logger.info(
            "BayitEmailService initialized",
            extra={"template_dir": _BAYIT_TEMPLATES_DIR},
        )

    def _translate(self, key: str, default: str = "", **kwargs) -> str:
        """Translation passthrough - loads from i18n if available."""
        from app.services.email.i18n_loader import translate

        lang = kwargs.pop("lang", "en")
        return translate(key, lang=lang, default=default, **kwargs)

    def _base_context(self, settings: Settings, lang: str = "en") -> dict:
        """Build base template context with Bayit+ branding."""
        return {
            "lang": lang,
            "platform_name": "Bayit+",
            "logo_url": settings.EMAIL_LOGO_URL,
            "header_url": settings.FRONTEND_URL,
            "unsubscribe_url": settings.EMAIL_UNSUBSCRIBE_URL,
            "privacy_url": settings.EMAIL_PRIVACY_URL,
            "terms_url": settings.EMAIL_TERMS_URL,
            "support_url": settings.EMAIL_SUPPORT_URL,
            "company_name": "Bayit+ by Olorin.ai",
            "current_year": datetime.now().year,
        }

    async def send_welcome(
        self, email: str, name: str, lang: str = "en"
    ) -> SendResult:
        """Send welcome email to new user."""
        context = {
            **self._base_context(self._settings, lang),
            "recipient_name": name,
            "recipient_email": email,
            "dashboard_url": f"{self._settings.FRONTEND_URL}/dashboard",
        }
        message = (
            EmailBuilder(self._email_settings)
            .to(email)
            .subject(
                self._translate(
                    "email.welcome.subject", "Welcome to Bayit+!", lang=lang
                )
            )
            .template("transactional/welcome", context)
            .category("transactional")
            .tag("welcome")
            .build()
        )
        return await self._sender.send(message)

    async def send_verification(
        self,
        email: str,
        name: str,
        verification_url: str,
        expiry_hours: int,
        lang: str = "en",
    ) -> SendResult:
        """Send email verification."""
        context = {
            **self._base_context(self._settings, lang),
            "recipient_name": name,
            "recipient_email": email,
            "verification_url": verification_url,
            "expiry_hours": expiry_hours,
        }
        message = (
            EmailBuilder(self._email_settings)
            .to(email)
            .subject(
                self._translate(
                    "email.verification.subject", "Verify Your Email", lang=lang
                )
            )
            .template("transactional/email_verification", context)
            .category("transactional")
            .tag("verification")
            .build()
        )
        return await self._sender.send(message)

    async def send_password_reset(
        self,
        email: str,
        name: str,
        reset_url: str,
        expiry_hours: int,
        lang: str = "en",
    ) -> SendResult:
        """Send password reset email."""
        context = {
            **self._base_context(self._settings, lang),
            "recipient_name": name,
            "recipient_email": email,
            "reset_url": reset_url,
            "expiry_hours": expiry_hours,
        }
        message = (
            EmailBuilder(self._email_settings)
            .to(email)
            .subject(
                self._translate(
                    "email.password_reset.subject", "Reset Your Password", lang=lang
                )
            )
            .template("transactional/password_reset", context)
            .category("transactional")
            .tag("password-reset")
            .build()
        )
        return await self._sender.send(message)

    async def send_beta_invitation(
        self, email: str, name: str, invitation_url: str, lang: str = "en"
    ) -> SendResult:
        """Send beta program invitation."""
        context = {
            **self._base_context(self._settings, lang),
            "recipient_name": name,
            "recipient_email": email,
            "invitation_url": invitation_url,
            "beta_credits": self._settings.BETA_AI_CREDITS,
            "beta_duration_days": self._settings.BETA_DURATION_DAYS,
        }
        message = (
            EmailBuilder(self._email_settings)
            .to(email)
            .subject(
                self._translate(
                    "email.beta_invitation.subject",
                    "You're Invited to Bayit+ Beta!",
                    lang=lang,
                )
            )
            .template("transactional/beta_invitation", context)
            .category("transactional")
            .tag("beta-invitation")
            .build()
        )
        return await self._sender.send(message)

    async def send_payment_confirmation(
        self,
        email: str,
        name: str,
        transaction_id: str,
        plan_name: str,
        amount: str,
        currency: str,
        payment_date: str,
        next_billing_date: str,
        lang: str = "en",
    ) -> SendResult:
        """Send payment confirmation."""
        context = {
            **self._base_context(self._settings, lang),
            "recipient_name": name,
            "recipient_email": email,
            "transaction_id": transaction_id,
            "plan_name": plan_name,
            "amount": amount,
            "currency": currency,
            "payment_date": payment_date,
            "next_billing_date": next_billing_date,
        }
        message = (
            EmailBuilder(self._email_settings)
            .to(email)
            .subject(
                self._translate(
                    "email.payment_confirmation.subject",
                    "Payment Confirmation",
                    lang=lang,
                )
            )
            .template("payment/payment_confirmation", context)
            .category("transactional")
            .tag("payment")
            .build()
        )
        return await self._sender.send(message)

    async def send_support_notification(
        self,
        email: str,
        name: str,
        ticket_id: str,
        ticket_subject: str,
        event_type: str,
        response_text: str = "",
        lang: str = "en",
    ) -> SendResult:
        """Send support ticket notification (created, response, resolved)."""
        template_map = {
            "created": "notification/support_ticket_created",
            "response": "notification/support_ticket_response",
            "escalation": "notification/support_escalation",
            "resolved": "notification/support_ticket_resolved",
        }
        template_name = template_map.get(
            event_type, "notification/support_ticket_created"
        )
        subject_map = {
            "created": self._translate(
                "email.support.created_subject",
                f"Ticket #{ticket_id} Created",
                lang=lang,
            ),
            "response": self._translate(
                "email.support.response_subject",
                f"New Response on Ticket #{ticket_id}",
                lang=lang,
            ),
            "escalation": self._translate(
                "email.support.escalation_subject",
                f"Ticket #{ticket_id} Escalated",
                lang=lang,
            ),
            "resolved": self._translate(
                "email.support.resolved_subject",
                f"Ticket #{ticket_id} Resolved",
                lang=lang,
            ),
        }
        context = {
            **self._base_context(self._settings, lang),
            "recipient_name": name,
            "recipient_email": email,
            "ticket_id": ticket_id,
            "ticket_subject": ticket_subject,
            "ticket_url": f"{self._settings.FRONTEND_URL}/support/tickets/{ticket_id}",
            "response_text": response_text,
        }
        message = (
            EmailBuilder(self._email_settings)
            .to(email)
            .subject(subject_map.get(event_type, f"Support Ticket #{ticket_id}"))
            .template(template_name, context)
            .category("notification")
            .tag("support")
            .build()
        )
        return await self._sender.send(message)

    async def send_gdpr_deletion_confirmation(
        self, email: str, deletion_date: str, data_categories: list[str], lang: str = "en"
    ) -> SendResult:
        """Send GDPR data deletion confirmation."""
        context = {
            **self._base_context(self._settings, lang),
            "recipient_email": email,
            "recipient_name": "",
            "deletion_date": deletion_date,
            "data_categories": data_categories,
        }
        message = (
            EmailBuilder(self._email_settings)
            .to(email)
            .subject(
                self._translate(
                    "email.gdpr.deletion_subject",
                    "Data Deletion Confirmation",
                    lang=lang,
                )
            )
            .template("notification/gdpr_deletion_confirmation", context)
            .category("transactional")
            .tag("gdpr")
            .build()
        )
        return await self._sender.send(message)

    async def send_email(
        self,
        to_emails: list[str],
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
    ) -> bool:
        """Backward-compatible method matching old email_service.send_email signature."""
        results = []
        for email_addr in to_emails:
            msg = EmailMessage(
                to_email=email_addr,
                subject=subject,
                html_content=html_content,
                from_email=from_email or self._email_settings.SENDGRID_FROM_EMAIL,
                from_name=self._email_settings.SENDGRID_FROM_NAME,
            )
            result = await self._sender.send(msg)
            results.append(result.success)
        return all(results)

    async def close(self) -> None:
        """Close HTTP client connections."""
        await self._http_client.aclose()


# Singleton factory
_service_instance: Optional[BayitEmailService] = None


def get_email_service(settings: Settings) -> BayitEmailService:
    """Get or create the singleton BayitEmailService."""
    global _service_instance
    if _service_instance is None:
        _service_instance = BayitEmailService(settings)
    return _service_instance
