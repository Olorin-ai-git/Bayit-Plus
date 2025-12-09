#!/usr/bin/env python3
"""
Comprehensive System Cleanup Script
- Clears Python cache
- Drops and recreates all database tables (Postgres/SQLite)
- Archives and clears artifacts directory
"""

import os
import sys
import shutil
import glob
from pathlib import Path
from datetime import datetime
import subprocess

# Add project root to sys.path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.persistence.database import drop_tables, create_tables, init_database

def cleanup_cache():
    print("🧹 Cleaning Python cache...")
    count = 0
    for p in project_root.rglob("__pycache__"):
        try:
            shutil.rmtree(p)
            count += 1
        except Exception as e:
            print(f"   Failed to remove {p}: {e}")
    
    pytest_cache = project_root / ".pytest_cache"
    if pytest_cache.exists():
        try:
            shutil.rmtree(pytest_cache)
            count += 1
        except Exception as e:
            print(f"   Failed to remove {pytest_cache}: {e}")
        
    print(f"✅ Cache cleaned ({count} directories removed)")

def cleanup_database():
    print("🗑️ Cleaning database (Drop & Recreate Tables)...")
    try:
        # Initialize database connection
        init_database()
        
        # Drop all tables
        print("   Dropping tables...")
        drop_tables()
        
        # Recreate all tables
        print("   Recreating tables...")
        create_tables()
        
        print("✅ Database cleaned and reset")
    except Exception as e:
        print(f"❌ Database cleanup failed: {e}")
        # Assuming environment might not be set up correctly for imports if this fails
        # but we try our best.

def archive_and_clean_artifacts():
    print("📦 Archiving and cleaning artifacts...")
    artifacts_dir = project_root / "artifacts"
    archives_dir = project_root / "archives"
    archives_dir.mkdir(exist_ok=True)
    
    if artifacts_dir.exists():
        # Check if there's anything to archive
        if any(artifacts_dir.iterdir()):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            archive_name = f"artifacts_archive_{timestamp}"
            archive_path = archives_dir / archive_name
            
            try:
                # Create zip
                shutil.make_archive(str(archive_path), 'zip', root_dir=str(project_root), base_dir="artifacts")
                print(f"   Created archive: {archive_path}.zip")
            except Exception as e:
                print(f"   Failed to create archive: {e}")

            # Delete original content
            try:
                shutil.rmtree(artifacts_dir)
                artifacts_dir.mkdir() # Recreate empty dir
                print("   Deleted artifacts directory content")
            except Exception as e:
                print(f"   Failed to delete artifacts: {e}")
        else:
             print("   Artifacts directory is empty, nothing to archive.")
    else:
        artifacts_dir.mkdir()
        print("   Created missing artifacts directory")
        
    print("✅ Artifacts cleaned")

def main():
    print("⚠️  COMPREHENSIVE SYSTEM CLEANUP ⚠️")
    print("This will DELETE ALL DATA in the database and clear local artifacts.")
    
    if "--yes" not in sys.argv:
        print("Type 'CLEAN' to confirm execution:")
        try:
            response = input().strip()
        except EOFError:
            response = ""
            
        if response != "CLEAN":
            print("❌ Cleanup cancelled")
            return

    cleanup_cache()
    cleanup_database()
    archive_and_clean_artifacts()
    
    print("\n✨ System cleanup completed successfully!")

if __name__ == "__main__":
    main()

