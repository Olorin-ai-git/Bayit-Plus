"""Unit tests for seed_pilot_students script (04-01, Task 1).

Tests idempotent upsert logic, email/password patterns, and role assignment.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _mock_training_user(**kwargs):
    user = MagicMock()
    for k, v in kwargs.items():
        setattr(user, k, v)
    return user


@pytest.mark.asyncio
async def test_creates_five_students_and_one_teacher():
    """Seed creates 5 viewer students + 1 teacher account."""
    from scripts.seed_pilot_students import seed_accounts

    created = []

    async def fake_find_one(_filter):
        return None

    async def fake_save(self):
        created.append(self)

    with (
        patch(
            "scripts.seed_pilot_students.TrainingUser"
        ) as mock_tu,
        patch(
            "scripts.seed_pilot_students.IntegrationPartner"
        ) as mock_ip,
    ):
        mock_tu.find_one = fake_find_one
        mock_tu.side_effect = lambda **kw: MagicMock(**kw, save=AsyncMock())
        mock_ip.find_one = AsyncMock(return_value=None)
        mock_ip.side_effect = lambda **kw: MagicMock(**kw, save=AsyncMock())
        await seed_accounts()

    # Constructor called 6 times: 5 students + 1 teacher
    assert mock_tu.call_count == 6


@pytest.mark.asyncio
async def test_student_emails_match_pattern():
    """Student emails follow student-N@pilot.bayit.tv pattern."""
    from scripts.seed_pilot_students import PILOT_STUDENTS

    for i, student in enumerate(PILOT_STUDENTS, start=1):
        assert student["email"] == f"student-{i}@pilot.bayit.tv"
        assert student["role"] == "viewer"


@pytest.mark.asyncio
async def test_teacher_email_and_role():
    """Teacher account has correct email and role=teacher."""
    from scripts.seed_pilot_students import PILOT_TEACHER

    assert PILOT_TEACHER["email"] == "teacher-1@pilot.bayit.tv"
    assert PILOT_TEACHER["role"] == "teacher"


@pytest.mark.asyncio
async def test_idempotent_upsert_skips_existing():
    """Existing user found by email+partner_id is skipped, not duplicated."""
    from scripts.seed_pilot_students import seed_accounts

    existing_user = _mock_training_user(
        email="student-1@pilot.bayit.tv",
        partner_id="pilot_org",
    )

    call_count = {"new": 0}

    async def fake_find_one(filter_dict):
        if filter_dict.get("email") == "student-1@pilot.bayit.tv":
            return existing_user
        return None

    with (
        patch(
            "scripts.seed_pilot_students.TrainingUser"
        ) as mock_tu,
        patch(
            "scripts.seed_pilot_students.IntegrationPartner"
        ) as mock_ip,
    ):
        mock_tu.find_one = fake_find_one

        def track_new(**kw):
            call_count["new"] += 1
            m = MagicMock(**kw, save=AsyncMock())
            return m

        mock_tu.side_effect = track_new
        mock_ip.find_one = AsyncMock(return_value=MagicMock())
        await seed_accounts()

    # Only 5 new (skipped student-1, created 2-5 + teacher)
    assert call_count["new"] == 5
