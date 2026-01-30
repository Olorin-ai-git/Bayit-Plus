"""
Email Template Context Models

Pydantic models defining the required context data for each Bayit+ email template.
Used for validation and documentation.
"""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class EmailBaseContext(BaseModel):
    """Base context shared by all email templates."""

    recipient_email: EmailStr
    recipient_name: str = ""
    lang: str = "en"
    subject: str = ""
    logo_url: str = ""
    unsubscribe_url: str = ""
    privacy_url: str = ""
    terms_url: str = ""
    support_url: str = ""
    current_year: int = 2026
    platform_name: str = "Bayit+"
    header_url: str = ""
    company_name: str = ""


class WelcomeEmailContext(EmailBaseContext):
    """Context for welcome email template."""

    dashboard_url: str


class EmailVerificationContext(EmailBaseContext):
    """Context for email verification template."""

    verification_url: str
    expiry_hours: int = 24


class EmailVerificationResendContext(EmailBaseContext):
    """Context for email verification resend template."""

    verification_url: str
    expiry_hours: int = 24


class PasswordResetContext(EmailBaseContext):
    """Context for password reset template."""

    reset_url: str
    expiry_hours: int = 24


class PasswordChangedContext(EmailBaseContext):
    """Context for password changed notification."""

    change_time: str = ""
    ip_address: str = ""


class AccountLockedContext(EmailBaseContext):
    """Context for account locked notification."""

    unlock_url: str = ""
    reason: str = ""


class BetaInvitationContext(EmailBaseContext):
    """Context for beta program invitation."""

    invitation_url: str
    beta_credits: int = 5000
    beta_duration_days: int = 90


class BetaWelcomeContext(EmailBaseContext):
    """Context for beta welcome email."""

    dashboard_url: str
    beta_credits: int = 5000
    beta_duration_days: int = 90


class PaymentConfirmationContext(EmailBaseContext):
    """Context for payment confirmation."""

    transaction_id: str
    plan_name: str
    amount: str
    currency: str
    payment_date: str
    next_billing_date: str


class SubscriptionActivatedContext(EmailBaseContext):
    """Context for subscription activation."""

    plan_name: str
    features: list[str] = Field(default_factory=list)
    expires_at: str = ""


class SubscriptionCancelledContext(EmailBaseContext):
    """Context for subscription cancellation."""

    plan_name: str
    access_until: str
    reason: str = ""


class PaymentFailedContext(EmailBaseContext):
    """Context for failed payment notification."""

    plan_name: str
    amount: str
    currency: str
    retry_url: str = ""
    failure_reason: str = ""


class TrialExpiringContext(EmailBaseContext):
    """Context for trial expiring notification."""

    days_remaining: int
    plan_name: str
    upgrade_url: str


class SupportTicketCreatedContext(EmailBaseContext):
    """Context for support ticket created."""

    ticket_id: str
    ticket_subject: str
    ticket_url: str


class SupportTicketResponseContext(EmailBaseContext):
    """Context for support ticket response."""

    ticket_id: str
    ticket_subject: str
    ticket_url: str
    response_text: str


class SupportEscalationContext(EmailBaseContext):
    """Context for support ticket escalation."""

    ticket_id: str
    ticket_subject: str
    ticket_url: str
    escalation_reason: str = ""


class SupportTicketResolvedContext(EmailBaseContext):
    """Context for support ticket resolved."""

    ticket_id: str
    ticket_subject: str
    ticket_url: str
    resolution_summary: str = ""


class NewMessageContext(EmailBaseContext):
    """Context for new message notification."""

    sender_name: str
    message_preview: str
    message_url: str


class ContentDigestContext(EmailBaseContext):
    """Context for content digest email."""

    items: list[dict] = Field(default_factory=list)
    digest_period: str = "weekly"


class GdprDeletionContext(EmailBaseContext):
    """Context for GDPR deletion confirmation."""

    deletion_date: str
    data_categories: list[str] = Field(default_factory=list)


class AdminAccountCreatedContext(EmailBaseContext):
    """Context for admin account creation."""

    admin_email: str
    role: str
    login_url: str
    temp_password: str = ""


class RoleChangeContext(EmailBaseContext):
    """Context for role change notification."""

    old_role: str
    new_role: str
    changed_by: str = ""


class CampaignEmailContext(EmailBaseContext):
    """Context for marketing campaign."""

    campaign_id: str = ""
    headline: str
    body_html: str
    cta_url: str
    cta_text: str
    hero_image_url: str = ""


class NewsletterContext(EmailBaseContext):
    """Context for newsletter."""

    headline: str
    sections: list[dict] = Field(default_factory=list)


class ReengagementContext(EmailBaseContext):
    """Context for reengagement email."""

    days_inactive: int
    featured_content: list[dict] = Field(default_factory=list)
    return_url: str
