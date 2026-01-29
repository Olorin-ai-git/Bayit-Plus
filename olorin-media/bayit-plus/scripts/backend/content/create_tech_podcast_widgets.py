"""
Create system widgets for Israeli tech podcasts and update categories.

This script:
1. Updates podcast categories to "Technology"
2. Creates system widgets for each podcast
3. Tests RSS feed connectivity
4. Verifies everything is working

Usage:
    cd backend
    poetry run python ../scripts/backend/content/create_tech_podcast_widgets.py
"""
import asyncio
import sys
from datetime import datetime
from pathlib import Path

import httpx

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[3] / "backend"))

from app.core.database import close_mongo_connection, connect_to_mongo
from app.models.content import Podcast
from app.models.widget import (
    Widget,
    WidgetContent,
    WidgetContentType,
    WidgetPosition,
    WidgetType,
)


TECH_PODCASTS = [
    {
        "title": "חיות כיס",
        "english_title": "Hayot Kiss",
        "description": "Stories about economics in human words",
        "icon": "💰",
        "order": 1,
        "position": {"x": 20, "y": 100, "width": 320, "height": 180, "z_index": 100},
    },
    {
        "title": "בזמן שעבדתם",
        "english_title": "While You Were Working",
        "description": "Tech and media news you missed while working",
        "icon": "📱",
        "order": 2,
        "position": {"x": 360, "y": 100, "width": 320, "height": 180, "z_index": 100},
    },
    {
        "title": "Raymond Tec News",
        "english_title": "Raymond Tec News",
        "description": "Weekly tech news in 15-20 minutes",
        "icon": "🎧",
        "order": 3,
        "position": {"x": 700, "y": 100, "width": 320, "height": 180, "z_index": 100},
    },
]


async def test_rss_connectivity(rss_url: str, timeout: int = 10) -> dict:
    """Test RSS feed connectivity."""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(rss_url)
            response.raise_for_status()

            return {
                "status": "success",
                "status_code": response.status_code,
                "content_length": len(response.content),
                "content_type": response.headers.get("content-type", "unknown"),
            }
    except httpx.TimeoutException:
        return {"status": "timeout", "error": "Connection timed out"}
    except httpx.HTTPStatusError as e:
        return {
            "status": "http_error",
            "error": f"HTTP {e.response.status_code}",
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def update_category_to_technology(podcast: Podcast) -> None:
    """Update podcast category to Technology."""
    podcast.category = "Technology"
    podcast.category_en = "Technology"
    podcast.category_es = "Tecnología"
    podcast.category_fr = "Technologie"
    podcast.category_it = "Tecnologia"
    podcast.category_hi = "तकनीक"
    podcast.category_ta = "தொழில்நுட்பம்"
    podcast.category_bn = "প্রযুক্তি"
    podcast.category_ja = "テクノロジー"
    podcast.category_zh = "科技"
    await podcast.save()


async def create_widget_for_podcast(
    podcast: Podcast, config: dict
) -> Widget:
    """Create system widget for podcast."""
    # Check if widget already exists
    existing = await Widget.find_one(
        Widget.type == WidgetType.SYSTEM,
        Widget.content.podcast_id == str(podcast.id),
    )

    if existing:
        print(f"  ⚠️  Widget already exists for {podcast.title}")
        return existing

    # Create new widget
    widget = Widget(
        type=WidgetType.SYSTEM,
        title=config["description"],
        description=f"{config['english_title']} - Israeli Tech Podcast",
        icon=config["icon"],
        cover_url=podcast.cover or None,
        content=WidgetContent(
            content_type=WidgetContentType.PODCAST,
            podcast_id=str(podcast.id),
        ),
        position=WidgetPosition(**config["position"]),
        is_active=True,
        is_muted=True,
        order=config["order"],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    await widget.insert()
    print(f"  ✅ Widget created: {widget.title}")
    return widget


async def main():
    """Main execution."""
    print("\n" + "=" * 80)
    print("🎛️  Creating Tech Podcast Widgets & Testing Connectivity")
    print("=" * 80 + "\n")

    await connect_to_mongo()
    print("✅ Connected to MongoDB\n")

    results = []

    for config in TECH_PODCASTS:
        podcast_title = config["title"]
        print(f"{'=' * 80}")
        print(f"Processing: {podcast_title} ({config['english_title']})")
        print(f"{'=' * 80}\n")

        # Find podcast
        podcast = await Podcast.find_one(Podcast.title == podcast_title)

        if not podcast:
            print(f"❌ Podcast not found: {podcast_title}\n")
            results.append(
                {
                    "podcast": podcast_title,
                    "status": "not_found",
                    "widget": None,
                    "rss_test": None,
                }
            )
            continue

        # Update category to Technology
        print("📂 Updating category to Technology...")
        await update_category_to_technology(podcast)
        print(f"  ✅ Category updated: {podcast.category}\n")

        # Create widget
        print("🎛️  Creating system widget...")
        widget = await create_widget_for_podcast(podcast, config)
        print()

        # Test RSS connectivity
        print("🔗 Testing RSS feed connectivity...")
        if podcast.rss_feed:
            rss_test = await test_rss_connectivity(podcast.rss_feed)
            if rss_test["status"] == "success":
                print(f"  ✅ RSS feed accessible")
                print(f"     Status: {rss_test['status_code']}")
                print(f"     Content-Type: {rss_test['content_type']}")
                print(f"     Size: {rss_test['content_length']} bytes")
            else:
                print(f"  ❌ RSS feed error: {rss_test.get('error', 'Unknown')}")
        else:
            rss_test = {"status": "no_rss_feed"}
            print(f"  ⚠️  No RSS feed URL")

        print()

        results.append(
            {
                "podcast": podcast_title,
                "podcast_id": str(podcast.id),
                "widget_id": str(widget.id) if widget else None,
                "category": podcast.category,
                "rss_test": rss_test,
            }
        )

    # Summary
    print("=" * 80)
    print("📊 SUMMARY")
    print("=" * 80 + "\n")

    for result in results:
        status_icon = "✅" if result.get("widget_id") else "❌"
        rss_icon = (
            "✅"
            if result["rss_test"]
            and result["rss_test"].get("status") == "success"
            else "⚠️"
        )

        print(f"{status_icon} {result['podcast']}")
        print(f"   Category: {result.get('category', 'N/A')}")
        print(f"   Widget: {result.get('widget_id', 'Not created')}")
        print(f"   RSS: {rss_icon} {result['rss_test'].get('status', 'N/A')}")
        print()

    print("=" * 80)
    print("✅ All tech podcast widgets created and tested")
    print("=" * 80 + "\n")

    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
