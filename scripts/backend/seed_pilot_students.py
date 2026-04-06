"""Seed pilot student and teacher accounts for Phase 4 classroom pilot (D-09).

Creates 5 pilot TrainingUser viewer accounts + 1 teacher account with
memorable credentials, plus an IntegrationPartner doc for the pilot org.
Idempotent: re-running skips existing accounts matched by (email, partner_id).

Usage:
    cd olorin-media/bayit-plus/backend
    poetry run python -m scripts.seed_pilot_students
"""
import asyncio
import logging
import sys

import bcrypt

from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)

PILOT_PARTNER_ID = "pilot_org"

PILOT_STUDENTS = [
    {
        "email": f"student-{i}@pilot.bayit.tv",
        "password": f"pilot-pass-{i}",
        "display_name": f"Pilot Student {i}",
        "role": "viewer",
    }
    for i in range(1, 6)
]

PILOT_TEACHER = {
    "email": "teacher-1@pilot.bayit.tv",
    "password": "pilot-teacher-1",
    "display_name": "Pilot Teacher 1",
    "role": "teacher",
}


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode(), bcrypt.gensalt(),
    ).decode()


async def _upsert_user(account: dict) -> tuple[TrainingUser | None, bool]:
    """Find or create a TrainingUser. Returns (user, created)."""
    existing = await TrainingUser.find_one(
        {"email": account["email"], "partner_id": PILOT_PARTNER_ID},
    )
    if existing is not None:
        return existing, False

    user = TrainingUser(
        email=account["email"],
        password_hash=_hash_password(account["password"]),
        partner_id=PILOT_PARTNER_ID,
        role=account["role"],
        display_name=account["display_name"],
        status="active",
    )
    await user.save()
    return user, True


async def _ensure_partner() -> bool:
    """Create IntegrationPartner for pilot_org if missing. Returns created."""
    existing = await IntegrationPartner.find_one(
        {"partner_id": PILOT_PARTNER_ID},
    )
    if existing is not None:
        return False

    partner = IntegrationPartner(
        partner_id=PILOT_PARTNER_ID,
        name="Pilot Organization",
        name_en="Pilot Organization",
        api_key_hash=_hash_password("pilot-api-key"),
        api_key_prefix="pilot_or",
        contact_email="pilot@bayit.tv",
        capabilities={
            "comprehension_mode": {"enabled": True},
        },
        billing_tier="training",
        training_config={
            "org_display_name": "Pilot Org",
            "org_tier": "organization",
            "credits_remaining": 1000,
        },
        is_active=True,
    )
    await partner.save()
    return True


async def seed_accounts() -> None:
    """Create pilot accounts. Idempotent by (email, partner_id)."""
    all_accounts = PILOT_STUDENTS + [PILOT_TEACHER]

    for account in all_accounts:
        _, created = await _upsert_user(account)
        action = "created" if created else "exists"
        logger.info(
            "Pilot account %s: %s (%s)",
            action, account["email"], account["role"],
        )

    created = await _ensure_partner()
    action = "created" if created else "exists"
    logger.info("IntegrationPartner pilot_org: %s", action)


async def main() -> None:
    """Entrypoint: connect to MongoDB, seed accounts, print credentials."""
    from app.core.database import connect_to_mongo_subset

    await connect_to_mongo_subset([TrainingUser, IntegrationPartner])
    await seed_accounts()

    _print_credentials_table()


def _print_credentials_table() -> None:
    """Print credentials reference for dev running the pilot."""
    header = f"{'Role':<10} {'Email':<35} {'Password':<20}"
    sep = "-" * len(header)
    lines = [sep, header, sep]

    for student in PILOT_STUDENTS:
        lines.append(
            f"{'viewer':<10} {student['email']:<35} "
            f"{student['password']:<20}",
        )

    lines.append(
        f"{'teacher':<10} {PILOT_TEACHER['email']:<35} "
        f"{PILOT_TEACHER['password']:<20}",
    )
    lines.append(sep)

    sys.stdout.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    asyncio.run(main())
