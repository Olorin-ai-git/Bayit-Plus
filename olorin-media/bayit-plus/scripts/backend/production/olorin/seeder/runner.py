"""
Cultural References Seeder Runner

Main seeding logic for populating the cultural references knowledge base.
"""

import logging
from datetime import datetime, timezone

from app.core.database import get_database
from app.models.cultural_reference import CulturalReference

from scripts.olorin.seeder.data import ALL_REFERENCES

logger = logging.getLogger(__name__)


async def seed_cultural_references() -> dict:
    """
    Seed the cultural reference knowledge base.

    Returns:
        dict with created, updated, skipped counts
    """
    # Use existing database infrastructure (no duplicate connections)
    db = await get_database()

    logger.info("Starting cultural references seeding...")

    created_count = 0
    updated_count = 0
    skipped_count = 0

    for ref_data in ALL_REFERENCES:
        reference_id = ref_data["reference_id"]

        existing = await CulturalReference.find_one(
            CulturalReference.reference_id == reference_id
        )

        if existing:
            if existing.verified:
                logger.debug(f"Skipping verified reference: {reference_id}")
                skipped_count += 1
                continue
            else:
                for key, value in ref_data.items():
                    setattr(existing, key, value)
                existing.updated_at = datetime.now(timezone.utc)
                await existing.save()
                logger.info(f"Updated reference: {reference_id}")
                updated_count += 1
        else:
            reference = CulturalReference(
                **ref_data,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            await reference.insert()
            logger.info(f"Created reference: {reference_id}")
            created_count += 1

    client.close()

    logger.info(
        f"Seeding complete: {created_count} created, {updated_count} updated, "
        f"{skipped_count} skipped (verified)"
    )
    logger.info(f"Total references: {created_count + updated_count + skipped_count}")

    return {
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "total": len(ALL_REFERENCES),
    }


async def get_reference_stats() -> dict:
    """
    Get statistics about the cultural references in the database.

    Returns:
        dict with category counts and totals
    """
    # Use existing database infrastructure (no duplicate connections)
    db = await get_database()

    total = await CulturalReference.count()
    verified = await CulturalReference.find(CulturalReference.verified == True).count()

    # Count by category
    categories = {}
    for ref in await CulturalReference.find_all().to_list():
        cat = (
            ref.category.value if hasattr(ref.category, "value") else str(ref.category)
        )
        categories[cat] = categories.get(cat, 0) + 1

    client.close()

    return {
        "total": total,
        "verified": verified,
        "unverified": total - verified,
        "by_category": categories,
    }
