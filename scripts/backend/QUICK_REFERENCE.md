# Content Upload Quick Reference

Quick reference for uploading movies and TV series to Bayit+.

## Setup (One-Time)

```bash
# 1. Copy environment template
cp .env.upload.example .env.upload

# 2. Edit with your credentials
vim .env.upload

# 3. Source environment
source .env.upload
```

## Movies

### Preview (Dry Run)
```bash
./upload_movies.sh --dry-run
```

### Test Upload (5 movies)
```bash
./upload_movies.sh --limit 5
```

### Upload All Movies
```bash
./upload_movies.sh
```

### Resume from Letter "T"
```bash
./upload_movies.sh --start-from T
```

### Custom Source
```bash
./upload_movies.sh --source /Volumes/MyDrive/Movies
```

## TV Series

### Preview (Dry Run)
```bash
./upload_series.sh --dry-run
```

### Upload Specific Series
```bash
./upload_series.sh --series "Game of Thrones"
```

### Test Upload (2 series)
```bash
./upload_series.sh --limit 2
```

### Upload All Series
```bash
./upload_series.sh
```

### Custom Source
```bash
./upload_series.sh --source /Volumes/MyDrive/Series
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URL` | ✅ Yes | MongoDB Atlas connection string |
| `GCS_BUCKET_NAME` | ✅ Yes | Google Cloud Storage bucket |
| `GOOGLE_APPLICATION_CREDENTIALS` | ⚠️ Optional | Service account key path (if not using gcloud) |
| `TMDB_API_KEY` | ⚪ Optional | Movie metadata from TMDB |

## Quick Troubleshooting

| Error | Solution |
|-------|----------|
| "No external drives detected" | Connect drive or use `--source /path` |
| "MONGODB_URL not set" | Run `source .env.upload` |
| "No Google Cloud credentials" | Run `gcloud auth application-default login` |
| "File too large" | Automatically skipped (max 10GB) |
| "File already exists" | Duplicate detected, automatically skipped |

## File Support

**Supported:** `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`, `.m4v`
**Max Size:** 10GB
**Auto-detected:** Title, year, quality, codec

## Get Help

```bash
./upload_movies.sh --help
./upload_series.sh --help
```

## Full Documentation

- **Movies:** `MOVIE_UPLOAD_GUIDE.md`
- **Series:** `SERIES_UPLOAD_GUIDE.md`
