# Backend Scripts Directory

This directory contains utility scripts organized by category for managing the Bayit+ backend.

## 📁 Directory Structure

### `/content/`
Scripts for managing content (VOD, series, podcasts, live channels):
- `add_*.py` - Scripts to add new content to the database
- `update_*.py` - Scripts to update existing content
- `setup_*.py` - Scripts to set up content collections

**Common tasks:**
```bash
# Add new podcast to system
poetry run python scripts/content/add_hashavoua_podcast.py

# Update live channels
poetry run python scripts/content/update_live_channels.py
```

### `/data/`
Scripts for data processing, enrichment, and localization:
- `localize_content.py` - Localize content to multiple languages
- `find_*.py` - Find and discover content from external sources
- `get_*.py` - Retrieve data from external APIs
- Podcast management and enrichment scripts

**Common tasks:**
```bash
# Localize all content
poetry run python scripts/data/localize_content.py

# Find working archive content
poetry run python scripts/data/find_working_archive_urls.py
```

### `/maintenance/`
Scripts for system maintenance and data fixes:
- `fix_*.py` - Fix data issues and inconsistencies
- `bulk_*.py` - Bulk operations on content
- `migrate_*.py` - Data migration scripts
- `categorize_*.py` - Categorization and tagging

**Common tasks:**
```bash
# Fix broken image URLs
poetry run python scripts/maintenance/fix_podcast_image_urls.py

# Migrate data between collections
poetry run python scripts/maintenance/migrate_podcast_episodes.py
```

### `/testing/`
Scripts for testing, validation, and verification:
- `test_*.py` - Test various system components
- `check_*.py` - Check data integrity and status
- `validate_*.py` - Validate configurations and data
- `test_*.sh` - Shell scripts for testing workflows

**Common tasks:**
```bash
# Test all live streams
poetry run python scripts/testing/test_all_streams.py

# Validate librarian service
poetry run python scripts/testing/validate_librarian.py

# Run live librarian test
./scripts/testing/test_librarian_live.sh
```

### Root Scripts (specialized)
- `migrate_channel_languages.py` - Migrate live channel language settings
- `ingest_epg.py` - EPG data ingestion
- `seed_demo_content.py` - Seed demo data for testing
- `seed_data.py` - Seed production data

## 🚀 Running Scripts

### Prerequisites
All Python scripts should be run from the `backend/` directory using Poetry:

```bash
cd backend
poetry run python scripts/<category>/<script_name>.py
```

### Environment Variables
Most scripts require these environment variables:
- `MONGODB_URL` - MongoDB connection string
- `OPENAI_API_KEY` - For AI features
- `GCS_BUCKET_NAME` - Google Cloud Storage bucket
- `TMDB_API_KEY` - For movie metadata

Ensure your `.env` file is properly configured before running scripts.

## 📝 Best Practices

1. **Always backup before running maintenance scripts**
   ```bash
   ./scripts/backup_database.sh
   ```

2. **Test on staging first** - Many scripts modify production data

3. **Check script documentation** - Read the docstring at the top of each script

4. **Monitor logs** - Scripts output logs to help track progress

5. **Use dry-run mode** - Many scripts support `--dry-run` flag

## ⚠️ Safety Notes

- Scripts in `/maintenance/` can modify large amounts of data
- Always read the script before running it
- Test on a small subset first when possible
- Keep backups before running bulk operations
- Some scripts are disabled (`.DISABLED` extension) for safety

## 📚 Additional Documentation

- See `docs/features/` for feature-specific scripts
- See `docs/deployment/` for deployment scripts
- See `SCRIPTS_SAFETY_README.md` for safety guidelines
