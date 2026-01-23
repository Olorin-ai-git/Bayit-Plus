# Shared Scripts

Cross-platform utility scripts used across multiple platforms.

---

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Style Migration Scripts](#style-migration-scripts)
- [Setup Scripts](#setup-scripts)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)

---

## Overview

This directory contains scripts for cross-platform operations including:
- **Style migration** - Stylesheet to Tailwind CSS migration tools
- **Setup scripts** - Development environment setup utilities

**Note:** This directory structure is prepared for future shared scripts. Currently no scripts exist but the organization is ready.

---

## Directory Structure

```
shared/
├── README.md                          # This file
├── style-migration/                   # Stylesheet migration tools
│   ├── migrate.sh                    # Main migration script (future)
│   ├── convert-stylesheet-to-tailwind.sh  # StyleSheet → Tailwind (future)
│   ├── fix_tailwind_classes.py       # Fix Tailwind usage (future)
│   └── migrate_styles.py             # Style migration utility (future)
└── setup/                             # Environment setup
    └── SETUP_COMMANDS.sh             # Development environment setup (future)
```

---

## Style Migration Scripts

### migrate.sh (Future)

**Purpose:** Main stylesheet to Tailwind CSS migration orchestrator.

**Planned Features:**
- Detect StyleSheet.create() usage
- Convert to Tailwind classes
- Handle inline styles
- Update imports
- Generate migration report

**Usage:**
```bash
cd scripts/shared
./style-migration/migrate.sh path/to/component.tsx
```

---

### convert-stylesheet-to-tailwind.sh (Future)

**Purpose:** Convert React Native StyleSheet to Tailwind CSS classes.

**Planned Features:**
- Parse StyleSheet.create() definitions
- Map to equivalent Tailwind classes
- Handle flex layouts
- Convert colors and spacing
- Update component usage

**Usage:**
```bash
cd scripts/shared
./style-migration/convert-stylesheet-to-tailwind.sh shared/screens/admin/
```

**Example Conversion:**
```typescript
// Before
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  }
});

<View style={styles.container}>

// After
<View className="flex-1 bg-black p-4">
```

---

### fix_tailwind_classes.py (Future)

**Purpose:** Fix incorrect or deprecated Tailwind CSS classes.

**Planned Features:**
- Detect deprecated Tailwind classes
- Update to current syntax
- Fix class ordering
- Validate Tailwind config
- Remove unused classes

**Usage:**
```bash
cd scripts/shared
python style-migration/fix_tailwind_classes.py --file component.tsx
```

---

### migrate_styles.py (Future)

**Purpose:** Python-based style migration with advanced pattern matching.

**Planned Features:**
- Complex style transformations
- Batch processing
- Custom conversion rules
- Rollback capability
- Migration report generation

**Usage:**
```bash
cd scripts/shared
python style-migration/migrate_styles.py --input src/ --output migrated/
```

---

## Setup Scripts

### SETUP_COMMANDS.sh (Future)

**Purpose:** Complete development environment setup for all platforms.

**Planned Features:**
- Install required tools (Node.js, Python, Poetry)
- Configure git hooks
- Setup pre-commit checks
- Install platform SDKs
- Configure environment variables
- Verify installations

**Usage:**
```bash
cd scripts/shared
./setup/SETUP_COMMANDS.sh
```

**Setup Steps:**
1. Detect operating system
2. Install package managers (Homebrew, apt)
3. Install Node.js and npm
4. Install Python and Poetry
5. Install platform SDKs (Xcode, Android SDK)
6. Configure git (user, hooks, secrets)
7. Setup environment files
8. Verify all installations

---

## Configuration

### Global Configuration

**File:** `scripts/config/monorepo-paths.env.example`

**Shared Variables:**
```bash
SHARED_DIR="${PROJECT_ROOT}/shared"
PYTHON_BIN_PATH="${PYTHON_BIN_PATH:-${HOME}/Library/Python/3.9/bin}"
```

### Style Migration Configuration

```bash
# Tailwind config path
TAILWIND_CONFIG="${PROJECT_ROOT}/web/tailwind.config.js"

# Migration options
BACKUP_BEFORE_MIGRATE=true
DRY_RUN=false
```

---

## Usage Examples

### Style Migration Workflow (Future)

```bash
# 1. Backup current code
git checkout -b style-migration

# 2. Run migration on directory
cd scripts/shared
./style-migration/migrate.sh shared/screens/

# 3. Fix any issues
python style-migration/fix_tailwind_classes.py --directory shared/screens/

# 4. Verify changes
cd ../../web
npm run lint
npm test

# 5. Commit if successful
git add .
git commit -m "style: migrate shared/screens to Tailwind CSS"
```

### Development Setup (Future)

```bash
# Fresh machine setup
cd scripts/shared
./setup/SETUP_COMMANDS.sh

# Verify setup
which node python poetry
node --version
python --version
poetry --version
```

---

## CI/CD Integration (Future)

```yaml
# .github/workflows/style-migration.yml
- name: Run Style Migration
  run: |
    cd scripts/shared
    ./style-migration/migrate.sh src/

- name: Fix Tailwind Classes
  run: |
    cd scripts/shared
    python style-migration/fix_tailwind_classes.py --directory src/
```

---

## Backward Compatibility

When shared scripts are added, symlinks will be created at original locations during transition period (90 days):

```bash
# Future symlinks
migrate.sh → scripts/shared/style-migration/migrate.sh
SETUP_COMMANDS.sh → scripts/shared/setup/SETUP_COMMANDS.sh
```

---

## Contributing

### Adding New Shared Scripts

1. **Determine category:** style-migration or setup
2. **Place in correct subdirectory**
3. **Follow naming conventions:**
   - Shell scripts: lowercase with hyphens (`script-name.sh`)
   - Python scripts: lowercase with underscores (`script_name.py`)
4. **Add comprehensive header documentation**
5. **Use configuration from `monorepo-paths.env`**
6. **Add to this README**

### Script Template

```bash
#!/bin/bash
# =============================================================================
# Script Name - Brief Description
# =============================================================================
#
# Purpose: Detailed purpose explanation
#
# Usage:
#   ./script-name.sh [options]
#
# Environment Variables:
#   VARIABLE_NAME    Description (default: value)
#
# Examples:
#   # Example usage
#   ./script-name.sh
#
# =============================================================================

set -e
set -u

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${SCRIPT_DIR}/config/monorepo-paths.env"

# Main logic here
echo "Script functionality..."
```

---

## Questions?

- **Script Organization:** See `scripts/README.md`
- **Configuration:** See `scripts/config/monorepo-paths.env.example`
- **Monorepo Scripts:** Run `scripts/find-all-scripts.sh shared`

---

## Version History

- **2026-01-23**: Initial shared scripts structure
  - Created directory organization for style-migration, setup
  - Prepared for future shared scripts
  - Documentation framework established
