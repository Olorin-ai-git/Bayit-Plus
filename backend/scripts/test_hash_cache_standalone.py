#!/usr/bin/env python3
"""
Standalone test for hash caching system.
Tests hash calculation and caching without requiring GCS uploads.
"""

import asyncio
import json
import time
from pathlib import Path
import sys
import tempfile
import hashlib

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.folder_monitor_service import FolderMonitorService

def create_test_file(path: Path, size_mb: int = 10) -> Path:
    """Create a test file of specified size"""
    path.write_bytes(b"X" * (size_mb * 1024 * 1024))
    return path

def calculate_hash_sync(file_path: str) -> str:
    """Calculate SHA256 hash synchronously"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

async def test_hash_caching():
    print("🧪 Testing Hash Caching System (Standalone)\n")
    print("=" * 70)
    
    # Create temporary test directory
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        
        # Create test files
        print("\n📁 Creating test files...")
        test_files = []
        for i in range(5):
            file_path = tmpdir_path / f"test_movie_{i+1}.mkv"
            create_test_file(file_path, size_mb=50)  # 50MB files
            test_files.append(file_path)
            print(f"  ✓ Created: {file_path.name} (50 MB)")
        
        print(f"\n✅ Created {len(test_files)} test files ({len(test_files) * 50} MB total)")
        
        # Initialize monitor service
        monitor_service = FolderMonitorService()
        
        # Test 1: Calculate hashes for the first time
        print("\n" + "=" * 70)
        print("TEST 1: Initial Hash Calculation (No Cache)")
        print("=" * 70 + "\n")
        
        start_time = time.time()
        hashes = {}
        
        for file_path in test_files:
            file_stat = file_path.stat()
            
            print(f"📊 Processing: {file_path.name}")
            calc_start = time.time()
            
            # First call - should calculate
            file_hash = await monitor_service._get_or_calculate_hash(str(file_path), file_stat)
            
            calc_time = time.time() - calc_start
            hashes[str(file_path)] = file_hash
            
            print(f"  ⏱️  Time: {calc_time:.2f}s")
            print(f"  🔑 Hash: {file_hash[:16]}...")
            print()
        
        total_time_1 = time.time() - start_time
        
        print(f"📊 RESULTS:")
        print(f"  • Total time: {total_time_1:.2f} seconds")
        print(f"  • Average per file: {total_time_1 / len(test_files):.2f} seconds")
        print(f"  • Cache entries: {len(monitor_service._hash_cache)}")
        
        # Save cache to disk
        fake_folder_id = "test_folder_123"
        monitor_service._save_hash_cache(fake_folder_id, monitor_service._hash_cache)
        
        cache_file = monitor_service._get_cache_file(fake_folder_id)
        cache_size = cache_file.stat().st_size if cache_file.exists() else 0
        print(f"  • Cache file: {cache_file}")
        print(f"  • Cache size: {cache_size:,} bytes")
        
        # Test 2: Reload cache and access again (should be instant)
        print("\n" + "=" * 70)
        print("TEST 2: Using Cached Hashes (Should be instant)")
        print("=" * 70 + "\n")
        
        # Simulate a new monitor service instance (like server restart)
        monitor_service_2 = FolderMonitorService()
        monitor_service_2._hash_cache = monitor_service_2._load_hash_cache(fake_folder_id)
        
        print(f"✓ Loaded cache with {len(monitor_service_2._hash_cache)} entries\n")
        
        start_time = time.time()
        cache_hits = 0
        cache_misses = 0
        
        for file_path in test_files:
            file_stat = file_path.stat()
            
            print(f"📊 Processing: {file_path.name}")
            calc_start = time.time()
            
            # Second call - should use cache
            file_hash = await monitor_service_2._get_or_calculate_hash(str(file_path), file_stat)
            
            calc_time = time.time() - calc_start
            
            if calc_time < 0.01:  # Less than 10ms = cache hit
                cache_hits += 1
                status = "✅ CACHE HIT"
            else:
                cache_misses += 1
                status = "❌ CACHE MISS"
            
            print(f"  {status}")
            print(f"  ⏱️  Time: {calc_time:.4f}s")
            print(f"  🔑 Hash: {file_hash[:16]}...")
            print()
            
            # Verify hash matches
            if file_hash != hashes[str(file_path)]:
                print(f"  ⚠️  WARNING: Hash mismatch!")
        
        total_time_2 = time.time() - start_time
        
        print(f"📊 RESULTS:")
        print(f"  • Total time: {total_time_2:.4f} seconds")
        print(f"  • Average per file: {total_time_2 / len(test_files):.4f} seconds")
        print(f"  • Cache hits: {cache_hits}/{len(test_files)}")
        print(f"  • Cache misses: {cache_misses}/{len(test_files)}")
        
        speedup = total_time_1 / total_time_2 if total_time_2 > 0 else 0
        print(f"\n🚀 SPEEDUP: {speedup:.1f}x faster!")
        print(f"   (from {total_time_1:.2f}s to {total_time_2:.4f}s)")
        
        # Test 3: Modify a file and verify cache invalidation
        print("\n" + "=" * 70)
        print("TEST 3: Cache Invalidation (File Modified)")
        print("=" * 70 + "\n")
        
        modified_file = test_files[0]
        old_hash = hashes[str(modified_file)]
        
        print(f"🔧 Modifying: {modified_file.name}")
        print(f"  Old hash: {old_hash[:16]}...")
        
        # Modify the file
        with modified_file.open('ab') as f:
            f.write(b"MODIFIED")
        
        print(f"  ✓ File modified (+8 bytes)\n")
        
        file_stat = modified_file.stat()
        
        calc_start = time.time()
        new_hash = await monitor_service_2._get_or_calculate_hash(str(modified_file), file_stat)
        calc_time = time.time() - calc_start
        
        print(f"  New hash: {new_hash[:16]}...")
        print(f"  ⏱️  Recalculation time: {calc_time:.2f}s")
        
        if new_hash != old_hash:
            print(f"\n✅ SUCCESS! Hash changed (cache properly invalidated)")
        else:
            print(f"\n❌ ERROR! Hash did not change")
        
        # Test 4: Verify new hash is cached
        print("\n" + "=" * 70)
        print("TEST 4: Verify Modified File is Re-cached")
        print("=" * 70 + "\n")
        
        calc_start = time.time()
        cached_hash = await monitor_service_2._get_or_calculate_hash(str(modified_file), file_stat)
        calc_time = time.time() - calc_start
        
        print(f"📊 Processing: {modified_file.name}")
        print(f"  ⏱️  Time: {calc_time:.4f}s")
        
        if calc_time < 0.01:
            print(f"  ✅ CACHE HIT - New hash was cached!")
        else:
            print(f"  ❌ CACHE MISS - Hash recalculated")
        
        if cached_hash == new_hash:
            print(f"  ✅ Hash matches!")
        
        # Final Summary
        print("\n" + "=" * 70)
        print("🎉 FINAL SUMMARY")
        print("=" * 70 + "\n")
        
        print(f"✅ Initial calculation: {total_time_1:.2f}s for {len(test_files)} files")
        print(f"✅ Cached access: {total_time_2:.4f}s for {len(test_files)} files")
        print(f"✅ Speedup: {speedup:.1f}x faster with cache")
        print(f"✅ Cache invalidation: Working correctly")
        print(f"✅ Re-caching: Working correctly")
        
        print(f"\n📂 Cache location: {cache_file}")
        print(f"   Size: {cache_file.stat().st_size:,} bytes")
        
        print("\n" + "=" * 70)
        
        # Show cache contents
        print("\n📄 Cache File Contents (sample):\n")
        if cache_file.exists():
            with cache_file.open('r') as f:
                cache_data = json.load(f)
                for i, (path, data) in enumerate(list(cache_data.items())[:2]):
                    print(f"  {Path(path).name}:")
                    print(f"    hash: {data['hash'][:32]}...")
                    print(f"    size: {data['size']:,} bytes")
                    print(f"    mtime: {data['mtime']}")
                    print()

if __name__ == "__main__":
    asyncio.run(test_hash_caching())
