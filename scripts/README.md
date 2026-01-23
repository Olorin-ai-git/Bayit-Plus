# Monorepo Scripts Directory

Unified script organization for the entire Bayit+ / Olorin Media monorepo.

---

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Platform Scripts](#platform-scripts)
- [Configuration](#configuration)
- [Script Discovery](#script-discovery)
- [Quick Start](#quick-start)
- [Contributing](#contributing)

---

## Overview

This directory contains all scripts for the Bayit+ / Olorin Media monorepo, organized by platform and purpose. All scripts follow consistent patterns for configuration, error handling, and documentation.

**Key Principles:**
- **Platform-based organization** - Scripts grouped by platform (backend, web, mobile, TV)
- **Configuration-driven** - Zero hardcoded values, all from environment or config
- **Backward compatible** - Symlinks at original locations during transition period
- **Well-documented** - Each platform has comprehensive README
- **Easy discovery** - `find-all-scripts.sh` utility for quick searches

---

## Directory Structure

```
scripts/
├── README.md                    # This file - monorepo-wide overview
├── find-all-scripts.sh         # Script discovery utility
├── config/
│   └── monorepo-paths.env.example  # Configuration template
│
├── backend/                     # Backend/server scripts
│   ├── production/              # Production-ready scripts
│   │   ├── database/           # Database operations
│   │   ├── deployment/         # Deployment and smoke tests
│   │   ├── audit/              # Audit and validation
│   │   ├── ci/                 # CI/CD integration
│   │   ├── olorin/             # Olorin AI platform
│   │   └── content/            # Content management
│   ├── utilities/              # Shared Python modules
│   ├── migrations/             # Migration tracking
│   ├── config/                 # Backend-specific config
│   ├── testing/                # Test scripts
│   └── README.md               # Backend scripts guide
│
├── web/                         # Frontend/web scripts
│   ├── build/                  # Build and bundle analysis
│   ├── deployment/             # Web deployment
│   ├── testing/                # Visual regression, accessibility
│   └── README.md               # Web scripts guide
│
├── mobile/                      # Mobile app scripts
│   ├── ios/                    # iOS-specific scripts
│   ├── android/                # Android-specific scripts
│   ├── shared/                 # Cross-platform mobile utilities
│   └── README.md               # Mobile scripts guide
│
├── tv-platforms/                # TV platform scripts
│   ├── tvos/                   # Apple TV scripts
│   ├── tizen/                  # Samsung Tizen scripts
│   ├── webos/                  # LG webOS scripts
│   └── README.md               # TV platform scripts guide
│
├── infrastructure/              # Cross-service infrastructure
│   ├── deployment/             # Infrastructure deployment
│   ├── secrets/                # Secret management
│   ├── ci/                     # CI/CD infrastructure
│   └── README.md               # Infrastructure scripts guide
│
├── shared/                      # Cross-platform utilities
│   ├── style-migration/        # Stylesheet migration tools
│   ├── setup/                  # Environment setup
│   └── README.md               # Shared scripts guide
│
└── deprecated/                  # Deprecated scripts
    └── DEPRECATED.md           # Deprecation notices
```

---

## Platform Scripts

### Backend Scripts

**Location:** `scripts/backend/`

**Purpose:** Backend/server operations including database management, deployment, auditing, and content management.

**Key Scripts:**
- `production/database/backup_database.sh` - Encrypted database backups
- `production/database/restore_database.sh` - Database restoration with safety backups
- `production/deployment/smoke_tests.sh` - Health check smoke tests
- `production/content/url_migrator.py` - Unified URL migration tool
- `production/content/podcast_manager.py` - Podcast management with Strategy pattern

**Documentation:** See `backend/README.md`

---

### Web Scripts

**Location:** `scripts/web/`

**Purpose:** Frontend build, deployment, and testing operations.

**Key Scripts:**
- `build/analyze-bundle.sh` - Webpack bundle analysis
- `deployment/verify-deployment.sh` - Deployment health checks
- `testing/run-visual-regression.sh` - Visual regression testing
- `testing/test-accessibility.sh` - WCAG accessibility checks

**Documentation:** See `web/README.md`

---

### Mobile Scripts

**Location:** `scripts/mobile/`

**Purpose:** Mobile app build, deployment, and testing for iOS and Android.

**Key Scripts:**
- `ios/setup-xcode.sh` - Xcode environment setup
- `ios/deploy-ios.sh` - iOS deployment automation
- `shared/mobile-common.sh` - Cross-platform mobile utilities

**Documentation:** See `mobile/README.md`

---

### TV Platform Scripts

**Location:** `scripts/tv-platforms/`

**Purpose:** TV platform build, packaging, and deployment for Apple TV, Samsung Tizen, and LG webOS.

**Key Scripts:**
- `tvos/localization-audit.sh` - tvOS internationalization audit
- `tizen/deploy.sh` - Samsung Tizen deployment
- `tizen/package-tizen.sh` - Tizen app packaging
- `webos/package-webos.sh` - LG webOS app packaging

**Documentation:** See `tv-platforms/README.md`

---

### Infrastructure Scripts

**Location:** `scripts/infrastructure/`

**Purpose:** Cross-service infrastructure management including deployment, secrets, and CI/CD.

**Key Scripts:**
- `deployment/quick-deploy.sh` - Fast deployment across services
- `secrets/setup_gcp_secrets.sh` - GCP Secret Manager configuration
- `ci/create-build-trigger.sh` - Cloud Build trigger setup

**Documentation:** See `infrastructure/README.md`

---

### Shared Scripts

**Location:** `scripts/shared/`

**Purpose:** Cross-platform utilities used across multiple platforms.

**Key Scripts:**
- `style-migration/migrate.sh` - Stylesheet to Tailwind migration
- `setup/SETUP_COMMANDS.sh` - Development environment setup

**Documentation:** See `shared/README.md`

---

## Configuration

### Global Configuration

**File:** `scripts/config/monorepo-paths.env.example`

**Setup:**
```bash
# 1. Copy example to active config
cp scripts/config/monorepo-paths.env.example scripts/config/monorepo-paths.env

# 2. Edit with your values
vim scripts/config/monorepo-paths.env

# 3. Source in scripts
source "${SCRIPTS_ROOT}/config/monorepo-paths.env"
```

**Key Variables:**
- `PROJECT_ROOT` - Auto-detected monorepo root
- `BACKEND_DIR`, `WEB_DIR`, `MOBILE_APP_DIR` - Platform directories
- `SCRIPTS_ROOT` - This scripts/ directory
- `DEPLOYMENT_REGION`, `DEPLOYMENT_ENV` - Deployment configuration
- `DRY_RUN`, `VERBOSE` - Script behavior flags

### Platform-Specific Configuration

Each platform has its own configuration:
- **Backend:** `scripts/backend/config/paths.env.example`
- **Web:** `scripts/web/config/` (if needed)
- **Mobile:** `scripts/mobile/config/` (if needed)

---

## Script Discovery

### find-all-scripts.sh

**Purpose:** Search for scripts across all platforms in the monorepo.

**Usage:**
```bash
# Search all platforms for a keyword
./find-all-scripts.sh deploy

# Search specific platform
./find-all-scripts.sh backend backup
./find-all-scripts.sh web test
./find-all-scripts.sh mobile ios

# List all platforms
./find-all-scripts.sh --list-platforms

# Show recently modified scripts
./find-all-scripts.sh --recent
```

**Examples:**
```bash
# Find all deployment scripts
./find-all-scripts.sh infrastructure deploy

# Find all testing scripts across platforms
./find-all-scripts.sh test

# Find iOS-specific scripts
./find-all-scripts.sh mobile ios
```

---

## Quick Start

### Running Backend Scripts

```bash
# Database backup
cd scripts/backend
export BACKUP_ENCRYPTION_KEY='your-key'
./production/database/backup_database.sh

# Run smoke tests
export SERVICE_URL='https://your-service.com'
./production/deployment/smoke_tests.sh

# URL migration (dry-run first)
cd /path/to/backend
poetry run python ../scripts/backend/production/content/url_migrator.py bucket_upgrade
```

### Running Web Scripts

```bash
# Analyze bundle size
cd scripts/web
./build/analyze-bundle.sh

# Verify deployment
export DEPLOYMENT_URL='https://your-app.com'
./deployment/verify-deployment.sh
```

### Running Mobile Scripts

```bash
# Setup Xcode environment
cd scripts/mobile
./ios/setup-xcode.sh

# Deploy iOS app
export IOS_PROVISIONING_PROFILE='path/to/profile'
./ios/deploy-ios.sh
```

### Running TV Platform Scripts

```bash
# Package Tizen app
cd scripts/tv-platforms
./tizen/package-tizen.sh

# Deploy to Samsung TV
./tizen/deploy.sh
```

### Running Infrastructure Scripts

```bash
# Setup GCP secrets
cd scripts/infrastructure
./secrets/setup_gcp_secrets.sh

# Quick deployment
export DEPLOYMENT_ENV='staging'
./deployment/quick-deploy.sh
```

---

## Contributing

### Adding New Scripts

Before adding a new script:
1. **Check for existing functionality** - Use `find-all-scripts.sh` to search
2. **Choose correct platform** - Place in appropriate platform directory
3. **Follow naming conventions** - Use lowercase with underscores (`script_name.sh`)
4. **Use configuration** - NO hardcoded values (use monorepo-paths.env)
5. **Add documentation** - Include header with purpose, usage, examples
6. **Test thoroughly** - Dry-run mode, error handling, all platforms

### Script Templates

See `backend/CONTRIBUTING.md` for complete script templates and guidelines.

### Pull Request Checklist

- [ ] Script placed in correct platform directory
- [ ] No hardcoded values (all from configuration)
- [ ] Comprehensive header documentation
- [ ] Dry-run mode implemented (if modifying data)
- [ ] Error handling present
- [ ] Backward compatibility maintained
- [ ] Platform README.md updated
- [ ] Tested on relevant platforms

---

## Backward Compatibility

During the transition period (90 days), backward compatibility symlinks exist at original script locations:

- `backend/scripts/` → `scripts/backend/`
- `web/scripts/` → `scripts/web/`
- `mobile-app/*.sh` → `scripts/mobile/ios/*.sh`
- `deployment/scripts/` → `scripts/infrastructure/`
- And more...

**Removal Date:** Q2 2026 (planned)

---

## Migration Guide

If you were using scripts at old locations:

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

**Or use symlinks (during transition):**
```bash
cd backend/scripts  # Still works via symlink
./production/database/backup_database.sh
```

---

## Platform Documentation

- **Backend:** `scripts/backend/README.md`
- **Web:** `scripts/web/README.md`
- **Mobile:** `scripts/mobile/README.md`
- **TV Platforms:** `scripts/tv-platforms/README.md`
- **Infrastructure:** `scripts/infrastructure/README.md`
- **Shared:** `scripts/shared/README.md`

---

## Success Metrics

### Organization
- ✅ 50+ scripts organized across 6 platforms
- ✅ Clear platform-based categorization
- ✅ Consistent structure and naming

### Discoverability
- ✅ `find-all-scripts.sh` monorepo-wide search
- ✅ Comprehensive documentation per platform
- ✅ Easy navigation by platform or purpose

### Safety
- ✅ Backward compatibility via symlinks
- ✅ Configuration-driven (zero hardcoded values)
- ✅ Well-tested with validation

---

## Questions?

- **Script Organization:** See this README
- **Platform-Specific:** See platform README files
- **Configuration:** See `config/monorepo-paths.env.example`
- **Backend Scripts:** See `backend/README.md`
- **Contributing:** See `backend/CONTRIBUTING.md`

---

## Version History

- **2026-01-23**: Initial monorepo-wide organization
  - Created unified scripts/ directory
  - Organized 50+ scripts across 6 platforms
  - Implemented discovery utility
  - Comprehensive documentation per platform
