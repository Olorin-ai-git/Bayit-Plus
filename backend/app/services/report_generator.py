"""
Report Generator Service
Generates comprehensive audit reports and sends notifications
"""
import logging
from datetime import datetime
from typing import Optional

from app.models.librarian import AuditReport

logger = logging.getLogger(__name__)


async def send_audit_report(audit_report: AuditReport):
    """
    Generate and send audit report.

    Delivery methods:
    1. MongoDB storage (already done)
    2. Email notification (if configured)
    """
    logger.info(f"📧 Generating audit report...")

    try:
        # Generate HTML report
        html_report = generate_html_report(audit_report)

        # Send email if configured
        try:
            from app.core.config import settings
            from app.services.email_service import send_email

            if (
                hasattr(settings, "ADMIN_EMAIL_ADDRESSES")
                and settings.ADMIN_EMAIL_ADDRESSES
            ):
                admin_emails = settings.ADMIN_EMAIL_ADDRESSES.split(",")
                admin_emails = [email.strip() for email in admin_emails]

                subject = f"[Bayit+] Daily Librarian Report - {audit_report.audit_date.strftime('%Y-%m-%d')}"

                await send_email(
                    to_emails=admin_emails, subject=subject, html_content=html_report
                )

                logger.info(f"   ✅ Email sent to {len(admin_emails)} recipients")
            else:
                logger.info(
                    f"   ℹ️  No admin email addresses configured, skipping email"
                )

        except ImportError:
            logger.warning("   ⚠️ Email service not configured")
        except Exception as e:
            logger.warning(f"   ⚠️ Failed to send email: {e}")

    except Exception as e:
        logger.error(f"❌ Failed to generate report: {e}")


def generate_html_report(audit_report: AuditReport) -> str:
    """
    Generate HTML email report from audit results.

    Creates a clean, formatted HTML email with:
    - Summary metrics
    - Issues breakdown
    - Actions taken
    - AI insights
    """
    summary = audit_report.summary
    total_items = summary.get("total_items", 0)
    issues_found = summary.get("issues_found", 0)
    issues_fixed = summary.get("issues_fixed", 0)
    manual_review = summary.get("manual_review_needed", 0)
    healthy_items = summary.get("healthy_items", 0)

    # Calculate health percentage
    health_percentage = (healthy_items / total_items * 100) if total_items > 0 else 100

    # Status emoji
    status_emoji = (
        "✅" if health_percentage >= 90 else "⚠️" if health_percentage >= 70 else "❌"
    )

    # Format execution time
    exec_time = audit_report.execution_time_seconds
    exec_time_str = f"{exec_time:.2f}s" if exec_time < 60 else f"{exec_time/60:.1f}m"

    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
        }}
        .header .date {{
            opacity: 0.9;
            margin-top: 5px;
        }}
        .summary {{
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 25px;
        }}
        .metric {{
            display: inline-block;
            margin: 10px 20px 10px 0;
            font-size: 18px;
        }}
        .metric-value {{
            font-weight: bold;
            font-size: 24px;
            color: #667eea;
        }}
        .section {{
            margin-bottom: 30px;
        }}
        .section-title {{
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #2c3e50;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 10px;
        }}
        .issue-list {{
            background: #fff;
            border-left: 4px solid #ff6b6b;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
        }}
        .fix-list {{
            background: #fff;
            border-left: 4px solid #51cf66;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
        }}
        .insight {{
            background: #e7f5ff;
            border-left: 4px solid #339af0;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
        }}
        .footer {{
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 14px;
            margin-top: 40px;
            border-top: 1px solid #e0e0e0;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-left: 10px;
        }}
        .badge-success {{
            background: #d3f9d8;
            color: #2b8a3e;
        }}
        .badge-warning {{
            background: #fff3bf;
            color: #e67700;
        }}
        .badge-danger {{
            background: #ffe3e3;
            color: #c92a2a;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{status_emoji} Librarian AI Agent Report</h1>
        <div class="date">{audit_report.audit_date.strftime('%A, %B %d, %Y at %H:%M UTC')}</div>
        <div class="date">Execution Time: {exec_time_str} | Type: {audit_report.audit_type}</div>
    </div>

    <div class="summary">
        <h2 style="margin-top: 0;">Summary</h2>
        <div class="metric">
            <div>Library Health</div>
            <div class="metric-value">{health_percentage:.1f}%</div>
        </div>
        <div class="metric">
            <div>Total Items</div>
            <div class="metric-value">{total_items:,}</div>
        </div>
        <div class="metric">
            <div>Healthy</div>
            <div class="metric-value" style="color: #51cf66;">{healthy_items:,}</div>
        </div>
        <div class="metric">
            <div>Issues Found</div>
            <div class="metric-value" style="color: #ff6b6b;">{issues_found}</div>
        </div>
        <div class="metric">
            <div>Auto-Fixed</div>
            <div class="metric-value" style="color: #339af0;">{issues_fixed}</div>
        </div>
    </div>
"""

    # Content breakdown
    content_results = audit_report.content_results
    if isinstance(content_results, dict):
        html += f"""
    <div class="section">
        <div class="section-title">Content Audit</div>
        <p><strong>Items checked:</strong> {content_results.get('items_checked', 0)}</p>
        <p><strong>Missing metadata:</strong> {len(audit_report.missing_metadata)}</p>
        <p><strong>Misclassifications:</strong> {len(audit_report.misclassifications)}</p>
    </div>
"""

    # Issues found
    if issues_found > 0:
        html += """
    <div class="section">
        <div class="section-title">⚠️ Issues Found</div>
"""

        if audit_report.broken_streams:
            html += f"""
        <div class="issue-list">
            <strong>🔗 Broken Streams ({len(audit_report.broken_streams)})</strong>
            <ul>
"""
            for stream in audit_report.broken_streams[:5]:  # Show first 5
                title = stream.get("title", "Unknown")
                error = stream.get("error", "Unknown error")
                html += f"                <li>{title}: {error}</li>\n"

            if len(audit_report.broken_streams) > 5:
                html += f"                <li><em>...and {len(audit_report.broken_streams) - 5} more</em></li>\n"

            html += """
            </ul>
        </div>
"""

        if audit_report.missing_metadata:
            html += f"""
        <div class="issue-list">
            <strong>📝 Missing Metadata ({len(audit_report.missing_metadata)})</strong>
            <ul>
"""
            for item in audit_report.missing_metadata[:5]:
                title = item.get("title", "Unknown")
                issues = ", ".join(item.get("issues", []))
                html += f"                <li>{title}: {issues}</li>\n"

            if len(audit_report.missing_metadata) > 5:
                html += f"                <li><em>...and {len(audit_report.missing_metadata) - 5} more</em></li>\n"

            html += """
            </ul>
        </div>
"""

        if audit_report.misclassifications:
            html += f"""
        <div class="issue-list">
            <strong>🏷️ Misclassifications ({len(audit_report.misclassifications)})</strong>
            <ul>
"""
            for item in audit_report.misclassifications[:5]:
                content_id = item.get("content_id", "Unknown")
                current_cat = item.get("current_category", "Unknown")
                suggested_cat = item.get("suggested_category", "Unknown")
                confidence = item.get("confidence", 0) * 100
                html += f"                <li>ID {content_id}: {current_cat} → {suggested_cat} ({confidence:.0f}% confidence)</li>\n"

            if len(audit_report.misclassifications) > 5:
                html += f"                <li><em>...and {len(audit_report.misclassifications) - 5} more</em></li>\n"

            html += """
            </ul>
        </div>
"""

        html += "    </div>\n"

    # Actions taken
    if issues_fixed > 0:
        html += f"""
    <div class="section">
        <div class="section-title">🔧 Actions Taken ({issues_fixed} fixes)</div>
"""
        for fix in audit_report.fixes_applied[:10]:  # Show first 10
            description = fix.get("description", "No description")
            action_type = fix.get("action_type", "unknown")
            html += f"""
        <div class="fix-list">
            <strong>{action_type}:</strong> {description}
        </div>
"""

        if len(audit_report.fixes_applied) > 10:
            html += f"""
        <p><em>...and {len(audit_report.fixes_applied) - 10} more fixes</em></p>
"""

        html += "    </div>\n"

    # AI Insights
    if audit_report.ai_insights:
        html += """
    <div class="section">
        <div class="section-title">🧠 AI Insights</div>
"""
        for insight in audit_report.ai_insights:
            html += f"""
        <div class="insight">
            {insight}
        </div>
"""
        html += "    </div>\n"

    # Database health
    db_health = audit_report.database_health
    if isinstance(db_health, dict):
        connection_status = db_health.get("connection_status", "unknown")
        integrity_status = db_health.get("referential_integrity", "unknown")

        status_badge = (
            "badge-success" if connection_status == "healthy" else "badge-danger"
        )
        integrity_badge = (
            "badge-success" if integrity_status == "passed" else "badge-warning"
        )

        html += f"""
    <div class="section">
        <div class="section-title">🗄️ Database Health</div>
        <p>
            <strong>Connection:</strong>
            <span class="badge {status_badge}">{connection_status}</span>
        </p>
        <p>
            <strong>Referential Integrity:</strong>
            <span class="badge {integrity_badge}">{integrity_status}</span>
        </p>
    </div>
"""

    # Footer
    html += f"""
    <div class="footer">
        <p>Generated by Bayit+ Librarian AI Agent</p>
        <p>Audit ID: {audit_report.audit_id}</p>
        <p>Powered by Claude Sonnet 4.5</p>
    </div>
</body>
</html>
"""

    return html
