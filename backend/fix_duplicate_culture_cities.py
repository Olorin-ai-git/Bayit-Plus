#!/usr/bin/env python3
"""
Fix duplicate CultureCity documents in MongoDB.

This script identifies and removes duplicate CultureCity documents
that have the same city_id, keeping only the oldest entry.
"""

import asyncio
import sys
from collections import defaultdict
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.culture import CultureCity


async def find_duplicate_cities():
    """Find duplicate city_id entries."""
    print("Searching for duplicate culture cities...")

    # Get all cities
    cities = await CultureCity.find_all().to_list()

    # Group by city_id
    cities_by_id = defaultdict(list)
    for city in cities:
        cities_by_id[city.city_id].append(city)

    # Find duplicates
    duplicates = {
        city_id: cities
        for city_id, cities in cities_by_id.items()
        if len(cities) > 1
    }

    return duplicates


async def remove_duplicate_cities(duplicates, dry_run=True):
    """Remove duplicate cities, keeping the oldest entry."""
    total_removed = 0

    for city_id, cities in duplicates.items():
        print(f"\nCity ID '{city_id}' has {len(cities)} duplicates:")

        # Sort by created_at or _id (older first)
        cities_sorted = sorted(cities, key=lambda c: c.id)

        # Keep the first (oldest) entry
        keep_city = cities_sorted[0]
        remove_cities = cities_sorted[1:]

        print(f"  Keeping: {keep_city.name} (ID: {keep_city.id})")

        for city in remove_cities:
            print(f"  Removing: {city.name} (ID: {city.id})")

            if not dry_run:
                await city.delete()
                total_removed += 1

    if dry_run:
        print(f"\n[DRY RUN] Would remove {total_removed} duplicate entries")
    else:
        print(f"\nRemoved {total_removed} duplicate entries")

    return total_removed


async def verify_no_duplicates():
    """Verify that no duplicate city_id entries remain."""
    print("\nVerifying no duplicates remain...")

    cities = await CultureCity.find_all().to_list()
    city_ids = [city.city_id for city in cities]

    unique_count = len(set(city_ids))
    total_count = len(city_ids)

    if unique_count == total_count:
        print(f"✓ All {total_count} cities have unique city_id values")
        return True
    else:
        duplicate_count = total_count - unique_count
        print(f"✗ Found {duplicate_count} duplicate city_id entries")
        return False


async def main():
    """Main execution function."""
    print("=" * 60)
    print("Fix Duplicate Culture Cities")
    print("=" * 60)

    # Initialize database
    await connect_to_mongo()

    try:
        # Find duplicates
        duplicates = await find_duplicate_cities()

        if not duplicates:
            print("\n✓ No duplicate cities found!")
            return

        print(f"\nFound {len(duplicates)} city_id values with duplicates:")
        for city_id, cities in duplicates.items():
            print(f"  - {city_id}: {len(cities)} entries")

        # Dry run first
        print("\n" + "=" * 60)
        print("DRY RUN - Showing what would be removed")
        print("=" * 60)
        await remove_duplicate_cities(duplicates, dry_run=True)

        # Ask for confirmation
        print("\n" + "=" * 60)
        response = input("Proceed with removing duplicates? (yes/no): ").strip().lower()

        if response == "yes":
            print("\nRemoving duplicates...")
            await remove_duplicate_cities(duplicates, dry_run=False)

            # Verify
            success = await verify_no_duplicates()
            if success:
                print("\n✓ Database cleanup complete!")
            else:
                print("\n✗ Some duplicates may still remain. Please review manually.")
        else:
            print("\nCancelled. No changes made.")

    finally:
        # Close database
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
