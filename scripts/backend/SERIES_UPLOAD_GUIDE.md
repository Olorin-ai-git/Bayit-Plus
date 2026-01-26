# TV Series Upload Guide

Complete guide for uploading TV series/shows from external drives to Bayit+ platform.

## Overview

The series upload system handles multi-season TV shows with automatic:
- Series parent creation
- Episode extraction and organization
- Season/episode number detection
- TMDB metadata integration
- Episode linking to series parents

## Quick Start

### 1. Prepare Your Directory Structure

**Expected format:**
```
/Volumes/USB Drive/Series/
  ├── Game of Thrones/
  │   ├── Season 1/
  │   │   ├── Game.of.Thrones.S01E01.Winter.Is.Coming.1080p.mkv
  │   │   ├── Game.of.Thrones.S01E02.The.Kingsroad.1080p.mkv
  │   │   └── ...
  │   ├── Season 2/
  │   │   ├── Game.of.Thrones.S02E01.The.North.Remembers.1080p.mkv
  │   │   └── ...
  │   └── ...
  ├── Breaking Bad/
  │   ├── Season 1/
  │   │   ├── Breaking.Bad.S01E01.Pilot.1080p.mkv
  │   │   └── ...
  │   └── ...
  └── The Office/
      └── ...
```

**Key requirements:**
- Each series in its own folder
- Seasons in subfolders (e.g., "Season 1", "Season 2", or "S01", "S02")
- Episodes with S##E## format in filename

### 2. Setup Environment

```bash
# Required: MongoDB Atlas connection
export MONGODB_URL='mongodb+srv://username:password@cluster.mongodb.net'

# Optional: Google Cloud service account
export GOOGLE_APPLICATION_CREDENTIALS='/path/to/service-account-key.json'

# Optional: TMDB API key for series metadata
export TMDB_API_KEY='your-tmdb-api-key'

# Optional: GCS bucket name
export GCS_BUCKET_NAME='your-bucket-name'
```

### 3. Dry Run (Always First!)

```bash
cd scripts/backend
./upload_series.sh --dry-run
```

### 4. Test Upload

```bash
# Upload first 2 series only
./upload_series.sh --limit 2
```

### 5. Full Upload

```bash
# Upload all series
./upload_series.sh
```

## Advanced Usage

### Filter by Series Name

Upload specific series only:

```bash
# Partial name match
./upload_series.sh --series "Game of Thrones"
./upload_series.sh --series "Breaking"
```

### Custom Source Directory

```bash
./upload_series.sh --source /Volumes/MyDrive/TV\ Shows
```

### Combine Options

```bash
# Dry run for specific series
./upload_series.sh --dry-run --series "The Office"

# Upload first 3 series from custom path
./upload_series.sh --source /path/to/series --limit 3
```

## Filename Parsing

The script supports multiple naming conventions:

### Standard S##E## Format
```
Game.of.Thrones.S01E01.mkv          → S01E01
Breaking.Bad.S02E03.1080p.mkv       → S02E03
The.Office.s03e05.BluRay.mkv        → S03E05 (case insensitive)
```

### Alternative Formats
```
Game.of.Thrones.1x01.mkv            → S01E01
Breaking.Bad.Season.1.Episode.3.mkv → S01E03
```

### What Gets Removed
- Quality indicators (720p, 1080p, 4K, UHD)
- Source indicators (BluRay, WEBRip, WEB-DL)
- Codec indicators (x264, x265, H.264, HEVC)
- Release groups (YTS, YIFY, RARBG)
- Episode titles (everything after S##E##)

## TMDB Integration

For each series:
1. Searches TMDB TV database
2. Creates series parent with metadata
3. Fetches:
   - Series title
   - Overview/description
   - First air date (year)
   - Rating
   - Poster and backdrop images
   - Total seasons and episodes
   - Genres
   - Status (Continuing, Ended)

Episode metadata inherited from series parent:
- Poster image (series poster)
- Backdrop image
- Genres
- Rating

## Database Structure

### Series Parent Document
```javascript
{
  _id: ObjectId("..."),
  title: "Game of Thrones",
  description: "Seven noble families fight...",
  category_id: "...",
  category_name: "Series",
  is_series: true,
  is_published: true,
  content_type: "series",
  season: null,           // Parent has no season
  episode: null,          // Parent has no episode
  stream_url: "",         // Parent has no stream
  thumbnail: "https://image.tmdb.org/t/p/w500/poster.jpg",
  backdrop: "https://image.tmdb.org/t/p/original/backdrop.jpg",
  year: 2011,
  rating: 9.3,
  tmdb_id: 1399,
  total_seasons: 8,
  total_episodes: 73,
  genres: ["Drama", "Sci-Fi & Fantasy", "Action & Adventure"],
  status: "Ended",
  created_at: ISODate("..."),
  updated_at: ISODate("...")
}
```

### Episode Document
```javascript
{
  _id: ObjectId("..."),
  title: "Game of Thrones S01E01",
  description: "",
  stream_url: "https://storage.googleapis.com/bucket/series/Game_of_Thrones/Season_01/episode.mkv",
  category_id: "...",
  category_name: "Series",
  is_series: true,
  is_published: true,
  content_type: "episode",
  series_id: "...",       // Links to parent
  season: 1,
  episode: 1,
  file_hash: "a1b2c3d4...",
  thumbnail: "...",       // Inherited from series
  backdrop: "...",        // Inherited from series
  genres: [...],          // Inherited from series
  rating: 9.3,            // Inherited from series
  created_at: ISODate("..."),
  updated_at: ISODate("...")
}
```

## Google Cloud Storage Structure

```
series/
  ├── Game_of_Thrones/
  │   ├── Season_01/
  │   │   ├── Game.of.Thrones.S01E01.mkv
  │   │   ├── Game.of.Thrones.S01E02.mkv
  │   │   └── ...
  │   ├── Season_02/
  │   │   └── ...
  │   └── ...
  ├── Breaking_Bad/
  │   └── ...
  └── ...
```

## Common Workflows

### Workflow 1: First-Time Upload

```bash
# 1. Organize your files
# Ensure directory structure: Series/SeriesName/Season X/episodes

# 2. Configure environment
export MONGODB_URL='mongodb+srv://...'
gcloud auth application-default login

# 3. Dry run
./upload_series.sh --dry-run

# 4. Test with one series
./upload_series.sh --series "Breaking Bad" --dry-run
./upload_series.sh --series "Breaking Bad"

# 5. Upload all
./upload_series.sh
```

### Workflow 2: Add New Season

```bash
# Upload only new season for existing series
./upload_series.sh --series "Game of Thrones"
```

The script will:
- Find existing series parent
- Add new episodes
- Link to existing series
- Skip duplicate episodes (by hash)

### Workflow 3: Upload Multiple Series

```bash
# Upload first 5 series
./upload_series.sh --limit 5

# Check results, then continue with next 5
./upload_series.sh --limit 10  # Duplicates will be skipped
```

## Directory Structure Variations

### Supported Structures

**Structure 1: Standard (Recommended)**
```
Series/
  └── SeriesName/
      ├── Season 1/
      │   └── episodes
      └── Season 2/
          └── episodes
```

**Structure 2: Compact Season Names**
```
Series/
  └── SeriesName/
      ├── S01/
      │   └── episodes
      └── S02/
          └── episodes
```

**Structure 3: Flat (All episodes in series folder)**
```
Series/
  └── SeriesName/
      ├── SeriesName.S01E01.mkv
      ├── SeriesName.S01E02.mkv
      └── ...
```

**Note:** Structure 1 or 2 recommended for organization. Structure 3 works but season extraction relies on filenames.

### Not Supported

```
# ❌ No series folder
Series/
  ├── Episode.S01E01.mkv
  └── Episode.S01E02.mkv

# ❌ Mixed series in same folder
Series/
  ├── ShowA.S01E01.mkv
  ├── ShowB.S01E01.mkv
  └── ...
```

## Troubleshooting

### "Could not extract series name"

**Cause:** Filename or directory structure doesn't follow expected format

**Solution:**
- Ensure each series has its own folder
- Use S##E## format in filenames
- Or organize in Season folders

### "Could not extract S/E from filename"

**Cause:** Filename doesn't contain season/episode indicators

**Solution:**
- Rename files to include S01E01 format
- Example: `Episode Title.mkv` → `Series.Name.S01E01.mkv`

### "Skipped: Duplicate file"

**Cause:** Episode with same file hash already exists

**Solution:**
- This is expected behavior (prevents duplicates)
- If you need to re-upload, delete existing episode from database first

### "Found existing series parent"

**Cause:** Series already exists in database

**Solution:**
- This is normal when adding new episodes/seasons
- Script will link new episodes to existing series
- No action needed

## Performance

### Upload Speed

Similar to movie uploads:
- 1GB episode: 2-5 minutes
- Full season (10 episodes, 20GB): 30-60 minutes

### Recommendations

For large collections:
1. Use `--limit` to upload in batches
2. Use `--series` to upload one series at a time
3. Upload overnight for complete TV libraries (100+ episodes)

### TMDB Rate Limits

- TMDB API: 40 requests per 10 seconds
- Script includes 0.5s delay between series
- For 10 series: ~5 seconds for TMDB calls

## Episode Organization

After upload, use the organization script to enhance series:

```bash
cd backend
poetry run python ../scripts/backend/organize_series.py
```

This script:
- Verifies all episodes linked to parents
- Adds missing TMDB metadata
- Enriches episodes with series data
- Fixes any broken links

## Comparison: Movies vs Series

| Feature | Movies | Series |
|---------|--------|--------|
| **Structure** | Flat files | Nested (Series/Season/Episode) |
| **Metadata** | Single TMDB movie | TMDB series + episode data |
| **Database** | Single document | Parent + episode documents |
| **Linking** | None | Episodes linked to series_id |
| **Upload complexity** | Simple | Complex (hierarchy) |
| **Naming detection** | Title + Year | Series + S##E## |

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URL` | ✅ Yes | MongoDB Atlas connection |
| `GCS_BUCKET_NAME` | ✅ Yes | GCS bucket for videos |
| `GOOGLE_APPLICATION_CREDENTIALS` | ⚠️ Optional | Service account key (if not using gcloud) |
| `TMDB_API_KEY` | ⚪ Optional | Series metadata from TMDB |

## Quick Reference

```bash
# Preview series upload
./upload_series.sh --dry-run

# Upload specific series
./upload_series.sh --series "Breaking Bad"

# Upload first 3 series (testing)
./upload_series.sh --limit 3

# Custom source
./upload_series.sh --source /Volumes/TV/Series

# Show help
./upload_series.sh --help
```

## Related Scripts

- **Movie Upload:** `upload_movies.sh` - Upload movies
- **Series Organization:** `organize_series.py` - Organize existing series
- **Series Integrity:** `bayit-check-series-integrity.sh` - Verify series data

## Complete Example

```bash
# Step 1: Prepare drive
# Connect USB with structure:
# /Volumes/USB/Series/Breaking Bad/Season 1/episodes

# Step 2: Configure
cat > .env.upload <<EOF
export MONGODB_URL='mongodb+srv://user:pass@cluster.mongodb.net'
export TMDB_API_KEY='your-key'
export GCS_BUCKET_NAME='your-bucket'
EOF

source .env.upload

# Step 3: Dry run
./upload_series.sh --dry-run

# Output:
# Processing series: Breaking Bad (62 episodes)
#   Found TMDB metadata: Breaking Bad
#   Creating series parent for 'Breaking Bad'
#   Processing: S01E01 - Breaking.Bad.S01E01.mkv
#   [DRY RUN] Would upload to: gs://bucket/series/Breaking_Bad/Season_01/...
#   Processing: S01E02 - Breaking.Bad.S01E02.mkv
#   ...

# Step 4: Upload
./upload_series.sh --series "Breaking Bad"

# Step 5: Verify
# Check MongoDB Atlas and GCS console

# Step 6: Organize
cd backend
poetry run python ../scripts/backend/organize_series.py
```

## Version History

- **2026-01-25**: Initial series upload system
  - Bash wrapper with auto-detection
  - TMDB series integration
  - Series parent creation
  - Episode linking
  - Duplicate detection
  - Comprehensive error handling
