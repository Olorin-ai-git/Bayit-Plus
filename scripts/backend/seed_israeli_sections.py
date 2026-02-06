"""Seed Israeli Movies and Israeli Series sections into the database."""
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Now import after path is set
from app.models.content_taxonomy import ContentSection
from app.core.database import connect_to_mongo, close_mongo_connection


async def seed_israeli_sections():
    """Create Israeli Movies and Israeli Series sections."""
    await connect_to_mongo()

    sections = [
        {
            "slug": "israeli-movies",
            "name_key": "taxonomy.sections.israeli-movies",
            "description_key": "taxonomy.sections.israeli-movies.description",
            "icon": "film",
            "color": "#0038B8",  # Israeli flag blue
            "order": 10,
            "is_active": True,
            "show_on_homepage": True,
            "show_on_nav": True,
            "supports_subcategories": False,
            "default_content_format": "movie",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        {
            "slug": "israeli-series",
            "name_key": "taxonomy.sections.israeli-series",
            "description_key": "taxonomy.sections.israeli-series.description",
            "icon": "tv",
            "color": "#0038B8",
            "order": 11,
            "is_active": True,
            "show_on_homepage": True,
            "show_on_nav": True,
            "supports_subcategories": False,
            "default_content_format": "series",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    ]

    for section_data in sections:
        existing = await ContentSection.find_one(ContentSection.slug == section_data["slug"])
        if existing:
            print(f"Section {section_data['slug']} already exists")
            continue

        section = ContentSection(**section_data)
        await section.insert()
        print(f"✅ Created section: {section_data['slug']}")


if __name__ == "__main__":
    asyncio.run(seed_israeli_sections())
    asyncio.run(close_mongo_connection())
