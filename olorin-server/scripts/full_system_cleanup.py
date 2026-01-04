#!/usr/bin/env python3
"""
Full System Cleanup
- Removes Python cache
- Deletes Postgres content (investigations, comparisons)
- Archives and deletes artifacts
"""

import os
import sys
import shutil
import glob
from pathlib import Path
from datetime import datetime
import subprocess

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

def cleanup_cache():
    print("🧹 Cleaning Python cache...")
    root = Path(__file__).parent.parent
    
    count = 0
    for p in root.rglob("__pycache__"):
        shutil.rmtree(p)
        count += 1
    
    pytest_cache = root / ".pytest_cache"
    if pytest_cache.exists():
        shutil.rmtree(pytest_cache)
        count += 1
        
    print(f"✅ Cache cleaned ({count} directories removed)")

def cleanup_database():
    print("🗑️ Cleaning database...")
    # Use existing script for logic reuse
    script_path = Path(__file__).parent / "delete_all_investigations_and_comparisons.py"
    
    # We run it as a subprocess to ensure environment isolation/reuse
    try:
        subprocess.run([sys.executable, str(script_path), "--yes", "--files"], check=True)
        print("✅ Database cleaned")
    except subprocess.CalledProcessError as e:
        print(f"❌ Database cleanup failed: {e}")

def archive_artifacts():
    print("📦 Archiving artifacts...")
    root = Path(__file__).parent.parent
    artifacts_dir = root / "artifacts"
    archives_dir = root / "archives"
    archives_dir.mkdir(exist_ok=True)
    
    if artifacts_dir.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_path = archives_dir / f"artifacts_archive_{timestamp}"
        
        # Create zip
        shutil.make_archive(str(archive_path), 'zip', root_dir=str(root), base_dir="artifacts")
        print(f"   Created archive: {archive_path}.zip")
        
        # Delete original
        shutil.rmtree(artifacts_dir)
        print("   Deleted artifacts directory")
    else:
        print("   No artifacts directory found")
    print("✅ Artifacts archived and cleaned")

def main():
    print("⚠️  FULL SYSTEM CLEANUP ⚠️")
    print("This will delete database records, logs, and artifacts.")
    
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
    archive_artifacts()
    
    print("\n✨ Full system cleanup completed successfully!")

if __name__ == "__main__":
    main()

