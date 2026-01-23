# Monorepo-Wide Script Organization Plan

## Executive Summary

**Current State:**
- ✅ Backend scripts: Fully organized under `backend/scripts/`
- 📋 Other scripts: 50+ scripts scattered across 8+ directories
- No unified discovery or organization
- Platform-specific scripts mixed with cross-platform utilities
- Inconsistent naming and structure

**Goal:**
Create unified root-level `scripts/` directory with platform-based organization while maintaining backward compatibility.

---

## Proposed Root-Level Structure

```
scripts/                              # NEW: Unified monorepo script root
├── README.md                         # Monorepo-wide script documentation
├── find-all-scripts.sh              # NEW: Monorepo-wide discovery utility
├── config/
│   └── monorepo-paths.env.example   # NEW: Cross-platform configuration
│
├── backend/                         # MOVED: from backend/scripts/
│   ├── production/
│   │   ├── database/
│   │   ├── deployment/
│   │   ├── audit/
│   │   ├── ci/
│   │   ├── olorin/
│   │   └── content/
│   ├── utilities/
│   ├── migrations/
│   ├── config/
│   ├── testing/
│   └── deprecated/
│
├── web/                             # NEW: Frontend scripts
│   ├── build/
│   │   ├── analyze-bundle.sh
│   │   └── verify-build.sh
│   ├── deployment/
│   │   ├── verify-deployment.sh
│   │   └── deploy-web.sh
│   ├── testing/
│   │   ├── run-visual-regression.sh
│   │   └── test-accessibility.sh
│   └── README.md
│
├── mobile/                          # NEW: Mobile app scripts
│   ├── ios/
│   │   ├── setup-xcode.sh
│   │   ├── deploy-ios.sh
│   │   └── build-ios.sh
│   ├── android/
│   │   └── (future scripts)
│   ├── shared/
│   │   └── mobile-common.sh
│   └── README.md
│
├── tv-platforms/                    # NEW: TV platform scripts
│   ├── tvos/
│   │   ├── localization-audit.sh
│   │   └── tvos-deploy.sh
│   ├── tizen/
│   │   ├── deploy.sh
│   │   ├── package-tizen.sh
│   │   └── verify-tizen.sh
│   ├── webos/
│   │   └── package-webos.sh
│   └── README.md
│
├── infrastructure/                  # NEW: Cross-service infrastructure
│   ├── deployment/
│   │   ├── quick-deploy.sh
│   │   ├── DEPLOY.sh              # backend-olorin
│   │   └── VERIFY.sh              # backend-olorin
│   ├── secrets/
│   │   ├── setup_gcp_secrets.sh
│   │   ├── setup-git-secrets.sh
│   │   └── retrieve-secrets.sh
│   ├── ci/
│   │   ├── create-build-trigger.sh
│   │   └── setup_gcs_production.sh
│   └── README.md
│
├── shared/                          # NEW: Cross-platform utilities
│   ├── style-migration/
│   │   ├── migrate.sh
│   │   ├── convert-stylesheet-to-tailwind.sh
│   │   ├── fix_tailwind_classes.py
│   │   └── migrate_styles.py
│   ├── setup/
│   │   └── SETUP_COMMANDS.sh
│   └── README.md
│
└── deprecated/                      # Deprecated monorepo-wide scripts
    └── DEPRECATED.md
```

---

## Script Inventory and Migration Plan

### Web Scripts (6 scripts from web/scripts/)

| Current Location | New Location | Purpose |
|-----------------|--------------|---------|
| `web/scripts/analyze-bundle.sh` | `scripts/web/build/analyze-bundle.sh` | Webpack bundle analysis |
| `web/scripts/verify-build.sh` | `scripts/web/build/verify-build.sh` | Build verification |
| `web/scripts/verify-deployment.sh` | `scripts/web/deployment/verify-deployment.sh` | Deployment health checks |
| `web/scripts/run-visual-regression.sh` | `scripts/web/testing/run-visual-regression.sh` | Visual regression tests |
| `web/scripts/test-accessibility.sh` | `scripts/web/testing/test-accessibility.sh` | A11y compliance checks |
| `web/scripts/deploy-web.sh` | `scripts/web/deployment/deploy-web.sh` | Frontend deployment |

**Migration Status:** 📋 Pending

---

### Mobile Scripts (5 scripts from mobile-app/, scripts/)

| Current Location | New Location | Purpose |
|-----------------|--------------|---------|
| `mobile-app/setup-xcode.sh` | `scripts/mobile/ios/setup-xcode.sh` | Xcode environment setup |
| `scripts/deploy-ios.sh` | `scripts/mobile/ios/deploy-ios.sh` | iOS deployment |
| `scripts/build-ios.sh` | `scripts/mobile/ios/build-ios.sh` | iOS build process |
| `scripts/mobile-common.sh` | `scripts/mobile/shared/mobile-common.sh` | Shared mobile utilities |

**Migration Status:** 📋 Pending

---

### TV Platform Scripts (6 scripts from tizen/, webos/, scripts/)

| Current Location | New Location | Purpose |
|-----------------|--------------|---------|
| `scripts/tvos-localization-audit.sh` | `scripts/tv-platforms/tvos/localization-audit.sh` | tvOS i18n audit |
| `tizen/deploy.sh` | `scripts/tv-platforms/tizen/deploy.sh` | Tizen deployment |
| `tizen/package-tizen.sh` | `scripts/tv-platforms/tizen/package-tizen.sh` | Tizen packaging |
| `tizen/verify-tizen.sh` | `scripts/tv-platforms/tizen/verify-tizen.sh` | Tizen verification |
| `webos/package-webos.sh` | `scripts/tv-platforms/webos/package-webos.sh` | WebOS packaging |

**Migration Status:** 📋 Pending

---

### Infrastructure Scripts (10 scripts from deployment/scripts/, backend-olorin/)

| Current Location | New Location | Purpose |
|-----------------|--------------|---------|
| `deployment/scripts/quick-deploy.sh` | `scripts/infrastructure/deployment/quick-deploy.sh` | Fast deployment |
| `backend-olorin/DEPLOY.sh` | `scripts/infrastructure/deployment/DEPLOY.sh` | Phase 1A production deploy |
| `backend-olorin/VERIFY.sh` | `scripts/infrastructure/deployment/VERIFY.sh` | Phase 1B verification |
| `deployment/scripts/setup_gcp_secrets.sh` | `scripts/infrastructure/secrets/setup_gcp_secrets.sh` | GCP Secret Manager setup |
| `scripts/setup-git-secrets.sh` | `scripts/infrastructure/secrets/setup-git-secrets.sh` | Git secrets scanning |
| `backend/scripts/production/deployment/retrieve_secrets.sh` | `scripts/infrastructure/secrets/retrieve-secrets.sh` | Secret retrieval |
| `deployment/scripts/create-build-trigger.sh` | `scripts/infrastructure/ci/create-build-trigger.sh` | Cloud Build triggers |
| `deployment/scripts/setup_gcs_production.sh` | `scripts/infrastructure/ci/setup_gcs_production.sh` | GCS production setup |

**Migration Status:** 📋 Pending

---

### Shared/Cross-Platform Scripts (5 scripts from root)

| Current Location | New Location | Purpose |
|-----------------|--------------|---------|
| `migrate.sh` | `scripts/shared/style-migration/migrate.sh` | Stylesheet migration |
| `convert-stylesheet-to-tailwind.sh` | `scripts/shared/style-migration/convert-stylesheet-to-tailwind.sh` | CSS → Tailwind |
| `fix_tailwind_classes.py` | `scripts/shared/style-migration/fix_tailwind_classes.py` | Tailwind fixes |
| `migrate_styles.py` | `scripts/shared/style-migration/migrate_styles.py` | Style migration |
| `SETUP_COMMANDS.sh` | `scripts/shared/setup/SETUP_COMMANDS.sh` | Environment setup |

**Migration Status:** 📋 Pending

---

### Backend Scripts (Already Organized)

| Current Location | New Location | Status |
|-----------------|--------------|--------|
| `backend/scripts/production/` | `scripts/backend/production/` | ✅ Organized |
| `backend/scripts/utilities/` | `scripts/backend/utilities/` | ✅ Organized |
| `backend/scripts/migrations/` | `scripts/backend/migrations/` | ✅ Organized |
| `backend/scripts/config/` | `scripts/backend/config/` | ✅ Organized |

**Migration Status:** ✅ Complete (will be moved to `scripts/backend/`)

---

## Backward Compatibility Strategy

### Symlinks at Original Locations

**Web Scripts:**
```bash
# In web/scripts/
ln -s ../../scripts/web/build/analyze-bundle.sh analyze-bundle.sh
ln -s ../../scripts/web/deployment/verify-deployment.sh verify-deployment.sh
# ... (all web scripts)
```

**Mobile Scripts:**
```bash
# In mobile-app/
ln -s ../scripts/mobile/ios/setup-xcode.sh setup-xcode.sh

# In scripts/
ln -s ../scripts/mobile/ios/deploy-ios.sh deploy-ios.sh
```

**Infrastructure Scripts:**
```bash
# In deployment/scripts/
ln -s ../../scripts/infrastructure/deployment/quick-deploy.sh quick-deploy.sh
ln -s ../../scripts/infrastructure/secrets/setup_gcp_secrets.sh setup_gcp_secrets.sh

# In backend-olorin/
ln -s ../scripts/infrastructure/deployment/DEPLOY.sh DEPLOY.sh
ln -s ../scripts/infrastructure/deployment/VERIFY.sh VERIFY.sh
```

**TV Platform Scripts:**
```bash
# In tizen/
ln -s ../scripts/tv-platforms/tizen/deploy.sh deploy.sh
ln -s ../scripts/tv-platforms/tizen/package-tizen.sh package-tizen.sh

# In webos/
ln -s ../scripts/tv-platforms/webos/package-webos.sh package-webos.sh
```

### Backward Compatibility Period

- **Duration:** 90 days (Q1 2026)
- **Removal Date:** Q2 2026 (planned)
- **Documentation:** DEPRECATED.md at each old location

---

## Configuration Management

### New: monorepo-paths.env.example

```bash
# scripts/config/monorepo-paths.env.example

# Project root (auto-detected)
PROJECT_ROOT="${PROJECT_ROOT:-$(git rev-parse --show-toplevel)}"

# Platform directories
BACKEND_DIR="${PROJECT_ROOT}/backend"
WEB_DIR="${PROJECT_ROOT}/web"
MOBILE_APP_DIR="${PROJECT_ROOT}/mobile-app"
TIZEN_DIR="${PROJECT_ROOT}/tizen"
WEBOS_DIR="${PROJECT_ROOT}/webos"
TVOS_APP_DIR="${PROJECT_ROOT}/tvos-app"

# Script directories
SCRIPTS_ROOT="${PROJECT_ROOT}/scripts"
BACKEND_SCRIPTS="${SCRIPTS_ROOT}/backend"
WEB_SCRIPTS="${SCRIPTS_ROOT}/web"
MOBILE_SCRIPTS="${SCRIPTS_ROOT}/mobile"
TV_SCRIPTS="${SCRIPTS_ROOT}/tv-platforms"
INFRA_SCRIPTS="${SCRIPTS_ROOT}/infrastructure"
SHARED_SCRIPTS="${SCRIPTS_ROOT}/shared"

# Build output directories
BUILD_DIR="${BUILD_DIR:-${PROJECT_ROOT}/build}"
DIST_DIR="${DIST_DIR:-${PROJECT_ROOT}/dist}"

# Deployment
DEPLOYMENT_REGION="${DEPLOYMENT_REGION:-us-central1}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-staging}"
```

---

## Monorepo-Wide Script Discovery

### New: find-all-scripts.sh

```bash
#!/bin/bash
# =============================================================================
# Monorepo-Wide Script Discovery Utility
# =============================================================================
#
# Purpose: Find scripts across all platforms in the monorepo
#
# Usage:
#   ./find-all-scripts.sh [platform] [search_term]
#   ./find-all-scripts.sh --list-platforms
#   ./find-all-scripts.sh --recent
#   ./find-all-scripts.sh backend backup
#   ./find-all-scripts.sh web deploy
#
# =============================================================================

show_help() {
    cat << 'EOF'
Monorepo-Wide Script Discovery

Usage:
  ./find-all-scripts.sh [platform] [search_term]
  ./find-all-scripts.sh --list-platforms
  ./find-all-scripts.sh --recent

Platforms:
  backend          Backend/server scripts
  web              Frontend/web scripts
  mobile           Mobile app scripts (iOS/Android)
  tv               TV platform scripts (tvOS/Tizen/WebOS)
  infrastructure   Cross-service infrastructure
  shared           Cross-platform utilities
  all              Search all platforms (default)

Examples:
  # Find all backend backup scripts
  ./find-all-scripts.sh backend backup

  # Find web deployment scripts
  ./find-all-scripts.sh web deploy

  # Find all scripts modified recently
  ./find-all-scripts.sh --recent

  # List all platforms
  ./find-all-scripts.sh --list-platforms
EOF
}

list_platforms() {
    echo "Available Platforms:"
    echo ""
    echo "📦 backend          - Backend/server scripts"
    echo "🌐 web              - Frontend/web scripts"
    echo "📱 mobile           - Mobile app scripts (iOS/Android)"
    echo "📺 tv               - TV platform scripts (tvOS/Tizen/WebOS)"
    echo "🏗️  infrastructure   - Cross-service infrastructure"
    echo "🔧 shared           - Cross-platform utilities"
}

show_recent() {
    echo "Recently Modified Scripts (Last 7 Days):"
    echo ""

    find "$PROJECT_ROOT/scripts" \( -name "*.sh" -o -name "*.py" \) -type f -mtime -7 \
        -not -path "*/deprecated/*" \
        -not -path "*/__pycache__/*" \
        | while read -r file; do
            rel_path="${file#$PROJECT_ROOT/scripts/}"
            platform=$(echo "$rel_path" | cut -d'/' -f1)
            mod_time=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null)
            echo "  [$platform] $rel_path  ($mod_time)"
        done
}

search_scripts() {
    local platform="$1"
    local search_term="$2"

    echo "Searching for '$search_term' in $platform scripts..."
    echo ""

    local search_path="$PROJECT_ROOT/scripts"
    if [ "$platform" != "all" ]; then
        search_path="$PROJECT_ROOT/scripts/$platform"
    fi

    find "$search_path" \( -name "*$search_term*.sh" -o -name "*$search_term*.py" \) -type f \
        -not -path "*/deprecated/*" \
        | while read -r file; do
            rel_path="${file#$PROJECT_ROOT/scripts/}"
            platform_name=$(echo "$rel_path" | cut -d'/' -f1)
            echo "  [$platform_name] $rel_path"

            # Extract description
            if [[ "$file" == *.sh ]]; then
                desc=$(grep -m 1 "^# Purpose:" "$file" | sed 's/^# Purpose: //')
            elif [[ "$file" == *.py ]]; then
                desc=$(grep -A 1 '"""' "$file" | tail -1 | sed 's/^ *//')
            fi

            if [ -n "$desc" ]; then
                echo "      → $desc"
            fi
        done
}

# Main
PROJECT_ROOT="$(git rev-parse --show-toplevel)"

case "${1:-all}" in
    --help|-h)
        show_help
        ;;
    --list-platforms|-l)
        list_platforms
        ;;
    --recent|-r)
        show_recent
        ;;
    backend|web|mobile|tv|infrastructure|shared)
        search_scripts "$1" "${2:-}"
        ;;
    all|*)
        search_scripts "all" "${1:-}"
        ;;
esac
```

---

## Implementation Phases

### Phase 1: Root Structure Creation (Day 1)

- [ ] Create `scripts/` directory at project root
- [ ] Create platform subdirectories (backend, web, mobile, tv-platforms, infrastructure, shared)
- [ ] Create `scripts/config/monorepo-paths.env.example`
- [ ] Create `scripts/README.md` (monorepo-wide documentation)
- [ ] Create `scripts/find-all-scripts.sh` (discovery utility)

### Phase 2: Backend Migration (Day 1-2)

- [ ] Move `backend/scripts/` → `scripts/backend/`
- [ ] Update all import paths in Python scripts
- [ ] Create backward compatibility symlink: `backend/scripts` → `../scripts/backend`
- [ ] Test all backend scripts still execute
- [ ] Update backend-specific documentation

### Phase 3: Web Scripts Migration (Day 2-3)

- [ ] Create `scripts/web/` structure (build, deployment, testing)
- [ ] Move web scripts from `web/scripts/` to organized locations
- [ ] Create backward compatibility symlinks in `web/scripts/`
- [ ] Create `scripts/web/README.md`
- [ ] Update web build scripts to use new paths

### Phase 4: Mobile Scripts Migration (Day 3-4)

- [ ] Create `scripts/mobile/` structure (ios, android, shared)
- [ ] Move mobile scripts to organized locations
- [ ] Create backward compatibility symlinks
- [ ] Create `scripts/mobile/README.md`
- [ ] Update mobile build workflows

### Phase 5: TV Platform Scripts Migration (Day 4-5)

- [ ] Create `scripts/tv-platforms/` structure (tvos, tizen, webos)
- [ ] Move TV platform scripts to organized locations
- [ ] Create backward compatibility symlinks
- [ ] Create `scripts/tv-platforms/README.md`
- [ ] Update TV platform build workflows

### Phase 6: Infrastructure Scripts Migration (Day 5-6)

- [ ] Create `scripts/infrastructure/` structure (deployment, secrets, ci)
- [ ] Move infrastructure scripts to organized locations
- [ ] Create backward compatibility symlinks
- [ ] Create `scripts/infrastructure/README.md`
- [ ] Consolidate duplicate deployment scripts

### Phase 7: Shared Scripts Migration (Day 6)

- [ ] Create `scripts/shared/` structure (style-migration, setup)
- [ ] Move shared scripts to organized locations
- [ ] Create backward compatibility symlinks
- [ ] Create `scripts/shared/README.md`

### Phase 8: CI/CD Updates (Day 7)

- [ ] Update all GitHub Actions workflows with new script paths
- [ ] Update deployment documentation
- [ ] Update CONTRIBUTING.md with monorepo-wide guidelines
- [ ] Test full CI/CD pipeline

### Phase 9: Documentation & Discovery (Day 8)

- [ ] Complete all platform-specific README.md files
- [ ] Test `find-all-scripts.sh` discovery utility
- [ ] Create migration guide for developers
- [ ] Update main CLAUDE.md with new structure

### Phase 10: Validation & Testing (Day 9)

- [ ] Run syntax validation on all scripts
- [ ] Test backward compatibility symlinks
- [ ] Verify all CI/CD workflows pass
- [ ] Manual smoke test of critical scripts across all platforms

---

## GitHub Actions Updates

### Workflows to Update (14+ workflows)

**Backend:**
- `.github/workflows/deploy-production.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/ci.yml`

**Web:**
- `.github/workflows/web-build.yml`
- `.github/workflows/web-deploy.yml`

**Mobile:**
- `.github/workflows/ios-build.yml`
- `.github/workflows/android-build.yml`

**TV Platforms:**
- `.github/workflows/tizen-build.yml`
- `.github/workflows/webos-build.yml`
- `.github/workflows/tvos-build.yml`

**Infrastructure:**
- `.github/workflows/deploy-translation-worker.yml`
- `.github/workflows/security-scan.yml`

### Update Pattern

```yaml
# Before:
- name: Run script
  run: |
    cd backend/scripts
    ./production/deployment/smoke_tests.sh

# After:
- name: Run script
  run: |
    cd scripts/backend
    ./production/deployment/smoke_tests.sh
```

---

## Safety Measures

### Comprehensive Backup

```bash
# Before starting migration
cd /Users/olorin/Documents/olorin/olorin-media
tar -czf monorepo-scripts-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
    backend/scripts/ \
    web/scripts/ \
    mobile-app/*.sh \
    tizen/*.sh \
    webos/*.sh \
    deployment/scripts/ \
    backend-olorin/*.sh \
    scripts/*.sh \
    *.sh \
    *.py
```

### Rollback Plan

**Level 1: Symlink Rollback**
If symlinks cause issues:
```bash
# Remove symlinks
find . -type l -name "*.sh" -delete

# Restore original files from backup
tar -xzf monorepo-scripts-backup-TIMESTAMP.tar.gz
```

**Level 2: Full Rollback**
If migration causes critical issues:
```bash
# Remove new scripts/ directory
rm -rf scripts/

# Restore all original locations
tar -xzf monorepo-scripts-backup-TIMESTAMP.tar.gz

# Revert git changes
git checkout -- .github/workflows/
```

---

## Expected Outcomes

### Before
- ❌ Scripts scattered across 8+ directories
- ❌ No unified organization or discovery
- ❌ Platform-specific scripts mixed with infrastructure
- ❌ Inconsistent naming and structure
- ❌ Difficult to find relevant scripts
- ❌ No cross-platform documentation

### After
- ✅ Unified `scripts/` root directory
- ✅ Clear platform-based organization (6 platforms)
- ✅ Monorepo-wide discovery utility
- ✅ Consistent structure across all platforms
- ✅ Comprehensive documentation per platform
- ✅ Easy script discovery by platform or purpose
- ✅ Backward compatibility via symlinks (90 days)
- ✅ Configuration-driven across all platforms

### Key Metrics
- **Total Scripts:** 50+ scripts organized
- **Platforms:** 6 distinct platforms
- **Documentation:** 7+ README files (1 per platform + main)
- **Symlinks:** 50+ backward compatibility symlinks
- **Discovery Utility:** 1 monorepo-wide tool
- **CI/CD Updates:** 14+ workflow files

---

## Success Criteria

- [ ] All scripts moved to appropriate platform directories
- [ ] Backward compatibility symlinks created
- [ ] All CI/CD workflows updated and passing
- [ ] Platform-specific documentation complete
- [ ] Discovery utility functional
- [ ] No hardcoded paths in any scripts
- [ ] All scripts pass syntax validation
- [ ] Full monorepo test suite passes
- [ ] Developer migration guide complete

---

## Timeline

**Total Duration:** 9 days (1.8 weeks)

- **Days 1-2:** Root structure + backend migration
- **Days 2-5:** Platform migrations (web, mobile, TV)
- **Days 5-6:** Infrastructure + shared scripts
- **Days 7-8:** CI/CD + documentation
- **Day 9:** Validation + testing

**Target Completion:** February 1, 2026

---

## Post-Implementation Tasks

1. **Team Communication**
   - Notify team of new script organization
   - Share monorepo-wide discovery utility
   - Provide migration guide for existing workflows

2. **Monitoring**
   - Monitor for broken references to old locations
   - Track usage of discovery utility
   - Collect feedback for improvements

3. **Documentation Updates**
   - Update main CLAUDE.md with new structure
   - Update deployment guides
   - Update onboarding documentation

4. **Symlink Removal**
   - Plan removal for Q2 2026 (after 90-day period)
   - Create deprecation warnings in Q1 2026
   - Final cleanup in April 2026

---

## Completion Status

**Current Status:** 📋 PLANNING COMPLETE, awaiting user approval

**Next Step:** Begin Phase 1 (Root Structure Creation) upon user approval
