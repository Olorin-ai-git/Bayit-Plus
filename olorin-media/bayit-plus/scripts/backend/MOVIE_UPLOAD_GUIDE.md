# Movie Upload Guide

Complete guide for uploading movies from external drives to Bayit+ platform.

## Overview

The movie upload system consists of two components:
1. **Bash wrapper script** (`upload_movies.sh`) - Easy-to-use interface with auto-detection
2. **Python upload script** (`upload_real_movies.py`) - Core upload logic with TMDB integration

## Quick Start

### 1. Setup Environment

```bash
# Required: MongoDB Atlas connection
export MONGODB_URL='mongodb+srv://username:password@cluster.mongodb.net'

# Optional: Google Cloud service account (if not using gcloud auth)
export GOOGLE_APPLICATION_CREDENTIALS='/path/to/service-account-key.json'

# Optional: TMDB API key for movie metadata
export TMDB_API_KEY='your-tmdb-api-key'

# Optional: GCS bucket name (defaults to settings)
export GCS_BUCKET_NAME='your-bucket-name'
```

### 2. Dry Run (Recommended First Step)

Always do a dry run first to see what would be uploaded:

```bash
cd scripts/backend
./upload_movies.sh --dry-run
```

This will:
- Auto-detect your external drive
- Scan for movie files
- Show what would be uploaded
- Display TMDB metadata matches
- **NOT upload any files**

### 3. Test Upload

Upload a small batch to test:

```bash
# Upload first 5 movies only
./upload_movies.sh --limit 5
```

### 4. Full Upload

Once you've verified everything works:

```bash
# Upload all movies
./upload_movies.sh
```

## Advanced Usage

### Auto-Detection Features

The script automatically:
- Detects mounted external drives
- Finds "Movies" directory (or common variants)
- Selects drive if only one is mounted
- Prompts to select if multiple drives detected

### Custom Source Directory

If auto-detection doesn't work or you want to specify manually:

```bash
./upload_movies.sh --source /Volumes/MyDrive/Movies
```

### Upload by Letter

Upload movies starting from a specific letter (useful for resuming):

```bash
# Upload movies starting from "T" onwards
./upload_movies.sh --start-from T
```

This will upload all movies starting with "T", "U", "V", ... "Z", plus numbers and special characters.

### Specify Drive Name

If you know your drive name:

```bash
./upload_movies.sh --drive-name "USB Drive"
```

### Combine Options

```bash
# Dry run of first 10 movies starting from "M"
./upload_movies.sh --dry-run --limit 10 --start-from M
```

## File Processing

### Supported Video Formats

- `.mp4` - MPEG-4 video
- `.mkv` - Matroska video
- `.avi` - AVI video
- `.mov` - QuickTime video
- `.webm` - WebM video
- `.m4v` - iTunes video

### File Size Limits

- Maximum file size: 10GB
- Files larger than 10GB are automatically skipped

### Filename Parsing

The script automatically extracts metadata from filenames:

**Examples:**
```
The.Matrix.1999.1080p.BluRay.x264.mkv
  → Title: "The Matrix"
  → Year: 1999

Inception (2010) [1080p] [YTS].mp4
  → Title: "Inception"
  → Year: 2010

Spider-Man.Into.The.Spider-Verse.2018.2160p.WEB-DL.mkv
  → Title: "Spider-Man Into The Spider-Verse"
  → Year: 2018
```

The script removes:
- Quality indicators (720p, 1080p, 4K, UHD)
- Source indicators (BluRay, WEBRip, WEB-DL)
- Codec indicators (x264, x265, H.264, HEVC)
- Release groups (YTS, YIFY, RARBG)
- Audio format (AAC, AC3, DTS)

### TMDB Integration

For each movie, the script:
1. Extracts title and year from filename
2. Searches TMDB API for metadata
3. Downloads:
   - Official title
   - Description/overview
   - Rating (vote average)
   - Poster image (500px width)
   - Backdrop image (original resolution)
   - TMDB ID

If TMDB API key is not configured or no match is found:
- Uses filename-extracted title
- No description, poster, or backdrop
- Movie is still uploaded to GCS and MongoDB

### Duplicate Detection

The script prevents duplicate uploads using file hash (SHA-256):
- Calculates hash for each file
- Checks if hash exists in MongoDB
- Skips if duplicate found
- Different files with same content are detected

## Database Structure

### MongoDB Collections

**Content Collection:**
```javascript
{
  _id: ObjectId("..."),
  title: "The Matrix",
  description: "A computer hacker learns...",
  stream_url: "https://storage.googleapis.com/bucket/movies/The_Matrix/The.Matrix.1999.1080p.mkv",
  thumbnail: "https://image.tmdb.org/t/p/w500/poster.jpg",
  backdrop: "https://image.tmdb.org/t/p/original/backdrop.jpg",
  category_id: "...",
  category_name: "Movies",
  is_published: true,
  is_featured: false,
  is_series: false,
  year: 1999,
  rating: 8.7,
  tmdb_id: 603,
  file_hash: "a1b2c3d4e5f6...",
  created_at: ISODate("2026-01-25T..."),
  updated_at: ISODate("2026-01-25T...")
}
```

**Content Section (Category):**
```javascript
{
  _id: ObjectId("..."),
  name: "Movies",
  name_he: "סרטים",
  slug: "movies",
  icon: "film",
  is_active: true,
  order: 1
}
```

## Google Cloud Storage Structure

**Blob Naming:**
```
movies/{sanitized_title}/{original_filename}

Examples:
  movies/The_Matrix/The.Matrix.1999.1080p.BluRay.x264.mkv
  movies/Inception/Inception.2010.1080p.WEBRip.x264.mp4
```

**Content Type:**
- `.mp4` → `video/mp4`
- `.mkv` → `video/x-matroska`
- `.avi` → `video/x-msvideo`

**Access:**
- Public read access (via IAM bucket policy)
- Direct streaming URL: `https://storage.googleapis.com/{bucket}/{blob_name}`

## Prerequisites Validation

The script automatically checks:
- ✅ Python 3.11+ installed
- ✅ Poetry installed
- ✅ Backend dependencies installed
- ✅ MongoDB Atlas URL configured (not localhost)
- ✅ Google Cloud credentials configured
- ✅ Python upload script exists

If any prerequisite fails, the script stops with clear error message.

## Example Workflows

### Workflow 1: First-Time Upload

```bash
# 1. Configure environment
export MONGODB_URL='mongodb+srv://...'

# 2. Authenticate with Google Cloud
gcloud auth application-default login

# 3. Dry run to preview
./upload_movies.sh --dry-run

# 4. Upload first 5 to test
./upload_movies.sh --limit 5

# 5. Verify in MongoDB Atlas and GCS console

# 6. Upload all remaining
./upload_movies.sh
```

### Workflow 2: Resume Failed Upload

If upload fails partway through:

```bash
# Check last uploaded movie (e.g., "Spider-Man")
# Resume from next letter
./upload_movies.sh --start-from T
```

### Workflow 3: Upload from Multiple Drives

```bash
# Drive 1 (Movies A-M)
./upload_movies.sh --drive-name "USB Drive 1" --start-from A

# Drive 2 (Movies N-Z)
./upload_movies.sh --drive-name "USB Drive 2" --start-from N
```

### Workflow 4: Selective Upload

```bash
# Only upload movies starting with specific letters
./upload_movies.sh --start-from S --limit 50
```

## Troubleshooting

### "No external drives detected"

**Cause:** No mounted external drives found

**Solution:**
1. Check drive is mounted: `ls /Volumes`
2. If not mounted, connect drive
3. Or specify path manually: `--source /path/to/movies`

### "MONGODB_URL environment variable not set"

**Cause:** MongoDB connection string not configured

**Solution:**
```bash
export MONGODB_URL='mongodb+srv://username:password@cluster.mongodb.net'
```

### "Cannot use localhost for production uploads"

**Cause:** MONGODB_URL points to localhost

**Solution:** Use MongoDB Atlas connection string (not local MongoDB)

### "No Google Cloud credentials found"

**Cause:** Neither gcloud auth nor service account key configured

**Solution (Option 1 - gcloud):**
```bash
gcloud auth application-default login
```

**Solution (Option 2 - Service Account):**
```bash
export GOOGLE_APPLICATION_CREDENTIALS='/path/to/key.json'
```

### "TMDB API error"

**Cause:** TMDB API key missing or invalid, or rate limit exceeded

**Solution:**
- Script continues without TMDB metadata
- Movie is uploaded using filename-extracted title
- Optional: Get API key at https://www.themoviedb.org/settings/api

### "File too large (15.2GB, max 10GB)"

**Cause:** Video file exceeds 10GB limit

**Solution:**
- File is automatically skipped
- Consider compressing video before upload
- Or increase limit in Python script if needed

### "File already exists in database (same hash)"

**Cause:** Duplicate file detected

**Solution:**
- File is automatically skipped (expected behavior)
- This prevents duplicate content in database

## Performance

### Upload Speed

Depends on:
- Internet upload bandwidth
- File sizes
- GCS region proximity

**Typical speeds:**
- 1GB file: 2-5 minutes (on 50Mbps upload)
- 5GB file: 10-25 minutes

### Batching Recommendations

For large collections:
1. Use `--limit` for initial batches (test 5-10 movies)
2. Use `--start-from` to resume if interrupted
3. Upload overnight for large batches (100+ movies)

### TMDB Rate Limits

- TMDB API: 40 requests per 10 seconds
- Script respects rate limits
- Adds delay if rate limit hit

## Security Considerations

### Environment Variables

**NEVER commit these to git:**
- `MONGODB_URL` - Contains credentials
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to private key
- `TMDB_API_KEY` - API authentication

**Best practice:**
```bash
# Store in .env file (add to .gitignore)
echo "MONGODB_URL=..." >> .env
echo "GOOGLE_APPLICATION_CREDENTIALS=..." >> .env

# Source before running
source .env
./upload_movies.sh
```

### MongoDB Atlas Security

- Use IP whitelist (0.0.0.0/0 for Cloud Run)
- Use database user with minimum required permissions
- Rotate credentials regularly

### Google Cloud Storage

- Use service account with minimal IAM permissions
- Required permissions: `storage.objects.create`, `storage.objects.get`
- Bucket should be publicly readable for streaming

## Monitoring Upload Progress

### During Upload

The script outputs:
```
Processing: The Matrix (1999)
  File hash: a1b2c3d4e5f6...
  Found TMDB metadata: The Matrix
  Uploading to GCS: gs://bucket/movies/The_Matrix/...
  Uploaded successfully: https://storage.googleapis.com/...
  Added to database: 507f1f77bcf86cd799439011

Processing: Inception (2010)
  File hash: b2c3d4e5f6a7...
  ...
```

### Final Summary

```
============================================================
Upload complete!
  Processed: 47
  Skipped:   3   (2 duplicates, 1 too large)
  Failed:    0
============================================================
```

### Verify in MongoDB Atlas

```javascript
// Count uploaded movies
db.content.countDocuments({ category_name: "Movies" })

// List recent uploads
db.content.find({ category_name: "Movies" })
  .sort({ created_at: -1 })
  .limit(10)
```

### Verify in GCS Console

1. Open Google Cloud Console
2. Navigate to Cloud Storage
3. Browse `movies/` folder
4. Verify video files uploaded

## API Usage

Direct Python script usage (advanced):

```bash
cd backend

# Basic usage
poetry run python ../scripts/backend/upload_real_movies.py \
  --source /Volumes/USB/Movies

# With options
poetry run python ../scripts/backend/upload_real_movies.py \
  --source /Volumes/USB/Movies \
  --dry-run \
  --limit 10 \
  --start-from T
```

## Support

For issues or questions:
1. Check this guide first
2. Review error messages (script provides detailed errors)
3. Verify prerequisites are met
4. Check MongoDB Atlas and GCS console for data

## Version History

- **2026-01-25**: Initial movie upload system
  - Bash wrapper with auto-detection
  - TMDB integration
  - Duplicate detection
  - Comprehensive error handling
