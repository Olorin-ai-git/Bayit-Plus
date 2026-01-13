#!/usr/bin/env python3
"""
Library Status Checker
Shows how many items still need metadata, posters, or subtitles
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc


async def check_library_status():
    """Analyze library and report on missing metadata/subtitles"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # Initialize Beanie
    from beanie import init_beanie
    await init_beanie(
        database=db,
        document_models=[Content, SubtitleTrackDoc]
    )
    
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 25 + "LIBRARY STATUS REPORT" + " " * 32 + "║")
    print("╚" + "=" * 78 + "╝")
    print()
    
    # Get all content
    all_content = await Content.find_all().to_list()
    total = len(all_content)
    
    print(f"📊 Total Content Items: {total}")
    print()
    
    # Analyze metadata issues
    missing_poster = 0
    missing_imdb_rating = 0
    missing_content_type = 0
    missing_description = 0
    missing_metadata = 0
    
    for content in all_content:
        if not content.poster_url and not content.thumbnail:
            missing_poster += 1
        if content.imdb_id and not content.imdb_rating:
            missing_imdb_rating += 1
        if not content.content_type:
            missing_content_type += 1
        if not content.description:
            missing_description += 1
    
    missing_metadata = missing_poster + missing_imdb_rating + missing_content_type + missing_description
    
    print("🎨 METADATA STATUS")
    print(f"   ✅ Complete metadata: {total - missing_metadata} ({(total - missing_metadata) / total * 100:.1f}%)")
    print(f"   ❌ Missing poster: {missing_poster}")
    print(f"   ❌ Missing IMDB rating: {missing_imdb_rating}")
    print(f"   ❌ Missing content type: {missing_content_type}")
    print(f"   ❌ Missing description: {missing_description}")
    print()
    
    # Analyze subtitles
    required_languages = ["en", "he", "es"]
    items_with_all_subs = 0
    items_missing_subs = 0
    missing_by_language = {"en": 0, "he": 0, "es": 0}
    
    for content in all_content:
        # Get subtitles for this content
        subtitles = await SubtitleTrackDoc.find(
            SubtitleTrackDoc.content_id == str(content.id)
        ).to_list()
        
        existing_languages = {sub.language for sub in subtitles}
        missing_languages = set(required_languages) - existing_languages
        
        if not missing_languages:
            items_with_all_subs += 1
        else:
            items_missing_subs += 1
            for lang in missing_languages:
                missing_by_language[lang] += 1
    
    print("🎬 SUBTITLE STATUS")
    print(f"   ✅ Complete (EN/HE/ES): {items_with_all_subs} ({items_with_all_subs / total * 100:.1f}%)")
    print(f"   ❌ Missing subtitles: {items_missing_subs} ({items_missing_subs / total * 100:.1f}%)")
    print(f"      - Missing EN: {missing_by_language['en']} items")
    print(f"      - Missing HE: {missing_by_language['he']} items")
    print(f"      - Missing ES: {missing_by_language['es']} items")
    print()
    
    # Calculate estimated time to complete
    if items_missing_subs > 0:
        # Rough estimate: 3 languages × items / 20 downloads per day
        total_subtitle_downloads_needed = sum(missing_by_language.values())
        days_needed = total_subtitle_downloads_needed / 20
        
        print("⏱️  ESTIMATED TIME TO COMPLETE")
        print(f"   Total subtitle downloads needed: {total_subtitle_downloads_needed}")
        print(f"   At 20 downloads/day: ~{int(days_needed)} days")
        print(f"   (Note: Embedded subtitle extraction is instant and free!)")
        print()
    
    # Overall health score
    metadata_health = (total - missing_metadata) / total * 100
    subtitle_health = items_with_all_subs / total * 100
    overall_health = (metadata_health + subtitle_health) / 2
    
    print("🏥 OVERALL LIBRARY HEALTH")
    print(f"   Metadata: {metadata_health:.1f}%")
    print(f"   Subtitles: {subtitle_health:.1f}%")
    print(f"   Overall: {overall_health:.1f}%")
    print()
    
    # Recommendations
    print("💡 RECOMMENDATIONS")
    
    if missing_metadata > 0:
        print(f"   1. Run comprehensive audit to fix {missing_metadata} metadata issues:")
        print(f"      ./scripts/run_comprehensive_audit.sh")
        print()
    
    if items_missing_subs > 0:
        print(f"   2. Run daily subtitle audits to acquire missing subtitles:")
        print(f"      ./scripts/run_subtitle_audit.sh")
        print(f"      (Run this daily for {int(days_needed)} days)")
        print()
    
    if overall_health > 90:
        print("   🎉 Your library is in great shape!")
    elif overall_health > 70:
        print("   ✅ Good progress! Keep running daily audits.")
    elif overall_health > 50:
        print("   ⚠️  Significant work needed. Run comprehensive audits.")
    else:
        print("   ❌ Major issues detected. Start with metadata fixes first.")
    
    print()
    print("╚" + "=" * 78 + "╝")
    
    if client:
        client.close()  # Motor client.close() is synchronous


if __name__ == "__main__":
    asyncio.run(check_library_status())
