#!/usr/bin/env python3
"""Add local uploads/vod folder as a monitored folder"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.upload import MonitoredFolder, ContentType
from datetime import datetime

async def main():
    await connect_to_mongo()
    
    # Check if already exists
    local_vod_path = "/Users/olorin/Documents/Bayit-Plus/backend/uploads/vod"
    existing = await MonitoredFolder.find_one(MonitoredFolder.path == local_vod_path)
    
    if existing:
        print(f"✅ Folder already exists: {existing.name} (ID: {existing.id})")
    else:
        # Create new monitored folder
        folder = MonitoredFolder(
            name="Local VOD Uploads",
            path=local_vod_path,
            content_type=ContentType.MOVIE,
            enabled=True,
            auto_upload=False,  # Don't auto-upload, just hash
            recursive=False,
            file_patterns=["*.mp4", "*.mkv", "*.avi", "*.mov"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await folder.insert()
        print(f"✅ Created monitored folder: {folder.name} (ID: {folder.id})")
        print(f"   Path: {folder.path}")
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
