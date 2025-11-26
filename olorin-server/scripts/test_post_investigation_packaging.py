#!/usr/bin/env python3
"""
Test Post-Investigation Packaging

Tests the automated confusion matrix and package generation
that triggers after each investigation completes.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.investigation.post_investigation_packager import (
    generate_post_investigation_package
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_post_investigation_packaging():
    """Test post-investigation packaging for a completed investigation."""
    
    print("="*80)
    print("🧪 TESTING POST-INVESTIGATION PACKAGING")
    print("="*80)
    print()
    
    # Find a recently completed investigation
    workspace_dir = Path("workspace/investigations")
    if not workspace_dir.exists():
        print("❌ No investigations directory found")
        return
    
    # Find the most recent auto-comp investigation
    auto_comp_folders = sorted(
        workspace_dir.rglob("auto-comp-*"),
        key=lambda x: x.stat().st_mtime,
        reverse=True
    )
    
    if not auto_comp_folders:
        print("❌ No auto-comparison investigations found")
        return
    
    test_folder = auto_comp_folders[0]
    investigation_id = test_folder.name
    
    print(f"📁 Testing with investigation: {investigation_id}")
    print(f"   Folder: {test_folder}")
    print()
    
    # Test package generation
    print("📦 Generating post-investigation package...")
    print()
    
    package_path = await generate_post_investigation_package(
        investigation_id=investigation_id,
        investigation_folder=test_folder
    )
    
    if package_path and package_path.exists():
        print()
        print("="*80)
        print("✅ POST-INVESTIGATION PACKAGING SUCCESSFUL")
        print("="*80)
        print()
        print(f"📦 Package Details:")
        print(f"   Path: {package_path}")
        print(f"   Size: {package_path.stat().st_size / 1024 / 1024:.2f} MB")
        print()
        
        # List package contents
        print("📂 Package Contents:")
        import zipfile
        with zipfile.ZipFile(package_path, 'r') as zipf:
            file_list = zipf.namelist()
            print(f"   Total files: {len(file_list)}")
            print()
            
            # Show directory structure
            directories = set()
            for file_path in file_list:
                parts = file_path.split('/')
                if len(parts) > 1:
                    directories.add(parts[1])
            
            print("   Main directories:")
            for directory in sorted(directories):
                count = sum(1 for f in file_list if f.startswith(f"{investigation_id}/{directory}/"))
                print(f"      • {directory}/ ({count} files)")
        
        print()
        print("🎉 Test completed successfully!")
        print()
        
    else:
        print()
        print("❌ POST-INVESTIGATION PACKAGING FAILED")
        print()


if __name__ == "__main__":
    asyncio.run(test_post_investigation_packaging())

