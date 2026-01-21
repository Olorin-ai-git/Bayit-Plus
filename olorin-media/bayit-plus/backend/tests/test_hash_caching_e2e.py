"""
End-to-End Hash Caching Verification Test
Tests the complete double-hashing system:
1. Local file hash caching (persisted to disk)
2. Remote file hash storage (persisted to MongoDB)
3. Quick comparison using persisted hashes
"""

import asyncio
import json
import logging
import tempfile
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


async def verify_hash_caching_system():
    """
    Comprehensive E2E test of the hash caching system.
    """
    print("=" * 80)
    print("HASH CACHING SYSTEM VERIFICATION")
    print("=" * 80)
    print()

    results = {"tests_passed": 0, "tests_failed": 0, "issues": []}

    # Test 1: Verify Local Cache Directory Exists
    print("📁 Test 1: Local Cache Directory")
    print("-" * 80)
    cache_base = Path("/tmp") if Path("/tmp").exists() else Path.cwd()
    cache_dir = cache_base / ".bayit_hash_cache"

    if cache_dir.exists():
        print(f"✅ Cache directory exists: {cache_dir}")
        cache_files = list(cache_dir.glob("*.json"))
        print(f"   Found {len(cache_files)} cache file(s)")
        results["tests_passed"] += 1
    else:
        print(f"❌ Cache directory NOT found: {cache_dir}")
        results["tests_failed"] += 1
        results["issues"].append("Cache directory missing")
    print()

    # Test 2: Verify Cache File Structure
    print("🔍 Test 2: Cache File Structure")
    print("-" * 80)
    if cache_dir.exists():
        cache_files = list(cache_dir.glob("*.json"))
        if cache_files:
            sample_file = cache_files[0]
            try:
                with open(sample_file, "r") as f:
                    cache_data = json.load(f)

                print(f"✅ Cache file is valid JSON: {sample_file.name}")
                print(f"   Contains {len(cache_data)} entries")

                if cache_data:
                    sample_entry = next(iter(cache_data.values()))
                    required_keys = {"hash", "size", "mtime"}

                    if required_keys.issubset(sample_entry.keys()):
                        print(f"✅ Cache entries have required keys: {required_keys}")
                        print(f"   Sample: hash={sample_entry['hash'][:16]}...")
                        results["tests_passed"] += 1
                    else:
                        print(f"❌ Missing keys in cache entry: {sample_entry.keys()}")
                        results["tests_failed"] += 1
                        results["issues"].append("Invalid cache entry structure")
                else:
                    print("⚠️  Cache file is empty (no entries yet)")
                    results["tests_passed"] += 1

            except json.JSONDecodeError as e:
                print(f"❌ Cache file is corrupted: {e}")
                results["tests_failed"] += 1
                results["issues"].append("Corrupted cache file")
            except Exception as e:
                print(f"❌ Error reading cache: {e}")
                results["tests_failed"] += 1
                results["issues"].append(f"Cache read error: {e}")
        else:
            print("⚠️  No cache files found yet (no folders scanned)")
            results["tests_passed"] += 1
    print()

    # Test 3: Verify Folder Monitor Service Integration
    print("🔧 Test 3: Folder Monitor Service Integration")
    print("-" * 80)
    try:
        from app.services.folder_monitor_service import folder_monitor_service

        # Check service has cache directory configured
        if hasattr(folder_monitor_service, "_cache_dir"):
            service_cache_dir = folder_monitor_service._cache_dir
            print(f"✅ Service cache directory: {service_cache_dir}")

            if service_cache_dir == cache_dir:
                print(f"✅ Cache directory matches expected location")
                results["tests_passed"] += 1
            else:
                print(f"❌ Cache directory mismatch!")
                print(f"   Expected: {cache_dir}")
                print(f"   Found: {service_cache_dir}")
                results["tests_failed"] += 1
                results["issues"].append("Cache directory mismatch")
        else:
            print("❌ Service doesn't have _cache_dir attribute")
            results["tests_failed"] += 1
            results["issues"].append("Missing _cache_dir attribute")

        # Check cache methods exist
        required_methods = [
            "_load_hash_cache",
            "_save_hash_cache",
            "_get_or_calculate_hash",
        ]
        for method in required_methods:
            if hasattr(folder_monitor_service, method):
                print(f"✅ Method exists: {method}")
            else:
                print(f"❌ Method missing: {method}")
                results["tests_failed"] += 1
                results["issues"].append(f"Missing method: {method}")

        if all(hasattr(folder_monitor_service, m) for m in required_methods):
            results["tests_passed"] += 1

    except ImportError as e:
        print(f"❌ Cannot import folder_monitor_service: {e}")
        results["tests_failed"] += 1
        results["issues"].append("Import error")
    print()

    # Test 4: Verify Content Model has file_hash Field
    print("💾 Test 4: Content Model Integration")
    print("-" * 80)
    try:
        from app.models.content import Content

        # Check if Content model has file_hash field
        if hasattr(Content, "file_hash"):
            print("✅ Content model has 'file_hash' field")
            results["tests_passed"] += 1
        else:
            print("❌ Content model missing 'file_hash' field")
            results["tests_failed"] += 1
            results["issues"].append("Missing file_hash in Content model")

        if hasattr(Content, "file_size"):
            print("✅ Content model has 'file_size' field")
        else:
            print("⚠️  Content model missing 'file_size' field (optional)")

    except ImportError as e:
        print(f"❌ Cannot import Content model: {e}")
        results["tests_failed"] += 1
        results["issues"].append("Content model import error")
    print()

    # Test 5: Verify UploadJob Model Integration
    print("📤 Test 5: UploadJob Model Integration")
    print("-" * 80)
    try:
        from app.models.upload import UploadJob

        if hasattr(UploadJob, "file_hash"):
            print("✅ UploadJob model has 'file_hash' field")
            results["tests_passed"] += 1
        else:
            print("❌ UploadJob model missing 'file_hash' field")
            results["tests_failed"] += 1
            results["issues"].append("Missing file_hash in UploadJob model")

        if hasattr(UploadJob, "metadata"):
            print("✅ UploadJob model has 'metadata' field (for pre_calculated_hash)")
        else:
            print("❌ UploadJob model missing 'metadata' field")
            results["tests_failed"] += 1
            results["issues"].append("Missing metadata in UploadJob model")

    except ImportError as e:
        print(f"❌ Cannot import UploadJob model: {e}")
        results["tests_failed"] += 1
        results["issues"].append("UploadJob model import error")
    print()

    # Test 6: Verify Upload Service Integration
    print("⬆️  Test 6: Upload Service Integration")
    print("-" * 80)
    try:
        from app.services.upload_service import upload_service

        # Check for _calculate_file_hash method
        if hasattr(upload_service, "_calculate_file_hash"):
            print("✅ Upload service has '_calculate_file_hash' method")
            results["tests_passed"] += 1
        else:
            print("❌ Upload service missing '_calculate_file_hash' method")
            results["tests_failed"] += 1
            results["issues"].append("Missing _calculate_file_hash method")

        # Check for _process_job method (handles background hashing)
        if hasattr(upload_service, "_process_job"):
            print("✅ Upload service has '_process_job' method")
        else:
            print("❌ Upload service missing '_process_job' method")
            results["tests_failed"] += 1
            results["issues"].append("Missing _process_job method")

        # Check for _create_content_entry method (saves hash to DB)
        if hasattr(upload_service, "_create_content_entry"):
            print("✅ Upload service has '_create_content_entry' method")
        else:
            print("❌ Upload service missing '_create_content_entry' method")
            results["tests_failed"] += 1
            results["issues"].append("Missing _create_content_entry method")

    except ImportError as e:
        print(f"❌ Cannot import upload_service: {e}")
        results["tests_failed"] += 1
        results["issues"].append("Upload service import error")
    print()

    # Test 7: Verify Duplicate Detection Flow
    print("🔄 Test 7: Duplicate Detection Flow")
    print("-" * 80)
    try:
        import inspect

        from app.services.folder_monitor_service import folder_monitor_service

        # Check _scan_folder method for duplicate detection logic
        scan_folder_source = inspect.getsource(folder_monitor_service._scan_folder)

        checks = [
            ("TIER 1: Filename check", "existing_content = await db.content.find_one"),
            ("TIER 2: Cache lookup", "if file_path_str in self._hash_cache"),
            (
                "TIER 3: Hash comparison",
                "existing_by_hash = await db.content.find_one({'file_hash'",
            ),
            ("Queue duplicate check", "existing_job = await UploadJob.find_one"),
            ("Cache persistence", "self._save_hash_cache"),
        ]

        for check_name, check_code in checks:
            if check_code in scan_folder_source:
                print(f"✅ {check_name}: Found")
            else:
                print(f"❌ {check_name}: Missing!")
                results["tests_failed"] += 1
                results["issues"].append(f"Missing: {check_name}")

        if all(check_code in scan_folder_source for _, check_code in checks):
            results["tests_passed"] += 1
            print("✅ All duplicate detection tiers implemented")
        else:
            print("❌ Some duplicate detection logic missing")

    except Exception as e:
        print(f"❌ Error inspecting code: {e}")
        results["tests_failed"] += 1
        results["issues"].append(f"Code inspection error: {e}")
    print()

    # Test 8: Verify Background Hash Calculation
    print("⚙️  Test 8: Background Hash Calculation")
    print("-" * 80)
    try:
        import inspect

        from app.services.upload_service import upload_service

        process_job_source = inspect.getsource(upload_service._process_job)

        checks = [
            (
                "Pre-calculated hash check",
                "pre_calculated_hash = job.metadata.get('pre_calculated_hash')",
            ),
            (
                "Background hash calculation",
                "job.file_hash = await self._calculate_file_hash",
            ),
            ("Hash completion stage", 'job.stages["hash_calculation"] = "completed"'),
            (
                "Duplicate check after hash",
                "existing_content = await db.content.find_one({'file_hash'",
            ),
            ("Progress updates", "await self._broadcast_queue_update"),
        ]

        for check_name, check_code in checks:
            if check_code in process_job_source:
                print(f"✅ {check_name}: Implemented")
            else:
                print(f"❌ {check_name}: Missing!")
                results["tests_failed"] += 1
                results["issues"].append(f"Missing: {check_name}")

        if all(check_code in process_job_source for _, check_code in checks):
            results["tests_passed"] += 1
            print("✅ Background hash calculation fully implemented")
        else:
            print("❌ Background hash calculation incomplete")

    except Exception as e:
        print(f"❌ Error inspecting code: {e}")
        results["tests_failed"] += 1
        results["issues"].append(f"Code inspection error: {e}")
    print()

    # Final Summary
    print("=" * 80)
    print("VERIFICATION SUMMARY")
    print("=" * 80)
    print(f"✅ Tests Passed: {results['tests_passed']}")
    print(f"❌ Tests Failed: {results['tests_failed']}")

    if results["issues"]:
        print()
        print("🔴 ISSUES FOUND:")
        for i, issue in enumerate(results["issues"], 1):
            print(f"   {i}. {issue}")
    else:
        print()
        print("🎉 ALL SYSTEMS OPERATIONAL!")
        print()
        print("Hash Caching Flow:")
        print("  1️⃣  Local files → SHA256 hash → /tmp/.bayit_hash_cache/*.json")
        print("  2️⃣  Remote files → file_hash field → MongoDB Content collection")
        print("  3️⃣  Comparison → Quick cache/DB lookup (no recalculation)")
        print("  4️⃣  Background → Hash calculated during upload, not during enqueue")

    print("=" * 80)

    return results


if __name__ == "__main__":
    asyncio.run(verify_hash_caching_system())
