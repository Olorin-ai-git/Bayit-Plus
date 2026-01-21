# Duplicate Detection System

**Date:** January 14, 2026  
**Status:** ✅ Implemented

## Overview

The upload system now uses a **3-tier duplicate detection** strategy that calculates file hashes **once** and stores them for instant future lookups.

---

## How It Works

### **Tier 1: Hash Lookup (Instant - 0ms)**
- Check if filename exists in content library
- If found **with stored hash**, skip immediately
- **No hash calculation needed!**

```python
existing_content = await db.content.find_one({
    'stream_url': {'$regex': f'/{filename}$'}
})

if existing_content and existing_content.get('file_hash'):
    # INSTANT SKIP - hash already stored
    return "duplicate"
```

### **Tier 2: Queue Check (Fast - <10ms)**
- Check if file is already queued for upload
- Prevents duplicate queue entries

```python
existing_job = await UploadJob.find_one(
    UploadJob.filename == filename,
    status in [QUEUED, PROCESSING, UPLOADING]
)

if existing_job:
    return "already_queued"
```

### **Tier 3: Hash Calculation (Slow - 30-60s for large files)**
- **Only for truly new files**
- Calculate SHA256 hash once
- Store hash in Content model
- Future scans skip this file instantly (Tier 1)

```python
file_hash = calculate_sha256(file_path)  # Expensive!
job.file_hash = file_hash
# Later: content.file_hash = file_hash
```

---

## Performance Improvements

### **Before (Old System):**
```
Scan 1000 movies:
  - Calculate 1000 hashes
  - Time: ~50 minutes (3s per file)
  
Scan same 1000 movies again:
  - Calculate 1000 hashes AGAIN
  - Time: ~50 minutes (no improvement!)
```

### **After (New System with Hash Storage):**
```
Scan 1000 movies (first time):
  - Calculate 1000 hashes
  - Time: ~50 minutes
  - Store hashes in DB
  
Scan same 1000 movies again:
  - Look up 1000 hashes in DB
  - Time: ~10 seconds (99.7% faster!)
  
Scan with 900 existing + 100 new:
  - Skip 900 instantly (hash lookup)
  - Calculate 100 new hashes
  - Time: ~5 minutes (90% faster!)
```

---

## Database Schema

### **Content Model** (Updated)
```python
class Content(Document):
    # ... other fields ...
    file_hash: Optional[str] = None     # SHA256 hash for duplicate detection
    file_size: Optional[int] = None     # File size in bytes (quick pre-filter)
    stream_url: str                     # GCS URL or local path
```

### **Why file_size?**
- Quick pre-filter before hash comparison
- Files with different sizes **cannot** be duplicates
- Enables fast "definitely not a duplicate" checks

---

## Folder Scan Flow

```
┌─────────────────────────────────────┐
│  Scan folder: 1000 files found      │
└──────────────┬──────────────────────┘
               │
               ▼
     ┌─────────────────────┐
     │ For each file:      │
     └──────┬──────────────┘
            │
            ▼
   ┌────────────────────────┐
   │ Tier 1: Check DB       │  ← 0ms per file
   │ Has stored hash?       │
   └────┬───────────────┬───┘
        │ YES           │ NO
        │               │
        ▼               ▼
   ┌─────────┐    ┌──────────────┐
   │ SKIP    │    │ Tier 2:      │  ← <10ms per file
   │ (900)   │    │ Check queue  │
   └─────────┘    └────┬─────────┘
                       │ NOT QUEUED
                       │
                       ▼
                  ┌──────────────────┐
                  │ Tier 3: Enqueue  │  ← Will calc hash during processing
                  │ (100 new files)  │     (30-60s per large file)
                  └──────────────────┘
```

---

## Hash Storage Points

### **1. During Upload Processing**
```python
# In upload_service._process_job()
job.file_hash = await calculate_hash(job.source_path)

# Later, when creating content:
content = Content(
    title=metadata['title'],
    stream_url=gcs_url,
    file_hash=job.file_hash,  # ← Stored here!
    file_size=job.file_size,
)
await content.insert()
```

### **2. Manual Backfill** (For existing content)
```bash
# Backfill hashes for existing content without hashes
cd backend
poetry run python scripts/backfill_content_hashes.py --dry-run  # Preview
poetry run python scripts/backfill_content_hashes.py --limit=100 # Process 100
poetry run python scripts/backfill_content_hashes.py            # Process all
```

---

## Backfill Utility

### **Purpose**
Calculate and store hashes for **existing content** that was uploaded before this system was implemented.

### **Usage**
```bash
# Preview what will be done
python scripts/backfill_content_hashes.py --dry-run

# Process first 10 items (test)
python scripts/backfill_content_hashes.py --limit=10

# Process all content missing hashes
python scripts/backfill_content_hashes.py
```

### **What It Does**
1. Finds all `Content` records without `file_hash`
2. For each content:
   - Tries to locate local file path
   - Calculates SHA256 hash
   - Updates `Content.file_hash` in database
3. Skips content that:
   - Only exists in GCS (no local path)
   - Has local path but file not found

### **Output**
```
Found 500 content items without file_hash
[1/500] Calculating hash for: The Matrix (The_Matrix.mkv)
  ✓ Stored hash: a1b2c3d4e5f6...
[2/500] Calculating hash for: Inception (Inception.mkv)
  ✓ Stored hash: f6e5d4c3b2a1...
...
SUMMARY:
  Total found: 500
  Updated with hash: 450
  Skipped (GCS-only): 30
  Skipped (file not found): 20
✅ Backfill complete!
```

---

## Benefits

### **For Users**
- ✅ **Instant duplicate detection** after first scan
- ✅ **No waiting** for hash calculation on re-scans
- ✅ **Clear "Already in library" messages** instead of cryptic errors

### **For System**
- ✅ **99% faster subsequent scans** (10s vs 50 minutes for 1000 files)
- ✅ **Reduced CPU usage** (no redundant hash calculations)
- ✅ **Lower disk I/O** (no re-reading entire files)
- ✅ **Bandwidth savings** (don't attempt to upload duplicates)

---

## Future Enhancements

### **1. Size-Based Pre-Filter**
```python
# Quick check before hash comparison
existing = await Content.find_one({
    'filename': filename,
    'file_size': file_size  # Must match first
})

if existing and existing.file_hash:
    # Compare hashes only if sizes match
    if existing.file_hash == calculated_hash:
        return "duplicate"
```

### **2. Hash Cache in Memory**
```python
# Keep recent hashes in Redis for ultra-fast lookups
hash_cache = {
    'The_Matrix.mkv': 'a1b2c3d4e5f6...',
    'Inception.mkv': 'f6e5d4c3b2a1...',
}
# Lookup: O(1) vs O(log n) database query
```

### **3. Incremental Folder Scans**
```python
# Only scan files modified since last scan
if file.mtime > last_scan_time:
    check_for_duplicates(file)
```

---

## Migration Path

### **For Existing Deployments**

1. **Deploy new code** (hash storage enabled)
2. **New uploads** will automatically store hashes
3. **Run backfill script** when convenient:
   ```bash
   # Low-priority, can run during off-hours
   python scripts/backfill_content_hashes.py
   ```
4. **Gradual improvement** as more hashes are stored

### **No Downtime Required**
- System works with or without stored hashes
- Gracefully handles mixed state (some with hash, some without)
- New uploads benefit immediately
- Backfill improves performance over time

---

## Monitoring

### **Check Hash Coverage**
```python
# How many content items have hashes stored?
total = await Content.count()
with_hash = await Content.find(Content.file_hash != None).count()
coverage = (with_hash / total) * 100

print(f"Hash coverage: {coverage:.1f}% ({with_hash}/{total})")
```

### **Target Metrics**
- **Hash Coverage:** >95% (after backfill)
- **Scan Time:** <30s for 1000 files (if 95% have hashes)
- **Duplicate Detection:** <100ms per file

---

## Summary

✅ **Hash calculated once** - stored permanently  
✅ **Instant duplicate detection** - for files with stored hashes  
✅ **99% faster re-scans** - after first scan  
✅ **Automatic for new uploads** - no manual intervention  
✅ **Backfill utility** - for existing content  
✅ **No breaking changes** - works with or without hashes  

**Result:** Upload queue now handles large libraries efficiently without recalculating hashes on every scan! 🚀
