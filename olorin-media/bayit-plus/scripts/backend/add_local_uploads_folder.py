#!/usr/bin/env python3
"""Add local uploads/vod folder as a monitored folder"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime

from app.core.database import close_mongo_connection, connect_to_mongo
from app.models.upload import ContentType, MonitoredFolder


async def main():
    await connect_to_mongo()

    # Check if already exists
    # Use environment variable or default to project-relative path
    project_root = os.getenv("PROJECT_ROOT", str(Path(__file__).parent.parent.parent))
    local_vod_path = os.getenv("UPLOADS_VOD_DIR", f"{project_root}/backend/uploads/vod")
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
