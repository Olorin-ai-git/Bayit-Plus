#!/usr/bin/env python3
"""
Hash all local files in monitored folders and save to database.
This builds the hash database for duplicate detection without requiring GCS uploads.
"""

import asyncio
import sys
from pathlib import Path
from typing import Dict, List
import logging
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.upload import MonitoredFolder, ContentType
from app.models.content import Content
from app.services.folder_monitor_service import FolderMonitorService
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

async def hash_and_save_file(
    file_path: Path,
    content_type: ContentType,
    monitor_service: FolderMonitorService,
    stats: Dict
) -> bool:
    """
    Calculate hash for a file and save metadata to database.
    Returns True if successful, False otherwise.
    """
    try:
        filename = file_path.name
        file_stat = file_path.stat()
        file_size = file_stat.st_size
        
        # Check if already in database by stream_url (quick check)
        existing = await Content.find_one(Content.stream_url == str(file_path.absolute()))
        if existing and existing.file_hash:
            logger.info(f"  ⏭️  SKIP: {filename} (already in DB with hash)")
            stats['skipped_existing'] += 1
            return False
        
        # Calculate or retrieve cached hash
        logger.info(f"  📊 Processing: {filename} ({file_size:,} bytes)")
        file_hash = await monitor_service._get_or_calculate_hash(str(file_path), file_stat)
        
        if not file_hash:
            logger.error(f"  ❌ FAILED: Could not calculate hash")
            stats['failed'] += 1
            return False
        
        logger.info(f"     Hash: {file_hash[:16]}...")
        
        # Check if hash already exists in database (duplicate detection)
        existing_by_hash = await Content.find_one(Content.file_hash == file_hash)
        if existing_by_hash:
            logger.info(f"     ⚠️  DUPLICATE: Matches '{existing_by_hash.title}' in database")
            stats['duplicates'] += 1
            return False
        
        # Create new Content entry with hash
        # Use local file path as stream_url for now (can be updated later when uploaded to GCS)
        # Note: Need a category_id - use a default one or create placeholder
        from motor.motor_asyncio import AsyncIOMotorClient
        from bson import ObjectId
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.MONGODB_DB_NAME]
        
        # Get first category as default
        default_category = await db.categories.find_one()
        if not default_category:
            logger.error(f"  ❌ FAILED: No categories in database")
            stats['failed'] += 1
            return False
        
        content = Content(
            title=file_path.stem,  # Filename without extension
            content_type=content_type.value,
            file_hash=file_hash,
            file_size=file_size,
            stream_url=str(file_path.absolute()),  # Local path for now
            category_id=str(default_category['_id']),
            is_published=False,  # Not published until actually uploaded to GCS
        )
        
        await content.insert()
        logger.info(f"     ✅ SAVED to database (ID: {content.id})")
        stats['saved'] += 1
        return True
        
    except Exception as e:
        logger.error(f"  ❌ ERROR: {filename} - {e}")
        stats['failed'] += 1
        return False

async def scan_folder(
    folder: MonitoredFolder,
    monitor_service: FolderMonitorService,
    stats: Dict
):
    """Scan a single monitored folder and hash all files"""
    
    logger.info(f"\n{'='*70}")
    logger.info(f"📁 Scanning: {folder.name}")
    logger.info(f"   Path: {folder.path}")
    logger.info(f"   Type: {folder.content_type}")
    logger.info(f"   Recursive: {folder.recursive}")
    logger.info(f"{'='*70}\n")
    
    folder_path = Path(folder.path)
    
    if not folder_path.exists():
        logger.warning(f"⚠️  Folder not found: {folder.path}")
        return
    
    if not folder_path.is_dir():
        logger.warning(f"⚠️  Not a directory: {folder.path}")
        return
    
    # Get file patterns
    patterns = folder.file_patterns if folder.file_patterns else monitor_service._get_default_patterns(folder.content_type)
    
    # Scan directory
    logger.info(f"🔍 Scanning directory...")
    found_files = await asyncio.to_thread(
        monitor_service._scan_directory_sync,
        folder_path,
        patterns,
        folder.exclude_patterns,
        folder.recursive
    )
    
    logger.info(f"✓ Found {len(found_files)} file(s)\n")
    stats['files_found'] += len(found_files)
    
    if not found_files:
        logger.info("No files to process.\n")
        return
    
    # Load hash cache for this folder
    folder_id = str(folder.id)
    monitor_service._hash_cache = monitor_service._load_hash_cache(folder_id)
    logger.info(f"📂 Loaded cache with {len(monitor_service._hash_cache)} entries\n")
    
    # Process files
    for i, file_path in enumerate(found_files, 1):
        logger.info(f"[{i}/{len(found_files)}]")
        await hash_and_save_file(
            Path(file_path),
            folder.content_type,
            monitor_service,
            stats
        )
        
        # Yield control every 5 files
        if i % 5 == 0:
            await asyncio.sleep(0)
    
    # Save updated cache
    monitor_service._save_hash_cache(folder_id, monitor_service._hash_cache)
    cache_file = monitor_service._get_cache_file(folder_id)
    cache_size = cache_file.stat().st_size if cache_file.exists() else 0
    logger.info(f"\n💾 Saved cache: {cache_file.name} ({cache_size:,} bytes)")
    
    # Update folder stats (if fields exist)
    if hasattr(folder, 'last_scan'):
        folder.last_scan = datetime.utcnow()
    if hasattr(folder, 'last_error'):
        folder.last_error = None
    if hasattr(folder, 'error_count'):
        folder.error_count = 0
    await folder.save()

async def main():
    logger.info("🎯 Hash All Local Files")
    logger.info("=" * 70)
    logger.info("This will:")
    logger.info("  • Scan all monitored folders")
    logger.info("  • Calculate SHA256 hash for each file")
    logger.info("  • Use cache for previously hashed files (instant)")
    logger.info("  • Save file metadata + hash to database")
    logger.info("  • Skip GCS upload (local files only)")
    logger.info("=" * 70 + "\n")
    
    # Connect to database
    await connect_to_mongo()
    logger.info("✅ Connected to MongoDB\n")
    
    # Get monitored folders
    folders = await MonitoredFolder.find_all().to_list()
    
    if not folders:
        logger.error("❌ No monitored folders configured!")
        logger.info("\nAdd folders via the Admin UI:")
        logger.info("  http://localhost:3000/admin/uploads\n")
        await close_mongo_connection()
        return
    
    logger.info(f"📊 Found {len(folders)} monitored folder(s):\n")
    for i, folder in enumerate(folders, 1):
        enabled = "✅" if folder.enabled else "❌"
        logger.info(f"{i}. {enabled} {folder.name} ({folder.content_type})")
        logger.info(f"   {folder.path}")
    
    logger.info("")
    
    # Initialize monitor service
    monitor_service = FolderMonitorService()
    
    # Stats
    stats = {
        'folders_scanned': 0,
        'files_found': 0,
        'saved': 0,
        'duplicates': 0,
        'skipped_existing': 0,
        'failed': 0,
    }
    
    # Scan each folder
    for folder in folders:
        await scan_folder(folder, monitor_service, stats)
        stats['folders_scanned'] += 1
    
    # Final summary
    logger.info("\n" + "=" * 70)
    logger.info("🎉 FINAL SUMMARY")
    logger.info("=" * 70 + "\n")
    
    logger.info(f"Folders scanned:    {stats['folders_scanned']}")
    logger.info(f"Files found:        {stats['files_found']}")
    logger.info(f"✅ Saved to DB:     {stats['saved']}")
    logger.info(f"⏭️  Duplicates:      {stats['duplicates']}")
    logger.info(f"⏭️  Already in DB:   {stats['skipped_existing']}")
    logger.info(f"❌ Failed:          {stats['failed']}")
    
    logger.info(f"\n📂 Hash cache location: /tmp/.bayit_hash_cache/")
    
    # Show cache files
    cache_dir = Path("/tmp/.bayit_hash_cache")
    if cache_dir.exists():
        cache_files = list(cache_dir.glob("*.json"))
        total_cache_size = sum(f.stat().st_size for f in cache_files)
        logger.info(f"   {len(cache_files)} cache file(s), {total_cache_size:,} bytes total")
    
    logger.info("\n" + "=" * 70)
    
    if stats['saved'] > 0:
        logger.info(f"\n✅ Successfully hashed and saved {stats['saved']} file(s)!")
        logger.info("   Hashes are now in the database for duplicate detection.")
        logger.info("   Future scans will use cached hashes (instant lookups).")
    
    if stats['duplicates'] > 0:
        logger.info(f"\n⚠️  Found {stats['duplicates']} duplicate(s) (same hash as existing content)")
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
