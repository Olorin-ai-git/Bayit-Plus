#!/usr/bin/env python3
"""
Test script to verify hash caching system.

This script:
1. Lists monitored folders
2. Triggers a scan
3. Shows scan statistics including cache hits
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import close_mongo_connection, connect_to_mongo
from app.models.upload import MonitoredFolder
from app.services.folder_monitor_service import FolderMonitorService


async def main():
    print("🔍 Testing Hash Caching System\n")
    print("=" * 60)

    # Connect to database
    await connect_to_mongo()
    print("✅ Connected to MongoDB\n")

    # List monitored folders
    folders = await MonitoredFolder.find_all().to_list()

    if not folders:
        print("❌ No monitored folders configured!")
        print("\nAdd a folder first via the Admin UI:")
        print("  http://localhost:3000/admin/uploads")
        await close_mongo_connection()
        return

    print(f"📁 Found {len(folders)} monitored folder(s):\n")
    for i, folder in enumerate(folders, 1):
        enabled_icon = "✅" if folder.enabled else "❌"
        auto_upload_icon = "🚀" if folder.auto_upload else "⏸️"
        print(f"{i}. {enabled_icon} {folder.name}")
        print(f"   Path: {folder.path}")
        print(f"   Type: {folder.content_type}")
        print(f"   Auto-upload: {auto_upload_icon}")
        print(f"   Recursive: {folder.recursive}")
        print()

    # Test scan
    print("=" * 60)
    print("\n🔄 Running test scan...\n")

    monitor_service = FolderMonitorService()

    # First scan
    print("📊 SCAN #1 (will calculate hashes for new files):")
    stats1 = await monitor_service.scan_and_enqueue()

    print(f"\nResults:")
    print(f"  • Folders scanned: {stats1.get('folders_scanned', 0)}")
    print(f"  • Files found: {stats1.get('files_found', 0)}")
    print(f"  • Files enqueued: {stats1.get('files_enqueued', 0)}")

    if stats1.get("files_enqueued", 0) > 0:
        print(f"\n💡 {stats1['files_enqueued']} files enqueued for processing.")
        print("   Hashes will be calculated in the background during upload.")

    # Wait a moment
    print("\n⏳ Waiting 3 seconds...")
    await asyncio.sleep(3)

    # Second scan (should use cache)
    print("\n📊 SCAN #2 (should use cached data):")
    stats2 = await monitor_service.scan_and_enqueue()

    print(f"\nResults:")
    print(f"  • Folders scanned: {stats2.get('folders_scanned', 0)}")
    print(f"  • Files found: {stats2.get('files_found', 0)}")
    print(f"  • Files enqueued: {stats2.get('files_enqueued', 0)}")

    if stats2.get("files_enqueued", 0) == 0:
        print("\n✅ SUCCESS! No files re-enqueued (duplicates detected!)")
        print("   This means the caching system is working correctly.")
    else:
        print(f"\n⚠️  {stats2['files_enqueued']} files re-enqueued")
        print("   (This may be normal if files were added between scans)")

    # Check cache files
    print("\n" + "=" * 60)
    print("\n📂 Cache Files:")
    cache_dir = Path("/tmp/.bayit_hash_cache")

    if cache_dir.exists():
        cache_files = list(cache_dir.glob("*.json"))
        print(f"\nFound {len(cache_files)} cache file(s) in {cache_dir}:")

        for cache_file in cache_files:
            size = cache_file.stat().st_size
            print(f"  • {cache_file.name} ({size:,} bytes)")
    else:
        print(f"\n⚠️  Cache directory not found: {cache_dir}")

    print("\n" + "=" * 60)
    print("\n✅ Test complete!")
    print("\nTo monitor real-time activity:")
    print("  tail -f /tmp/bayit-server.log | grep -E '📊|✓|⏭️'")

    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
