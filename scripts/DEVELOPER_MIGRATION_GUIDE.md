# Developer Migration Guide

Guide for developers to transition to the new monorepo-wide script organization.

---

## Overview

All scripts have been reorganized into a unified `scripts/` directory at the project root, organized by platform (backend, web, mobile, tv-platforms, infrastructure, shared).

**Key Changes:**
- ✅ All scripts moved to `scripts/` directory
- ✅ Platform-based organization (6 platforms)
- ✅ Backward compatibility symlinks (90-day transition)
- ✅ Discovery utility (`find-all-scripts.sh`)
- ✅ Centralized configuration

**Transition Period:** 90 days (until Q2 2026)
**Removal Date:** Symlinks removed Q2 2026

---

## Quick Reference

### Old vs New Paths

| Old Path | New Path | Status |
|----------|----------|--------|
| `backend/scripts/production/database/backup_database.sh` | `scripts/backend/production/database/backup_database.sh` | ✅ Migrated |
| `web/scripts/analyze-bundle.sh` | `scripts/web/build/analyze-bundle.sh` | ✅ Migrated |
| `mobile-app/setup-xcode.sh` | `scripts/mobile/ios/setup-xcode.sh` | 📋 Prepared |
| `tizen/deploy.sh` | `scripts/tv-platforms/tizen/deploy.sh` | 📋 Prepared |
| `deployment/scripts/quick-deploy.sh` | `scripts/infrastructure/deployment/quick-deploy.sh` | 📋 Prepared |
| `migrate.sh` | `scripts/shared/style-migration/migrate.sh` | 📋 Prepared |

---

## For Developers: What Changed

### 1. Script Locations

**Before:**
```bash
cd backend/scripts
./production/database/backup_database.sh
```

**After:**
```bash
cd scripts/backend
./production/database/backup_database.sh
```

**Transition (symlinks work):**
```bash
cd backend/scripts  # Symlink to scripts/backend
./production/database/backup_database.sh  # Still works!
```

---

### 2. Finding Scripts

**Before:** Manual searching

**After:** Use discovery utility

```bash
# Find all deployment scripts
./scripts/find-all-scripts.sh deploy

# Find backend backup scripts
./scripts/find-all-scripts.sh backend backup

# Find web testing scripts
./scripts/find-all-scripts.sh web test

# Show recently modified scripts
./scripts/find-all-scripts.sh --recent

# View statistics
./scripts/find-all-scripts.sh --stats
```

---

### 3. Configuration

**Before:** Hardcoded paths in scripts

**After:** Centralized configuration

**File:** `scripts/config/monorepo-paths.env.example`

```bash
# Copy example to active config
cp scripts/config/monorepo-paths.env.example scripts/config/monorepo-paths.env

# Edit with your values
vim scripts/config/monorepo-paths.env

# Scripts automatically source this configuration
```

---

## Migration Steps for Your Workflow

### Step 1: Update Your Scripts/Aliases

**Bash aliases:**
```bash
# Old
alias backup="cd ~/Documents/olorin/olorin-media/bayit-plus/backend/scripts && ./production/database/backup_database.sh"

# New (preferred)
alias backup="cd ~/Documents/olorin/olorin-media/bayit-plus/scripts/backend && ./production/database/backup_database.sh"

# Or use symlink (during transition)
alias backup="cd ~/Documents/olorin/olorin-media/bayit-plus/backend/scripts && ./production/database/backup_database.sh"
```

### Step 2: Update Your Documentation

Update any team documentation, runbooks, or wiki pages that reference script paths:

**Old documentation:**
```
To backup the database:
1. cd backend/scripts
2. ./production/database/backup_database.sh
```

**New documentation:**
```
To backup the database:
1. cd scripts/backend
2. ./production/database/backup_database.sh

Or find the script:
./scripts/find-all-scripts.sh backend backup
```

### Step 3: Update Your CI/CD Pipelines (if applicable)

If you have local CI/CD scripts or deployment pipelines:

**Old:**
```yaml
- run: cd backend/scripts && ./production/deployment/smoke_tests.sh
```

**New:**
```yaml
- run: cd scripts/backend && ./production/deployment/smoke_tests.sh
```

### Step 4: Bookmark Key Documentation

- **Main README:** `scripts/README.md` - Monorepo-wide overview
- **Backend:** `scripts/backend/README.md`
- **Web:** `scripts/web/README.md`
- **Discovery:** `./scripts/find-all-scripts.sh --help`

---

## Common Tasks

### Task: Backup Database

**Before:**
```bash
cd backend/scripts
export BACKUP_ENCRYPTION_KEY='your-key'
./production/database/backup_database.sh
```

**After:**
```bash
cd scripts/backend
export BACKUP_ENCRYPTION_KEY='your-key'
./production/database/backup_database.sh
```

**Or use symlink (transition):**
```bash
cd backend/scripts  # Still works!
export BACKUP_ENCRYPTION_KEY='your-key'
./production/database/backup_database.sh
```

---

### Task: Run Smoke Tests

**Before:**
```bash
cd backend/scripts
export SERVICE_URL='https://api.example.com'
./smoke_tests.sh
```

**After:**
```bash
cd scripts/backend
export SERVICE_URL='https://api.example.com'
./production/deployment/smoke_tests.sh
```

---

### Task: Analyze Web Bundle

**Before:**
```bash
cd web/scripts
./analyze-bundle.sh
```

**After:**
```bash
cd scripts/web
./build/analyze-bundle.sh
```

**Or use symlink (transition):**
```bash
cd web/scripts  # Still works!
./analyze-bundle.sh
```

---

### Task: Find a Script

**New capability:**
```bash
# I need to run a podcast script but don't know where it is
./scripts/find-all-scripts.sh podcast

# Output:
# 📄 Scripts matching filename:
#   📦 [backend] backend/production/content/podcast_manager.py
#     → Unified podcast management using Strategy pattern
```

---

## FAQ

### Q: Do I have to change my workflow immediately?

**A:** No! Backward compatibility symlinks exist for 90 days. Old paths still work.

**Transition period:** Until Q2 2026
**Recommended:** Start using new paths now to avoid disruption later

---

### Q: What happens to my existing scripts?

**A:** They were moved, not deleted. All functionality preserved.

- Backend scripts: Moved to `scripts/backend/`
- Web scripts: Moved to `scripts/web/`
- Configuration, utilities, migrations: All preserved

---

### Q: How do I find a script if I don't know where it is?

**A:** Use the discovery utility:

```bash
./scripts/find-all-scripts.sh [keyword]
./scripts/find-all-scripts.sh --help
```

---

### Q: Can I still use `cd backend/scripts`?

**A:** Yes! It's a symlink to `scripts/backend/`. Works identically during transition period.

**Timeline:**
- Now - Q2 2026: Symlinks work
- Q2 2026: Symlinks removed (use new paths)

---

### Q: What if I create a new script?

**A:** Place it in the appropriate location under `scripts/`:

1. Determine platform: backend, web, mobile, tv, infrastructure, or shared
2. Determine category: production, testing, utilities, etc.
3. Place in `scripts/[platform]/[category]/`
4. Follow templates in `scripts/backend/CONTRIBUTING.md`
5. Add to platform README

**Example:**
```bash
# New web testing script
# Place in: scripts/web/testing/my-new-test.sh

# New backend utility
# Place in: scripts/backend/utilities/my_utility.py
```

---

### Q: Do environment variables change?

**A:** No. All environment variables remain the same.

Scripts still use:
- `BACKUP_ENCRYPTION_KEY`
- `SERVICE_URL`
- `MONGODB_URL`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- etc.

Configuration is now centralized in `scripts/config/monorepo-paths.env.example`.

---

### Q: What about Python imports?

**A:** Python imports are updated automatically:

**Before:**
```python
from backend.scripts.utilities.url_transformers import URLTransformer
```

**After:**
```python
from scripts.utilities.url_transformers import URLTransformer
```

But scripts still work via symlinks during transition.

---

### Q: Where's the full documentation?

**A:** Each platform has detailed documentation:

- **Main:** `scripts/README.md`
- **Backend:** `scripts/backend/README.md`
- **Web:** `scripts/web/README.md`
- **Mobile:** `scripts/mobile/README.md`
- **TV Platforms:** `scripts/tv-platforms/README.md`
- **Infrastructure:** `scripts/infrastructure/README.md`
- **Shared:** `scripts/shared/README.md`

---

## Timeline

**2026-01-23:** Organization implemented, symlinks created
**Now - Q2 2026:** Transition period (both paths work)
**Q2 2026:** Symlinks removed (must use new paths)

---

## Need Help?

### Find Scripts
```bash
./scripts/find-all-scripts.sh [keyword]
./scripts/find-all-scripts.sh --help
./scripts/find-all-scripts.sh --stats
```

### Documentation
- **Main README:** `scripts/README.md`
- **Platform READMEs:** `scripts/[platform]/README.md`
- **Configuration:** `scripts/config/monorepo-paths.env.example`

### Questions
- Check platform-specific README files
- Use script discovery utility
- Review CI/CD workflow guidance: `scripts/CI_CD_WORKFLOW_GUIDANCE.md`

---

## Quick Start Checklist

For new team members or fresh setup:

- [ ] Read `scripts/README.md`
- [ ] Copy `scripts/config/monorepo-paths.env.example` to `scripts/config/monorepo-paths.env`
- [ ] Update configuration with your values
- [ ] Test discovery utility: `./scripts/find-all-scripts.sh --stats`
- [ ] Run a test script to verify setup
- [ ] Bookmark platform-specific READMEs

---

## Success Metrics

**Before Organization:**
- 50+ scripts scattered across 8+ directories
- No unified discovery
- Hardcoded paths in scripts
- Inconsistent structure

**After Organization:**
- ✅ Unified `scripts/` directory
- ✅ 6 platform categories
- ✅ Discovery utility
- ✅ Centralized configuration
- ✅ Comprehensive documentation
- ✅ Backward compatibility

**Statistics:**
- **Total scripts:** 196 scripts organized
- **Platforms:** 6 distinct platforms
- **Documentation:** 8 comprehensive README files
- **Discovery:** 1 monorepo-wide utility
- **Configuration:** Centralized in `scripts/config/`

---

## Version History

- **2026-01-23**: Monorepo-wide organization implemented
  - Created unified `scripts/` directory
  - Organized 196+ scripts across 6 platforms
  - Implemented discovery utility
  - Created comprehensive documentation
  - Established 90-day transition period with symlinks
