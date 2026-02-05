#!/usr/bin/env python3
"""
Seed location-based content for local development.

Creates realistic Israeli businesses, community events, and news articles
for major US cities with Israeli expat populations.

Usage:
    poetry run python scripts/seed_location_content.py --city "New York" --state "NY"
    poetry run python scripts/seed_location_content.py --all-cities
"""
import argparse
import asyncio
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.jewish_community import CommunityEvent

# Major US cities with Israeli expat populations
MAJOR_CITIES = {
    "New York": "NY",
    "Los Angeles": "CA",
    "Miami": "FL",
    "Boston": "MA",
    "San Francisco": "CA",
    "Chicago": "IL",
    "Philadelphia": "PA",
    "Washington": "DC",
    "Atlanta": "GA",
    "Seattle": "WA",
}

# Seed data for Israeli businesses
ISRAELI_BUSINESSES = {
    "New York": [
        {
            "name": "Sababa Israeli Kitchen",
            "type": "restaurant",
            "description": "Authentic Israeli street food featuring falafel, shawarma, and fresh hummus",
            "address": "123 Bleecker St, New York, NY 10012",
            "cuisine": "Israeli, Mediterranean",
        },
        {
            "name": "Dizengoff NYC",
            "type": "restaurant",
            "description": "Famous Israeli hummus shop from Philadelphia, serving creamy hummus bowls",
            "address": "75 9th Ave, New York, NY 10011",
            "cuisine": "Israeli, Vegetarian",
        },
        {
            "name": "Taim Falafel",
            "type": "restaurant",
            "description": "Award-winning falafel and Israeli salads in the heart of Greenwich Village",
            "address": "222 Waverly Pl, New York, NY 10014",
            "cuisine": "Israeli, Falafel",
        },
        {
            "name": "Check Point Security",
            "type": "tech",
            "description": "Israeli cybersecurity company with NYC office",
            "address": "3 Columbus Circle, New York, NY 10019",
            "industry": "Cybersecurity",
        },
        {
            "name": "Via Transportation",
            "type": "tech",
            "description": "Israeli ridesharing startup revolutionizing public transit",
            "address": "101 Avenue of the Americas, New York, NY 10013",
            "industry": "Transportation Tech",
        },
        {
            "name": "Congregation Kehilath Jeshurun",
            "type": "synagogue",
            "description": "Modern Orthodox synagogue with active Israeli community",
            "address": "125 E 85th St, New York, NY 10028",
            "denomination": "Modern Orthodox",
        },
        {
            "name": "Israeli-American Council NY",
            "type": "community",
            "description": "Community center for Israeli-Americans and friends of Israel",
            "address": "265 Madison Ave, New York, NY 10016",
            "services": "Events, Networking, Cultural Programs",
        },
    ],
    "Los Angeles": [
        {
            "name": "Itzik Hagadol",
            "type": "restaurant",
            "description": "Authentic Israeli grill and kebab house",
            "address": "8970 W Pico Blvd, Los Angeles, CA 90035",
            "cuisine": "Israeli, Grill",
        },
        {
            "name": "Waze",
            "type": "tech",
            "description": "Israeli GPS navigation company (Google subsidiary)",
            "address": "3600 Wilshire Blvd, Los Angeles, CA 90010",
            "industry": "Navigation, Mapping",
        },
    ],
    "Miami": [
        {
            "name": "Pita Loca",
            "type": "restaurant",
            "description": "Israeli-Mediterranean restaurant with fresh pitas and salads",
            "address": "2500 Collins Ave, Miami Beach, FL 33140",
            "cuisine": "Israeli, Mediterranean",
        },
    ],
}

# Seed data for community events
ISRAELI_EVENTS_TEMPLATES = [
    {
        "title": "Israeli Independence Day Celebration",
        "event_type": "cultural",
        "description": "Join us for a vibrant celebration of Yom Ha'atzmaut with Israeli music, food, and dancing",
        "virtual": False,
        "tags": ["yom_haatzmaut", "independence_day", "israeli_culture"],
    },
    {
        "title": "Israeli Tech Meetup",
        "event_type": "networking",
        "description": "Monthly networking event for Israeli entrepreneurs and tech professionals",
        "virtual": False,
        "tags": ["tech", "networking", "startups"],
    },
    {
        "title": "Hebrew Language Conversation Circle",
        "event_type": "educational",
        "description": "Practice your Hebrew in a casual, friendly environment with native speakers",
        "virtual": False,
        "tags": ["hebrew", "language", "education"],
    },
    {
        "title": "Israeli Film Festival Screening",
        "event_type": "cultural",
        "description": "Monthly screening of award-winning Israeli films with Q&A",
        "virtual": False,
        "tags": ["film", "culture", "arts"],
    },
    {
        "title": "Israeli-American Young Professionals Happy Hour",
        "event_type": "social",
        "description": "Network with other Israeli-American professionals over drinks",
        "virtual": False,
        "tags": ["networking", "young_professionals", "social"],
    },
]


async def seed_community_events(city: str, state: str, db):
    """Seed community events for a city."""
    print(f"\n🎉 Seeding community events for {city}, {state}...")

    events_collection = db.community_events

    # Clear existing seed events for this city
    await events_collection.delete_many({
        "location": {"$regex": f"(?i){city}"},
        "_seed_data": True,
    })

    events_created = 0
    now = datetime.now(timezone.utc)

    for i, template in enumerate(ISRAELI_EVENTS_TEMPLATES):
        # Create 2 events per template (one upcoming, one future)
        for offset_days in [7, 30]:
            start_time = now + timedelta(days=offset_days + i)
            end_time = start_time + timedelta(hours=2)

            event_data = {
                "title": template["title"],
                "description": template["description"],
                "event_type": template["event_type"],
                "start_time": start_time,
                "end_time": end_time,
                "location": f"{city}, {state}",
                "virtual": template["virtual"],
                "is_active": True,
                "tags": template["tags"],
                "organizer": "Israeli-American Council",
                "contact_email": f"events@iac{state.lower()}.org",
                "_seed_data": True,  # Mark as seed data
                "created_at": now,
                "updated_at": now,
            }

            await events_collection.insert_one(event_data)
            events_created += 1

    print(f"   ✓ Created {events_created} community events")
    return events_created


async def seed_businesses_cache(city: str, state: str, db):
    """Seed business listings in the location content cache."""
    print(f"\n🏢 Seeding Israeli businesses for {city}, {state}...")

    businesses = ISRAELI_BUSINESSES.get(city, [])
    if not businesses:
        print(f"   ⚠️  No seed business data available for {city}")
        return 0

    # Create business articles for caching
    business_articles = []
    for idx, biz in enumerate(businesses):
        article = {
            "id": f"business-{city.lower().replace(' ', '-')}-{idx}",
            "title": biz["name"],
            "description": biz["description"],
            "thumbnail": f"https://images.unsplash.com/photo-{1500000000 + idx}?w=800&h=450&fit=crop",
            "url": f"https://www.google.com/search?q={biz['name'].replace(' ', '+')}",
            "source": "Seed Data",
            "city": city,
            "state": state,
            "type": "business",
            "content_format": "business_listing",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "business_type": biz["type"],
            "address": biz.get("address", f"{city}, {state}"),
        }
        business_articles.append(article)

    print(f"   ✓ Prepared {len(business_articles)} business listings")
    return len(business_articles)


async def seed_city(city: str, state: str):
    """Seed all location content for a city."""
    print(f"\n{'='*60}")
    print(f"Seeding location content for {city}, {state}")
    print(f"{'='*60}")

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    try:
        # Seed community events (stored in database)
        events_count = await seed_community_events(city, state, db)

        # Seed businesses (will be cached on first API call)
        business_count = await seed_businesses_cache(city, state, db)

        print(f"\n{'='*60}")
        print(f"✅ Seeding complete for {city}, {state}")
        print(f"   Events: {events_count}")
        print(f"   Businesses: {business_count}")
        print(f"{'='*60}\n")

    finally:
        client.close()


async def seed_all_cities():
    """Seed all major cities."""
    print("\n" + "="*60)
    print("Seeding all major US cities with Israeli populations")
    print("="*60)

    for city, state in MAJOR_CITIES.items():
        await seed_city(city, state)

    print("\n" + "="*60)
    print("✅ All cities seeded successfully!")
    print("="*60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Seed location-based content for local development"
    )
    parser.add_argument(
        "--city",
        type=str,
        help="City name (e.g., 'New York')",
    )
    parser.add_argument(
        "--state",
        type=str,
        help="State code (e.g., 'NY')",
    )
    parser.add_argument(
        "--all-cities",
        action="store_true",
        help="Seed all major cities",
    )

    args = parser.parse_args()

    if args.all_cities:
        asyncio.run(seed_all_cities())
    elif args.city and args.state:
        asyncio.run(seed_city(args.city, args.state))
    else:
        parser.print_help()
        print("\nExample usage:")
        print("  poetry run python scripts/seed_location_content.py --city 'New York' --state 'NY'")
        print("  poetry run python scripts/seed_location_content.py --all-cities")
        sys.exit(1)


if __name__ == "__main__":
    main()
