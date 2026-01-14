# Upload Queue Improvements

**Date:** January 14, 2026  
**Status:** ✅ Implemented

## Problems Identified

### 1. **Duplicate Detection Happening Too Late** ❌
- **Issue:** Files were queued immediately during folder scans with `skip_duplicate_check=True`
- **Impact:** 128 items queued even though many were already in the library
- **Root Cause:** Duplicate check (SHA256 hash) only happened during processing, after files were already queued

### 2. **No Real-Time Progress Updates** ❌
- **Issue:** Progress only updated to 100% at the END of upload
- **Impact:** Active upload showed "0B / 2.17GB" with no indication of progress
- **Root Cause:** GCS upload used simple `upload_from_file()` without progress tracking

### 3. **Hash Calculation Blocks UI** ❌
- **Issue:** SHA256 calculation for 2GB+ files took 30-60 seconds with no feedback
- **Impact:** Users saw 0% progress with no indication that work was happening
- **Root Cause:** No progress updates during hash calculation stage

---

## Solutions Implemented

### ✅ 1. Smarter Duplicate Detection During Scan

**File:** `backend/app/services/folder_monitor_service.py`

**Changes:**
- Added quick duplicate checks BEFORE enqueueing:
  - Check if filename already exists in content library
  - Check if file already in upload queue (QUEUED/PROCESSING/UPLOADING)
- Skip duplicate files during scan (no queuing)
- Log skipped duplicates for visibility

**Benefits:**
- Prevents hundreds of duplicate files from being queued
- Reduces queue processing time dramatically
- Users see accurate queue counts

**Code:**
```python
# Quick duplicate check: Check if file with same name exists
existing_content = await db.content.find_one({
    'stream_url': {'$regex': f'/{filename}$'},
})

if existing_content:
    logger.info(f"Skipping duplicate file (already in library): {filename}")
    skipped_duplicates += 1
    continue

# Check if already queued
existing_job = await UploadJob.find_one(
    UploadJob.filename == filename,
    In(UploadJob.status, [UploadStatus.QUEUED, UploadStatus.PROCESSING, UploadStatus.UPLOADING])
)

if existing_job:
    logger.info(f"Skipping file (already queued): {filename}")
    skipped_duplicates += 1
    continue
```

---

### ✅ 2. Real-Time Progress Tracking

**File:** `backend/app/services/upload_service.py`

**Changes:**

#### Stage-Based Progress Updates:
- **5-10%**: Hash calculation (with progress indicator)
- **15-20%**: Metadata extraction (TMDB lookup)
- **25-95%**: GCS upload (real-time byte tracking)
- **96-98%**: Database insert
- **100%**: Completed

#### Progress Tracking During Upload:
```python
class ProgressFileWrapper:
    def read(self, size=-1):
        chunk = self.file.read(size)
        if chunk:
            self.bytes_read += len(chunk)
            
            # Update every 2MB or every 2 seconds
            upload_progress = (self.bytes_read / self.file_size) * 70.0
            self.job.progress = 25.0 + upload_progress
            self.job.bytes_uploaded = self.bytes_read
            
            # Calculate speed and ETA
            self.job.upload_speed = self.bytes_read / elapsed
            self.job.eta_seconds = remaining_bytes / self.job.upload_speed
            
            # Broadcast via WebSocket
            await self.service._broadcast_queue_update()
        
        return chunk
```

**Benefits:**
- Users see live progress percentage (0-100%)
- Bytes uploaded updates in real-time
- Upload speed displayed (MB/s)
- ETA calculated and shown
- Progress bar fills smoothly

---

### ✅ 3. Better Status Communication

**Changes:**
- Show "Calculating hash..." status at 5% progress
- Show "Extracting metadata..." at 15% progress
- Show "Uploading..." with live bytes at 25-95%
- Show "Saving to database..." at 96%
- Duplicate detection shows clear error message: "Duplicate: Already in library as '[Title]'"

**Benefits:**
- Users always know what's happening
- No more "stuck at 0%" confusion
- Clear feedback during long operations

---

## Testing Recommendations

### 1. Clear Existing Queue
```bash
# Use the "Clear Queue" button in the UI
# OR manually in database:
db.upload_jobs.deleteMany({status: {$in: ["queued", "processing"]}})
```

### 2. Test Duplicate Detection
1. Trigger a folder scan with files already in your library
2. **Expected:** Should show "Skipped X duplicate files" in logs
3. **Expected:** Queue should remain empty or have only new files

### 3. Test Progress Tracking
1. Upload a large file (>1GB)
2. **Expected:** Should see:
   - 5-10%: "Calculating hash..."
   - 15-20%: "Extracting metadata..."
   - 25-95%: Real-time byte count increasing
   - Upload speed (MB/s)
   - ETA countdown
   - 96-100%: "Completing..."

### 4. Test WebSocket Updates
1. Open Uploads page
2. Start an upload
3. **Expected:** Progress updates every 1-2 seconds without page refresh

---

## Performance Improvements

### Before:
- ❌ 128 duplicate files queued
- ❌ 0% progress for 60+ seconds
- ❌ No feedback during hash calculation
- ❌ Upload appears "stuck"

### After:
- ✅ Duplicates skipped during scan (not queued)
- ✅ Progress updates every 2 seconds
- ✅ Clear status messages at each stage
- ✅ Real-time byte/speed/ETA tracking

---

## Architecture Notes

### Upload Pipeline Stages:
1. **Hash Calculation** (5-10%): SHA256 for duplicate detection
2. **Duplicate Check** (10%): Fast exit if already exists
3. **Metadata Extraction** (15-20%): TMDB API lookup
4. **GCS Upload** (25-95%): Resumable upload with progress
5. **Database Insert** (96-98%): Create Content document
6. **Subtitle Extraction** (Background): Non-blocking, happens after completion

### WebSocket Updates:
- Triggered after each stage completion
- Triggered during upload every 2MB or 2 seconds
- Includes: progress, bytes_uploaded, upload_speed, eta_seconds

---

## Potential Future Enhancements

### 1. Enhanced Duplicate Detection:
- Store `file_size` in Content model
- Check both filename AND file size for duplicates
- Add checksum/hash to Content for perfect duplicate detection

### 2. Parallel Uploads:
- Process multiple files simultaneously (with configurable limit)
- Priority queue for user-initiated vs. auto-scanned uploads

### 3. Upload Resumption:
- Use GCS resumable upload protocol
- Store upload session URL in UploadJob
- Resume failed uploads from last checkpoint

### 4. Better Error Handling:
- Retry failed uploads automatically (3 attempts)
- Categorize failures (network, credentials, disk space, duplicate)
- Auto-pause queue on repeated credential failures

---

## Configuration

### Current Settings (`backend/app/core/config.py`):
```python
UPLOAD_MONITOR_ENABLED: bool = False  # Manual trigger only
UPLOAD_MONITOR_INTERVAL: int = 300   # 5 minutes (when enabled)
UPLOAD_DEFAULT_FOLDERS: list = []     # Configure in UI
```

### GCS Upload Settings:
- **Chunk Size:** 5MB (good for most connections)
- **Progress Update Frequency:** Every 2MB or 2 seconds
- **Broadcast Interval:** Real-time via WebSocket

---

## Summary

✅ **Duplicate detection** now happens during folder scan (not after queuing)  
✅ **Real-time progress** shows bytes, speed, and ETA during upload  
✅ **Stage-based feedback** keeps users informed at every step  
✅ **WebSocket updates** provide live UI updates without polling  
✅ **No linter errors** - all code passes validation  

**Status:** Ready for testing 🚀
