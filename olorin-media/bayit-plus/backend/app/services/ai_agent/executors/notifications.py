"""
AI Agent Executors - Notifications

Functions for sending email notifications to administrators.
"""

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.services.email_service import send_email

logger = logging.getLogger(__name__)


async def execute_send_email_notification(
    severity: str,
    subject: str,
    summary: str,
    critical_issues: List[Dict[str, Any]],
    items_checked: int,
    issues_found: int,
    issues_fixed: int = 0,
    manual_action_needed: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Send an email notification to administrators about major issues."""
    try:
        admin_emails_str = settings.ADMIN_EMAIL_ADDRESSES
        if not admin_emails_str:
            logger.warning("No admin email addresses configured")
            return {
                "success": False,
                "error": "No admin email addresses configured (ADMIN_EMAIL_ADDRESSES)",
            }

        admin_emails = [e.strip() for e in admin_emails_str.split(",") if e.strip()]
        if not admin_emails:
            return {"success": False, "error": "No valid admin email addresses found"}

        severity_emoji = "🔴" if severity == "critical" else "🟠"
        severity_color = "#dc2626" if severity == "critical" else "#f97316"

        issues_html = ""
        for issue in critical_issues:
            priority_badge = (
                '<span style="background-color: #dc2626; color: white; padding: 2px 8px; '
                'border-radius: 4px; font-size: 12px;">CRITICAL</span>'
                if issue.get("priority") == "critical"
                else '<span style="background-color: #f97316; color: white; padding: 2px 8px; '
                'border-radius: 4px; font-size: 12px;">HIGH</span>'
            )

            issues_html += f"""
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <strong>{issue.get('title', 'Unknown Issue')}</strong> {priority_badge}
                    <br><span style="color: #6b7280; font-size: 14px;">
                        {issue.get('description', '')}
                    </span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                    <strong>{issue.get('affected_items', 0)}</strong>
                </td>
            </tr>
            """

        actions_html = ""
        if manual_action_needed:
            actions_html = "<ul>"
            for action in manual_action_needed:
                actions_html += f"<li style='margin-bottom: 8px;'>{action}</li>"
            actions_html += "</ul>"

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1a1a2e; padding: 30px; border-radius: 12px;">
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <span style="font-size: 32px; margin-right: 12px;">{severity_emoji}</span>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
                        Bayit+ Library Audit Alert
                    </h1>
                </div>

                <div style="background-color: {severity_color}; color: white; padding: 12px 16px;
                            border-radius: 8px; margin-bottom: 20px;">
                    <strong>Severity: {severity.upper()}</strong>
                </div>

                <div style="background-color: #2a2a4e; padding: 20px; border-radius: 8px;
                            margin-bottom: 20px;">
                    <h2 style="color: #ffffff; margin-top: 0;">Summary</h2>
                    <p style="color: #b8b8d1; line-height: 1.6;">{summary}</p>

                    <div style="display: flex; justify-content: space-around; margin-top: 20px;">
                        <div style="text-align: center;">
                            <div style="color: #818cf8; font-size: 24px; font-weight: bold;">
                                {items_checked}
                            </div>
                            <div style="color: #6b7280; font-size: 12px;">Items Checked</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="color: #f97316; font-size: 24px; font-weight: bold;">
                                {issues_found}
                            </div>
                            <div style="color: #6b7280; font-size: 12px;">Issues Found</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="color: #10b981; font-size: 24px; font-weight: bold;">
                                {issues_fixed}
                            </div>
                            <div style="color: #6b7280; font-size: 12px;">Auto-Fixed</div>
                        </div>
                    </div>
                </div>

                <div style="background-color: #2a2a4e; padding: 20px; border-radius: 8px;
                            margin-bottom: 20px;">
                    <h2 style="color: #ffffff; margin-top: 0;">Critical Issues</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="background-color: #1a1a2e;">
                            <th style="padding: 12px; text-align: left; color: #b8b8d1;">Issue</th>
                            <th style="padding: 12px; text-align: center; color: #b8b8d1;">
                                Affected Items
                            </th>
                        </tr>
                        {issues_html}
                    </table>
                </div>

                {"<div style='background-color: #2a2a4e; padding: 20px; border-radius: 8px;'>"
                 "<h2 style='color: #ffffff; margin-top: 0;'>Action Required</h2>"
                 "<div style='color: #b8b8d1;'>" + actions_html + "</div></div>"
                 if actions_html else ""}

                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #374151;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                        This is an automated alert from the Bayit+ AI Librarian system.
                        <br>View full details in the
                        <a href="{settings.FRONTEND_URL}/admin/librarian" style="color: #818cf8;">
                            Admin Dashboard
                        </a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        email_sent = await send_email(
            to_emails=admin_emails,
            subject=f"[Bayit+ {severity.upper()}] {subject}",
            html_content=html_content,
        )

        if email_sent:
            logger.info(f"Audit alert email sent to {len(admin_emails)} admin(s)")
            return {
                "success": True,
                "message": f"Email sent to {len(admin_emails)} administrator(s)",
                "recipients": admin_emails,
            }
        else:
            logger.warning("Failed to send audit alert email")
            return {
                "success": False,
                "error": "Failed to send email (check SendGrid configuration)",
            }

    except Exception as e:
        logger.error(f"Error sending email notification: {str(e)}")
        return {"success": False, "error": str(e)}
