"""
Email Service
Simple email service for sending notifications
Supports SendGrid and SMTP
"""

import logging
from typing import List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to_emails: List[str],
    subject: str,
    html_content: str,
    from_email: Optional[str] = None,
) -> bool:
    """
    Send email using configured email service.

    Supports:
    - SendGrid API (if SENDGRID_API_KEY is set)
    - SMTP (if SMTP_HOST is set) - future implementation
    - Fallback: Log only

    Args:
        to_emails: List of recipient email addresses
        subject: Email subject
        html_content: HTML email body
        from_email: Sender email (optional, uses default from settings)

    Returns:
        True if email sent successfully, False otherwise
    """
    if not to_emails:
        logger.warning("No recipient emails provided")
        return False

    from_email = from_email or getattr(
        settings, "SENDGRID_FROM_EMAIL", "noreply@bayitplus.com"
    )

    # Try SendGrid first
    if hasattr(settings, "SENDGRID_API_KEY") and settings.SENDGRID_API_KEY:
        return await send_via_sendgrid(to_emails, subject, html_content, from_email)

    # Fallback: Just log the email
    logger.info(f"📧 [EMAIL NOT CONFIGURED] Would send email:")
    logger.info(f"   To: {', '.join(to_emails)}")
    logger.info(f"   Subject: {subject}")
    logger.info(f"   (Email service not configured - set SENDGRID_API_KEY in .env)")

    return False


async def send_via_sendgrid(
    to_emails: List[str], subject: str, html_content: str, from_email: str
) -> bool:
    """
    Send email via SendGrid API.

    Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
    """
    try:
        url = "https://api.sendgrid.com/v3/mail/send"

        # Build personalizations for multiple recipients
        personalizations = []
        for to_email in to_emails:
            personalizations.append({"to": [{"email": to_email}]})

        payload = {
            "personalizations": personalizations,
            "from": {"email": from_email},
            "subject": subject,
            "content": [{"type": "text/html", "value": html_content}],
        }

        headers = {
            "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)

            if response.status_code == 202:
                logger.info(
                    f"✅ Email sent successfully to {len(to_emails)} recipients"
                )
                return True
            else:
                logger.error(f"❌ SendGrid API error: {response.status_code}")
                logger.error(f"   Response: {response.text}")
                return False

    except Exception as e:
        logger.error(f"❌ Failed to send email via SendGrid: {e}")
        return False


async def send_platform_invitation(
    to_email: str,
    inviter_name: Optional[str] = None,
    personal_message: Optional[str] = None,
) -> bool:
    """
    Send platform invitation email to a new user.

    Args:
        to_email: Recipient email address
        inviter_name: Name of person inviting (optional)
        personal_message: Personal message from inviter (optional)

    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        # Build invitation URL
        platform_url = getattr(settings, "PLATFORM_URL", "https://bayitplus.com")
        signup_url = f"{platform_url}/signup"

        # Build personal greeting
        greeting = "You're invited to join Bayit+!"
        if inviter_name:
            greeting = f"{inviter_name} invites you to join Bayit+!"

        # Build personal message section
        personal_section = ""
        if personal_message:
            personal_section = f"""
            <div style="background-color: #F7FAFC; border-left: 4px solid #6B46C1; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; color: #2D3748; font-weight: bold;">Personal Message:</p>
                <p style="color: #4A5568; margin: 10px 0 0 0; line-height: 1.6;">
                    "{personal_message}"
                </p>
            </div>
            """

        # Create HTML email template
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #6B46C1; margin-bottom: 10px;">Welcome to Bayit+</h1>
                    <p style="color: #4A5568; font-size: 18px; margin: 0;">Premium Jewish Streaming Platform</p>
                </div>

                <div style="background-color: #F7FAFC; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h2 style="color: #2D3748; margin-top: 0;">{greeting}</h2>
                    <p style="color: #4A5568; line-height: 1.6;">
                        We're excited to invite you to Bayit+ (בית פלוס), the premier streaming platform
                        for Jewish content. Experience the best of Israeli TV, movies, radio, podcasts,
                        and audiobooks—all in one place.
                    </p>

                    {personal_section}

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{signup_url}"
                           style="background-color: #6B46C1; color: white; padding: 14px 40px;
                                  text-decoration: none; border-radius: 6px; display: inline-block;
                                  font-weight: bold; font-size: 16px;">
                            Join Bayit+ Today
                        </a>
                    </div>

                    <p style="color: #718096; font-size: 14px; text-align: center;">
                        Or visit: <a href="{signup_url}" style="color: #6B46C1;">{signup_url}</a>
                    </p>
                </div>

                <div style="background-color: #EDF2F7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <p style="margin: 0 0 15px 0; color: #2D3748; font-weight: bold; font-size: 16px;">
                        What You'll Get:
                    </p>
                    <div style="margin-bottom: 15px;">
                        <p style="margin: 0 0 8px 0; color: #2D3748; font-weight: 600;">📺 Live Israeli TV</p>
                        <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.5;">
                            Watch 10+ Israeli channels with real-time AI dubbing in multiple languages
                        </p>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <p style="margin: 0 0 8px 0; color: #2D3748; font-weight: 600;">🎬 Movies & Series</p>
                        <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.5;">
                            Extensive library of Israeli and Jewish content with subtitles
                        </p>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <p style="margin: 0 0 8px 0; color: #2D3748; font-weight: 600;">📻 24/7 Israeli Radio</p>
                        <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.5;">
                            Stream your favorite Israeli radio stations anytime, anywhere
                        </p>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <p style="margin: 0 0 8px 0; color: #2D3748; font-weight: 600;">🎙️ Podcasts</p>
                        <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.5;">
                            Hebrew podcasts with AI-powered features and recommendations
                        </p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #2D3748; font-weight: 600;">📚 Audiobooks</p>
                        <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.5;">
                            Hebrew audiobooks with advanced playback features
                        </p>
                    </div>
                </div>

                <div style="background-color: #F0FFF4; border-left: 4px solid #38A169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                    <p style="margin: 0; color: #2D3748; font-weight: bold;">
                        ✨ AI-Powered Features
                    </p>
                    <ul style="color: #4A5568; margin: 10px 0; padding-left: 20px;">
                        <li>Smart content recommendations</li>
                        <li>AI-powered search</li>
                        <li>Real-time dubbing and translation</li>
                        <li>Personalized experience</li>
                    </ul>
                </div>

                <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center;">
                    <p style="color: #718096; font-size: 13px; margin: 5px 0; line-height: 1.5;">
                        Questions? Contact us at <a href="mailto:support@bayitplus.com" style="color: #6B46C1;">support@bayitplus.com</a>
                    </p>
                    <p style="color: #A0AEC0; font-size: 12px; margin: 20px 0 5px 0;">
                        © 2026 Bayit+ | Premium Jewish Streaming Platform
                    </p>
                    <p style="color: #CBD5E0; font-size: 11px; margin: 5px 0;">
                        If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                </div>
            </body>
        </html>
        """

        # Send email
        success = await send_email(
            to_emails=[to_email],
            subject="You're Invited to Bayit+ - Premium Jewish Streaming",
            html_content=html_content,
        )

        if success:
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
                "Email service not configured - invitation logged only",
                extra={"recipient": to_email},
            )

        return success

    except Exception as e:
        logger.error(
            "Failed to send platform invitation",
            extra={"recipient": to_email, "error": str(e)},
        )
        return False


async def send_household_invitation(
    to_email: str,
    inviter_name: str,
    household_name: str,
    invitation_code: str,
    role: str,
    expires_at: str,
) -> bool:
    """
    Send household invitation email.

    Args:
        to_email: Recipient email address
        inviter_name: Name of person inviting
        household_name: Name of household
        invitation_code: Invitation code (UUID)
        role: Role being offered (CHILD or GUARDIAN)
        expires_at: ISO format expiration date

    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        platform_url = getattr(settings, "PLATFORM_URL", "https://bayitplus.com")
        accept_url = f"{platform_url}/household/accept-invitation?code={invitation_code}"

        role_display = "Child" if role == "CHILD" else "Guardian"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #6B46C1; margin-bottom: 10px;">Bayit+ Household Invitation</h1>
                    <p style="color: #4A5568; font-size: 18px; margin: 0;">Family Controls & Safe Content</p>
                </div>

                <div style="background-color: #F7FAFC; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h2 style="color: #2D3748; margin-top: 0;">
                        {inviter_name} has invited you to join their household!
                    </h2>
                    <p style="color: #4A5568; line-height: 1.6;">
                        You've been invited to join the <strong>{household_name}</strong> household on Bayit+
                        as a <strong>{role_display}</strong>.
                    </p>
                    <p style="color: #4A5568; line-height: 1.6;">
                        By joining this household, you'll share family controls and parental settings,
                        ensuring a safe and age-appropriate viewing experience for everyone.
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{accept_url}"
                           style="background-color: #6B46C1; color: white; padding: 14px 40px;
                                  text-decoration: none; border-radius: 6px; display: inline-block;
                                  font-weight: bold; font-size: 16px;">
                            Accept Invitation
                        </a>
                    </div>

                    <p style="color: #718096; font-size: 14px; text-align: center;">
                        Or visit: <a href="{accept_url}" style="color: #6B46C1;">{accept_url}</a>
                    </p>
                </div>

                <div style="background-color: #FFF5F5; border-left: 4px solid #F56565; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                    <p style="margin: 0; color: #2D3748; font-weight: bold;">
                        ⏰ Invitation Expires
                    </p>
                    <p style="color: #4A5568; margin: 10px 0 0 0;">
                        This invitation expires on <strong>{expires_at}</strong>. Please accept it before then.
                    </p>
                </div>

                <div style="background-color: #EDF2F7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <p style="margin: 0 0 15px 0; color: #2D3748; font-weight: bold; font-size: 16px;">
                        What is a Household?
                    </p>
                    <p style="color: #4A5568; line-height: 1.6; margin-bottom: 15px;">
                        Bayit+ Households allow families to manage viewing controls together.
                        Parents can set age-appropriate content limits, viewing hours, and
                        content ratings for all household members.
                    </p>
                    <div style="margin-bottom: 10px;">
                        <p style="margin: 0 0 5px 0; color: #2D3748; font-weight: 600;">🛡️ Family Controls</p>
                        <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.5;">
                            Parents manage kids (ages 0-12) and youngsters (ages 12-17) content
                        </p>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <p style="margin: 0 0 5px 0; color: #2D3748; font-weight: 600;">⏰ Viewing Hours</p>
                        <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.5;">
                            Set time restrictions for when children can watch content
                        </p>
                    </div>
                    <div>
                        <p style="margin: 0 0 5px 0; color: #2D3748; font-weight: 600;">🎬 Content Ratings</p>
                        <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.5;">
                            Limit content by rating (G, PG, PG-13) for age-appropriate viewing
                        </p>
                    </div>
                </div>

                <div style="background-color: #F0FFF4; border-left: 4px solid #38A169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                    <p style="margin: 0; color: #2D3748; font-weight: bold;">
                        Your Role: {role_display}
                    </p>
                    <p style="color: #4A5568; margin: 10px 0 0 0; line-height: 1.6;">
                        {
                            "As a Child member, you'll have content viewing based on family controls set by parents."
                            if role == "CHILD"
                            else "As a Guardian, you'll have parent-level permissions to manage family controls and invite members."
                        }
                    </p>
                </div>

                <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center;">
                    <p style="color: #718096; font-size: 13px; margin: 5px 0; line-height: 1.5;">
                        Questions? Contact us at <a href="mailto:support@bayitplus.com" style="color: #6B46C1;">support@bayitplus.com</a>
                    </p>
                    <p style="color: #A0AEC0; font-size: 12px; margin: 20px 0 5px 0;">
                        © 2026 Bayit+ | Premium Jewish Streaming Platform
                    </p>
                    <p style="color: #CBD5E0; font-size: 11px; margin: 5px 0;">
                        If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                </div>
            </body>
        </html>
        """

        success = await send_email(
            to_emails=[to_email],
            subject=f"You're invited to join {household_name} on Bayit+",
            html_content=html_content,
        )

        if success:
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
                "Email service not configured - household invitation logged only",
                extra={"recipient": to_email},
            )

        return success

    except Exception as e:
        logger.error(
            "Failed to send household invitation",
            extra={"recipient": to_email, "error": str(e)},
        )
        return False


# Future: SMTP support
async def send_via_smtp(
    to_emails: List[str], subject: str, html_content: str, from_email: str
) -> bool:
    """
    Send email via SMTP (future implementation).

    Would require settings:
    - SMTP_HOST
    - SMTP_PORT
    - SMTP_USERNAME
    - SMTP_PASSWORD
    - SMTP_USE_TLS
    """
    logger.warning("SMTP email sending not yet implemented")
    return False
