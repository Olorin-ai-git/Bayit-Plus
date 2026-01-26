# Backend Scripts

Organized collection of production scripts, utilities, and migration tools.

## 📁 Directory Structure

```
backend/scripts/
├── production/          # Production-ready scripts
│   ├── database/       # Database operations (backup, restore)
│   ├── deployment/     # Deployment and smoke tests
│   ├── audit/          # Audit and validation scripts
│   ├── ci/             # CI/CD integration scripts
│   ├── olorin/         # Olorin AI platform scripts
│   └── content/        # Content management (URL migrator, podcast manager)
│
├── utilities/          # Shared utility modules
├── migrations/         # Migration tracking and history
├── config/             # Configuration infrastructure
├── testing/            # Test scripts (non-production)
└── deprecated/         # Deprecated scripts
```

## 🔗 Backward Compatibility Symlinks

- `backup_database.sh` → `production/database/backup_database.sh`
- `restore_database.sh` → `production/database/restore_database.sh`
- `smoke_tests.sh` → `production/deployment/smoke_tests.sh`
- `run-ci-checks.sh` → `production/ci/run-ci-checks.sh`
- `upload` → `upload_movies.sh` (shortcut for movie uploads)
- `upload-series` → `upload_series.sh` (shortcut for series uploads)

## 📊 Script Inventory

See individual directories for detailed documentation.

**Key Scripts:**
- **Library Integrity Verification:** `bayit-verify-library-integrity.sh` - Zero-trust verification of complete media library
- **URL Migrator:** `production/content/url_migrator.py` - Unified URL migration (consolidates 7+ scripts)
- **Podcast Manager:** `production/content/podcast_manager.py` - Unified podcast management (consolidates 35+ scripts)
- **Movie Upload:** `upload_movies.sh` - Upload movies from external drives to GCS and MongoDB Atlas
- **Series Upload:** `upload_series.sh` - Upload TV series from external drives with season/episode organization
- **Database Backup:** `production/database/backup_database.sh` - Encrypted backups with AES-256
- **Database Restore:** `production/database/restore_database.sh` - Decryption and safety backups

## 🚀 Common Tasks

**Upload Movies from External Drive:**
```bash
# Dry run to preview
./upload_movies.sh --dry-run

# Upload first 5 movies (testing)
./upload_movies.sh --limit 5

# Upload movies starting from letter "T"
./upload_movies.sh --start-from T

# Auto-detect external drive and upload all
export MONGODB_URL='mongodb+srv://user:pass@cluster.mongodb.net'
./upload_movies.sh
```

**Upload TV Series from External Drive:**
```bash
# Dry run to preview
./upload_series.sh --dry-run

# Upload specific series
./upload_series.sh --series "Game of Thrones"

# Upload first 2 series (testing)
./upload_series.sh --limit 2

# Auto-detect external drive and upload all
export MONGODB_URL='mongodb+srv://user:pass@cluster.mongodb.net'
./upload_series.sh
```

**Database Backup:**
```bash
BACKUP_ENCRYPTION_KEY="your-key" ./backup_database.sh
```

**URL Migration:**
```bash
python production/content/url_migrator.py bucket_upgrade --execute
```

**Podcast Management:**
```bash
python production/content/podcast_manager.py batch-add podcast_sources.yaml
```

**Library Integrity Verification:**
```bash
# Quick health check (recommended)
./bayit-verify-library-integrity.sh --dry-run

# Live verification with metadata rehydration
./bayit-verify-library-integrity.sh --live --rehydrate-metadata

# Deep audit with all checks (very slow)
./bayit-verify-library-integrity.sh --verify-hashes --verify-streaming --dry-run

# Verify specific category
./bayit-verify-library-integrity.sh --category movies --limit 500
```

## 📝 Configuration

Required environment variables:
- `BACKUP_ENCRYPTION_KEY` - Encryption key for backups
- `MONGODB_URI` / `MONGODB_URL` - MongoDB connection string
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to GCS service account key (for movie uploads)
- `GCS_BUCKET_NAME` - Google Cloud Storage bucket name
- `TMDB_API_KEY` - TMDB API key for movie metadata (optional)

See `config/paths.env.example` for full configuration options.

## 🔒 Security

- All backups encrypted with AES-256-CBC
- MongoDB transactions for data migrations
- Rollback capability (90-day retention)
- No hardcoded values anywhere

## 📚 Documentation

- **URL Migrator:** `production/content/README.md`
- **Migration History:** `migrations/MIGRATION_HISTORY.md`
- **Configuration:** `config/paths.env.example`
