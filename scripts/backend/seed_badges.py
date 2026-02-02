#!/usr/bin/env python3
"""
Seed Badge Definitions for Kids Quiz Feature.

This script seeds initial badge definitions for the quiz reward system.
Run this once during initial deployment or when badge definitions change.

Usage:
    cd backend
    poetry run python scripts/seed_badges.py

Badge Definitions:
- First Quiz: Complete 1 quiz
- Quiz Rookie: Complete 5 quizzes
- Quiz Fan: Complete 25 quizzes
- Quiz Master: Complete 100 quizzes
- Perfect Start: First perfect score
- Perfectionist: 10 perfect scores
- On Fire (Streak 3): 3-day streak
- Week Warrior: 7-day streak
- Monthly Master: 30-day streak
"""

import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.reward import Badge

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


BADGE_DEFINITIONS = [
    # Quiz completion badges
    {
        "badge_id": "first_quiz",
        "name": "First Quiz",
        "name_he": "החידון הראשון",
        "description": "Complete your first quiz",
        "description_he": "השלם את החידון הראשון שלך",
        "icon_url": "/assets/badges/first_quiz.svg",
        "requirement_type": "quizzes_completed",
        "requirement_value": 1,
        "points_bonus": 25,
        "rarity": "common",
    },
    {
        "badge_id": "quiz_rookie",
        "name": "Quiz Rookie",
        "name_he": "טירון חידונים",
        "description": "Complete 5 quizzes",
        "description_he": "השלם 5 חידונים",
        "icon_url": "/assets/badges/quiz_rookie.svg",
        "requirement_type": "quizzes_completed",
        "requirement_value": 5,
        "points_bonus": 50,
        "rarity": "common",
    },
    {
        "badge_id": "quiz_fan",
        "name": "Quiz Fan",
        "name_he": "חובב חידונים",
        "description": "Complete 25 quizzes",
        "description_he": "השלם 25 חידונים",
        "icon_url": "/assets/badges/quiz_fan.svg",
        "requirement_type": "quizzes_completed",
        "requirement_value": 25,
        "points_bonus": 100,
        "rarity": "rare",
    },
    {
        "badge_id": "quiz_master",
        "name": "Quiz Master",
        "name_he": "אלוף החידונים",
        "description": "Complete 100 quizzes",
        "description_he": "השלם 100 חידונים",
        "icon_url": "/assets/badges/quiz_master.svg",
        "requirement_type": "quizzes_completed",
        "requirement_value": 100,
        "points_bonus": 250,
        "rarity": "epic",
    },
    # Perfect score badges
    {
        "badge_id": "perfect_start",
        "name": "Perfect Start",
        "name_he": "התחלה מושלמת",
        "description": "Get your first perfect score",
        "description_he": "קבל את הציון המושלם הראשון שלך",
        "icon_url": "/assets/badges/perfect_start.svg",
        "requirement_type": "perfect_scores",
        "requirement_value": 1,
        "points_bonus": 50,
        "rarity": "common",
    },
    {
        "badge_id": "perfectionist",
        "name": "Perfectionist",
        "name_he": "שלמותן",
        "description": "Get 10 perfect scores",
        "description_he": "קבל 10 ציונים מושלמים",
        "icon_url": "/assets/badges/perfectionist.svg",
        "requirement_type": "perfect_scores",
        "requirement_value": 10,
        "points_bonus": 150,
        "rarity": "rare",
    },
    # Streak badges
    {
        "badge_id": "streak_3",
        "name": "On Fire",
        "name_he": "בוער",
        "description": "Complete quizzes 3 days in a row",
        "description_he": "השלם חידונים 3 ימים ברצף",
        "icon_url": "/assets/badges/streak_3.svg",
        "requirement_type": "streak_days",
        "requirement_value": 3,
        "points_bonus": 30,
        "rarity": "common",
    },
    {
        "badge_id": "streak_7",
        "name": "Week Warrior",
        "name_he": "לוחם השבוע",
        "description": "Complete quizzes 7 days in a row",
        "description_he": "השלם חידונים 7 ימים ברצף",
        "icon_url": "/assets/badges/streak_7.svg",
        "requirement_type": "streak_days",
        "requirement_value": 7,
        "points_bonus": 100,
        "rarity": "rare",
    },
    {
        "badge_id": "streak_30",
        "name": "Monthly Master",
        "name_he": "אלוף החודש",
        "description": "Complete quizzes 30 days in a row",
        "description_he": "השלם חידונים 30 ימים ברצף",
        "icon_url": "/assets/badges/streak_30.svg",
        "requirement_type": "streak_days",
        "requirement_value": 30,
        "points_bonus": 500,
        "rarity": "legendary",
    },
]


async def seed_badges() -> None:
    """Seed badge definitions into the database."""
    logger.info("Connecting to MongoDB...")
    await connect_to_mongo()

    logger.info("Seeding badge definitions...")
    created_count = 0
    updated_count = 0

    for badge_def in BADGE_DEFINITIONS:
        existing = await Badge.find_one({"badge_id": badge_def["badge_id"]})

        if existing:
            for key, value in badge_def.items():
                setattr(existing, key, value)
            existing.is_active = True
            await existing.save()
            logger.info(f"Updated badge: {badge_def['badge_id']}")
            updated_count += 1
        else:
            badge = Badge(**badge_def, is_active=True, created_at=datetime.utcnow())
            await badge.insert()
            logger.info(f"Created badge: {badge_def['badge_id']}")
            created_count += 1

    logger.info(
        f"Badge seeding complete. Created: {created_count}, Updated: {updated_count}"
    )

    await close_mongo_connection()


async def list_badges() -> None:
    """List all badges in the database."""
    await connect_to_mongo()

    badges = await Badge.find().to_list()
    logger.info(f"Found {len(badges)} badges:")

    for badge in badges:
        status = "active" if badge.is_active else "inactive"
        logger.info(
            f"  - {badge.badge_id}: {badge.name} ({badge.rarity}) [{status}]"
        )

    await close_mongo_connection()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed badge definitions")
    parser.add_argument(
        "--list",
        action="store_true",
        help="List existing badges instead of seeding",
    )
    args = parser.parse_args()

    if args.list:
        asyncio.run(list_badges())
    else:
        asyncio.run(seed_badges())
