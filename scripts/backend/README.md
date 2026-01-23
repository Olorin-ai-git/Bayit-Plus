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

## 📊 Script Inventory

See individual directories for detailed documentation.

**Key Scripts:**
- **URL Migrator:** `production/content/url_migrator.py` - Unified URL migration (consolidates 7+ scripts)
- **Podcast Manager:** `production/content/podcast_manager.py` - Unified podcast management (consolidates 35+ scripts)
- **Database Backup:** `production/database/backup_database.sh` - Encrypted backups with AES-256
- **Database Restore:** `production/database/restore_database.sh` - Decryption and safety backups

## 🚀 Common Tasks

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

## 📝 Configuration

Required environment variables:
- `BACKUP_ENCRYPTION_KEY` - Encryption key for backups
- `MONGODB_URI` - MongoDB connection string

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
