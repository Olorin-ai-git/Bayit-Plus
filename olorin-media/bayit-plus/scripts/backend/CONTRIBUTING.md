# Contributing to Backend Scripts

Guide for adding new scripts to the organized script system.

---

## Table of Contents

- [Before Adding a Script](#before-adding-a-script)
- [Script Placement](#script-placement)
- [Script Template](#script-template)
- [Configuration Requirements](#configuration-requirements)
- [Documentation Requirements](#documentation-requirements)
- [Testing Requirements](#testing-requirements)
- [Review Checklist](#review-checklist)

---

## Before Adding a Script

### 1. Check for Existing Functionality

**CRITICAL:** Before creating a new script, verify similar functionality doesn't already exist.

```bash
# Search for existing scripts
cd backend/scripts
find . -name "*.sh" -o -name "*.py" | grep -i "keyword"

# Search script documentation
grep -r "keyword" production/*/README.md
```

**Consolidation Over Duplication:**
- If similar functionality exists, enhance the existing script
- Consider adding a new command/subcommand to existing tools
- Example: Add transformation to `url_migrator.py` instead of creating new script

### 2. Determine Correct Category

Choose the appropriate directory based on script purpose:

| Category | Directory | Purpose |
|----------|-----------|---------|
| **Database** | `production/database/` | Backup, restore, migrations |
| **Deployment** | `production/deployment/` | Server startup, smoke tests, deployment |
| **Audit** | `production/audit/` | Content validation, librarian audits |
| **CI/CD** | `production/ci/` | CI checks, quality gates |
| **Content** | `production/content/` | URL migrations, podcast management |
| **Olorin** | `production/olorin/` | AI platform scripts (embedding, seeding) |
| **Utilities** | `utilities/` | Shared Python modules (not standalone scripts) |
| **Testing** | `testing/` | Test scripts (not for production use) |

---

## Script Placement

### Directory Structure

```
backend/scripts/
├── production/
│   └── [category]/
│       ├── your_script.sh     # Bash scripts
│       ├── your_script.py     # Python scripts
│       └── README.md           # Category documentation
├── utilities/
│   └── your_utility.py         # Shared Python modules
├── config/
│   └── paths.env.example       # Configuration template
└── migrations/
    └── completed/              # Executed migrations only
```

### Naming Conventions

**Bash Scripts:**
- Use lowercase with underscores: `backup_database.sh`
- Verb-first naming: `run_audit.sh`, `deploy_service.sh`
- Be descriptive: `run_comprehensive_audit.sh` vs `audit.sh`

**Python Scripts:**
- Use lowercase with underscores: `url_migrator.py`
- Module-style naming: `migration_registry.py`, `podcast_manager.py`
- No unnecessary prefixes: `content_helpers.py` not `helpers_content.py`

---

## Script Template

### Bash Script Template

```bash
#!/bin/bash
# =============================================================================
# Script Name - Brief Description
# =============================================================================
#
# Purpose: Detailed explanation of what this script does
#
# Usage:
#   ./script_name.sh [options]
#
# Options:
#   --dry-run    Preview changes without executing
#   --verbose    Enable verbose output
#
# Environment Variables:
#   VAR_NAME     Description (default: value)
#
# Examples:
#   # Basic usage
#   ./script_name.sh
#
#   # Dry run mode
#   ./script_name.sh --dry-run
#
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/../../config/paths.env" ]; then
    source "${SCRIPT_DIR}/../../config/paths.env"
fi

# Configuration from environment or defaults
API_URL="${API_URL:-http://localhost:8000}"
DRY_RUN="${DRY_RUN:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function: Print header
print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function: Main logic
main() {
    print_header "Script Name"
    
    echo "Configuration:"
    echo "  API URL: $API_URL"
    echo "  Dry Run: $DRY_RUN"
    echo ""
    
    # Check prerequisites
    if ! command -v some_tool &> /dev/null; then
        echo -e "${RED}Error: some_tool not found${NC}"
        exit 1
    fi
    
    # Main script logic here
    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
    fi
    
    echo -e "${GREEN}✅ Script completed successfully${NC}"
}

# Entry point
main "$@"
```

### Python Script Template

```python
#!/usr/bin/env python3
"""
Script Name - Brief Description

Detailed explanation of what this script does and why it exists.

Usage:
    python script_name.py --option value
    python script_name.py --dry-run

Examples:
    # Basic usage
    python script_name.py --input data.json

    # Dry run mode
    python script_name.py --dry-run
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[3]))

from app.core.database import get_database
from app.core.config import settings

logger = logging.getLogger(__name__)


class ScriptName:
    """
    Class for [script purpose].
    
    Implements [pattern/approach] for [goal].
    """

    def __init__(self):
        """Initialize script with configuration."""
        # Configuration from settings (NO hardcoded values)
        self.api_url = settings.API_URL
        self.dry_run = False

    async def run(self, dry_run: bool = False) -> Dict:
        """
        Main execution method.

        Args:
            dry_run: If True, preview without making changes

        Returns:
            Dictionary with execution results
        """
        self.dry_run = dry_run

        # Use existing database infrastructure
        db = await get_database()

        logger.info("Starting script execution...")

        if dry_run:
            logger.info("DRY RUN MODE - No changes will be made")

        # Main logic here
        results = {
            "status": "success",
            "items_processed": 0,
            "errors": []
        }

        logger.info(f"✅ Script completed: {results}")
        return results


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Script Name - Brief Description",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without executing"
    )

    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()

    # Configure logging
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    try:
        script = ScriptName()
        results = await script.run(dry_run=args.dry_run)
        
        print(f"\n✅ Script completed successfully")
        print(f"Results: {results}")
        
        sys.exit(0)

    except Exception as e:
        logger.error(f"Script failed: {e}", exc_info=True)
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Configuration Requirements

### NO Hardcoded Values

**CRITICAL:** All variable values MUST come from configuration, never hardcoded.

**Forbidden:**
```python
# ❌ WRONG - Hardcoded values
API_URL = "http://localhost:8000"
BUCKET_NAME = "bayit-plus-media"
MAX_RETRIES = 3
```

**Required:**
```python
# ✅ CORRECT - Configuration-driven
from app.core.config import settings

api_url = settings.API_URL
bucket_name = settings.BUCKET_NAME
max_retries = settings.MAX_RETRIES
```

### Configuration Sources (Priority Order)

1. **Environment Variables** - `export VAR_NAME=value`
2. **Configuration Files** - `backend/scripts/config/paths.env`
3. **Settings Module** - `app/core/config.py`
4. **Secret Manager** - For sensitive values (API keys, passwords)

### Add Configuration to settings

If your script needs new configuration:

1. Add to `backend/app/core/config.py`:
   ```python
   YOUR_NEW_SETTING: str = Field(default="default-value", description="Purpose")
   ```

2. Add to `backend/scripts/config/paths.env.example`:
   ```bash
   YOUR_NEW_SETTING="${YOUR_NEW_SETTING:-default-value}"
   ```

3. Document in script header

---

## Documentation Requirements

### 1. Script Header Documentation

Every script MUST have:
- Purpose statement
- Usage examples
- Configuration requirements
- Environment variables
- Prerequisites

### 2. Category README.md

Update `production/[category]/README.md` with:
- Script name and purpose
- Usage examples
- Configuration needed
- Common use cases

### 3. Main README.md

Add to `backend/scripts/README.md` if:
- Script is frequently used
- Script consolidates multiple older scripts
- Script is critical for operations

---

## Testing Requirements

### 1. Syntax Validation

**Bash:**
```bash
bash -n your_script.sh  # Check syntax
shellcheck your_script.sh  # Lint (optional)
```

**Python:**
```bash
python -m py_compile your_script.py  # Check syntax
poetry run black your_script.py  # Format
poetry run mypy your_script.py  # Type check
```

### 2. Dry-Run Mode

All data-modifying scripts MUST implement `--dry-run`:

```bash
# Preview changes
./your_script.sh --dry-run

# Execute changes
./your_script.sh
```

### 3. Manual Testing

Before submitting:
- [ ] Test dry-run mode
- [ ] Test actual execution
- [ ] Test error handling (invalid inputs, missing files)
- [ ] Verify no hardcoded values
- [ ] Check environment variable fallbacks

### 4. Integration Testing

For Python scripts with database:
- [ ] Test with real MongoDB connection
- [ ] Test transaction handling
- [ ] Test rollback capability (if applicable)

---

## Review Checklist

Before submitting your script for review:

### Code Quality
- [ ] No hardcoded values (all from configuration)
- [ ] No duplicate functionality (checked existing scripts)
- [ ] Proper error handling
- [ ] Clear variable names
- [ ] Comments for complex logic

### Configuration
- [ ] Uses existing database infrastructure (`app/core/database.py`)
- [ ] Sources configuration from `paths.env` or `settings`
- [ ] No credentials in code (uses environment variables)
- [ ] Configuration documented in script header

### Documentation
- [ ] Comprehensive header documentation
- [ ] Usage examples in script
- [ ] Category README.md updated
- [ ] Main README.md updated (if appropriate)

### Testing
- [ ] Syntax validation passed
- [ ] Dry-run mode implemented (if modifying data)
- [ ] Manual testing completed
- [ ] Error cases tested

### Security
- [ ] No credentials in command line arguments
- [ ] Credentials from environment variables or secret manager
- [ ] File permissions set correctly (755 for executables)
- [ ] No SQL injection vulnerabilities
- [ ] No command injection vulnerabilities

### Organization
- [ ] Placed in correct category directory
- [ ] Follows naming conventions
- [ ] Executable permission set (`chmod +x`)
- [ ] Shebang line present (bash: `#!/bin/bash`, python: `#!/usr/bin/env python3`)

---

## Example Pull Request

When submitting:

**Title:** `feat(scripts): Add [script name] for [purpose]`

**Description:**
```markdown
## Summary
Add new script for [purpose] in `backend/scripts/production/[category]/`.

## What does this script do?
- [Key functionality 1]
- [Key functionality 2]
- [Key functionality 3]

## Testing
- [x] Syntax validation passed
- [x] Dry-run mode tested
- [x] Actual execution tested
- [x] Error handling verified

## Documentation
- [x] Script header complete
- [x] Category README.md updated
- [x] Configuration documented

## Related Issues
Closes #123
```

---

## Questions?

- **Script organization:** See `backend/scripts/README.md`
- **Configuration:** See `backend/scripts/config/paths.env.example`
- **Existing utilities:** See `backend/scripts/utilities/`
- **Migration tracking:** See `backend/scripts/migrations/MIGRATION_HISTORY.md`

---

## Consolidated Script Philosophy

This project follows a **consolidation-over-duplication** philosophy:

- ✅ **One script, multiple transformations** (e.g., url_migrator.py with transformation types)
- ✅ **Strategy pattern** for variants (e.g., podcast_manager.py with source types)
- ✅ **Configuration-driven** transformations (no hardcoded rules)
- ❌ **NO individual scripts** for each variation
- ❌ **NO hardcoded values** anywhere

**When to consolidate:**
- Multiple scripts doing similar tasks → Unified tool with subcommands
- Repeated logic across scripts → Shared utility module
- Individual podcast scripts → Unified manager with source strategies
- Individual URL migrations → Unified migrator with transformation types
