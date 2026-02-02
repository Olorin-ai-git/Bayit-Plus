#!/usr/bin/env python3
"""
Send Platform Invitation Script

Usage:
    poetry run python scripts/send_platform_invitation.py user@example.com
    poetry run python scripts/send_platform_invitation.py user@example.com --inviter "John Doe"
    poetry run python scripts/send_platform_invitation.py user@example.com --message "Looking forward to watching together!"
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.logging_config import get_logger
from app.services.bayit_email_service import get_bayit_email_service

logger = get_logger(__name__)


async def main():
    """Send platform invitation email using Olorin shared email package."""
    parser = argparse.ArgumentParser(
        description="Send Bayit+ platform invitation email"
    )
    parser.add_argument("email", help="Recipient email address")
    parser.add_argument(
        "--inviter",
        "-i",
        help="Name of person inviting (optional)",
        default=None,
    )
    parser.add_argument(
        "--message",
        "-m",
        help="Personal message from inviter (optional)",
        default=None,
    )

    args = parser.parse_args()

    logger.info(
        "Sending platform invitation",
        extra={
            "recipient": args.email,
            "inviter": args.inviter,
            "has_message": bool(args.message),
        },
    )

    # Get Bayit email service (wraps Olorin core email)
    bayit_email = get_bayit_email_service()

    # Send invitation
    result = await bayit_email.send_platform_invitation(
        to_email=args.email,
        inviter_name=args.inviter,
        personal_message=args.message,
    )

    if result.success:
        print(f"Invitation sent successfully to {args.email}")
        if result.message_id:
            print(f"Message ID: {result.message_id}")
        return 0
    else:
        print(f"Email send failed: {result.message}")
        print(f"Provider: {result.provider}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
