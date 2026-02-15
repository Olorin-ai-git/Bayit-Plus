#!/usr/bin/env python3
"""
Test Password Reset Email Functionality

This script tests the complete password reset flow:
1. Request password reset (generates token)
2. Sends email
3. Verifies token in database
4. Confirms password reset with token

Usage:
    cd backend
    poetry run python scripts/test_password_reset_email.py test@example.com
"""

import asyncio
import sys
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, '/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend')

from app.core.database import init_db
from app.models.user import User
from app.services.bayit_email_service import get_bayit_email_service


async def test_password_reset_flow(test_email: str):
    """Test password reset flow end-to-end."""
    print(f"\n{'='*60}")
    print(f"Testing Password Reset Flow for: {test_email}")
    print(f"{'='*60}\n")

    # Initialize database
    print("📡 Connecting to database...")
    await init_db()
    print("✅ Database connected\n")

    # Find or create test user
    print(f"🔍 Looking for user: {test_email}")
    user = await User.find_one({"email": test_email})

    if not user:
        print(f"❌ User not found: {test_email}")
        print("   Please create a user first or use an existing email address")
        return

    print(f"✅ User found: {user.name} ({user.email})\n")

    # Test 1: Generate password reset token
    print("🔐 TEST 1: Generating password reset token...")
    import secrets
    from datetime import timedelta

    reset_token = secrets.token_urlsafe(32)
    user.password_reset_token = reset_token
    user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await user.save()

    print(f"✅ Token generated: {reset_token[:10]}...")
    print(f"   Expires: {user.password_reset_expires}\n")

    # Test 2: Send password reset email
    print("📧 TEST 2: Sending password reset email...")

    from app.core.config import settings
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1a1a2e; padding: 40px; border-radius: 12px;">
            <h1 style="color: #ffffff; margin: 0 0 20px 0;">Password Reset Request</h1>
            <p style="color: #b8b8d1; line-height: 1.6;">
                Hi {user.name or 'there'},
            </p>
            <p style="color: #b8b8d1; line-height: 1.6;">
                We received a request to reset your password for your Bayit+ account.
                Click the button below to reset your password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}"
                   style="background: linear-gradient(135deg, #4f46e5, #7c3aed);
                          color: white;
                          padding: 14px 32px;
                          text-decoration: none;
                          border-radius: 8px;
                          font-weight: bold;
                          display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p style="color: #b8b8d1; font-size: 14px;">
                Or copy and paste this link into your browser:<br>
                <a href="{reset_url}" style="color: #818cf8;">{reset_url}</a>
            </p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                This link will expire in 1 hour. If you didn't request this password reset,
                you can safely ignore this email.
            </p>
        </div>
    </body>
    </html>
    """

    try:
        bayit_email = get_bayit_email_service()
        result = await bayit_email.send_generic_email(
            to_emails=[user.email],
            subject="Reset your Bayit+ password",
            html_content=html_content,
        )

        if result.success:
            print("✅ Email sent successfully!")
            print(f"   To: {user.email}")
            print(f"   Subject: Reset your Bayit+ password")
            print(f"   Reset URL: {reset_url}\n")
        else:
            print(f"❌ Email send failed: {result.error_message}\n")
    except Exception as e:
        print(f"❌ Email send error: {str(e)}\n")

    # Test 3: Verify token in database
    print("🔍 TEST 3: Verifying token in database...")
    verified_user = await User.find_one({"password_reset_token": reset_token})

    if verified_user:
        print(f"✅ Token verified in database")
        print(f"   User: {verified_user.email}")
        print(f"   Token: {verified_user.password_reset_token[:10]}...")
        print(f"   Expires: {verified_user.password_reset_expires}\n")
    else:
        print("❌ Token not found in database\n")

    # Test 4: Test token expiry check
    print("🕐 TEST 4: Checking token expiry...")
    is_expired = user.password_reset_expires < datetime.now(timezone.utc)
    if is_expired:
        print("❌ Token is expired")
    else:
        time_remaining = user.password_reset_expires - datetime.now(timezone.utc)
        print(f"✅ Token is valid")
        print(f"   Time remaining: {time_remaining}\n")

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"User: {user.email}")
    print(f"Reset Token: {reset_token}")
    print(f"Reset URL: {reset_url}")
    print(f"Token Expiry: {user.password_reset_expires}")
    print(f"\nTo complete the test:")
    print(f"1. Check your email inbox for: {user.email}")
    print(f"2. Click the reset link in the email")
    print(f"3. Or use this URL directly: {reset_url}")
    print(f"4. Enter a new password and submit")
    print(f"\nTo test with curl:")
    print(f'curl -X POST http://localhost:8000/api/v1/auth/password-reset/confirm \\')
    print(f'  -H "Content-Type: application/json" \\')
    print(f'  -d \'{{"token": "{reset_token}", "new_password": "NewPassword123!"}}\'')
    print(f"{'='*60}\n")


async def check_email_configuration():
    """Check email service configuration."""
    print("\n📋 Checking Email Configuration...\n")

    from app.core.config import settings

    required_vars = {
        "SENDGRID_API_KEY": getattr(settings, "SENDGRID_API_KEY", ""),
        "SENDGRID_FROM_EMAIL": getattr(settings, "SENDGRID_FROM_EMAIL", ""),
        "FRONTEND_URL": getattr(settings, "FRONTEND_URL", ""),
    }

    all_configured = True
    for var_name, var_value in required_vars.items():
        if var_value:
            print(f"✅ {var_name}: {var_value if 'KEY' not in var_name else '***'}")
        else:
            print(f"❌ {var_name}: NOT SET")
            all_configured = False

    if all_configured:
        print("\n✅ All email configuration variables are set\n")
    else:
        print("\n❌ Some configuration variables are missing")
        print("   Set them in .env or Google Cloud Secret Manager\n")

    return all_configured


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_password_reset_email.py <email@example.com>")
        sys.exit(1)

    test_email = sys.argv[1]

    async def main():
        config_ok = await check_email_configuration()
        if config_ok:
            await test_password_reset_flow(test_email)
        else:
            print("❌ Cannot proceed without proper email configuration")

    asyncio.run(main())
