# Olorin Fraud Detection Platform

This directory contains fraud-specific assets that are part of the fraud platform but live outside the olorin-fraud/ git subtree for organizational reasons.

## Structure

- `specs/` - Feature specifications for fraud detection
- `tests/` - Integration tests for fraud platform
- `scripts/` - Fraud-specific automation scripts
- `lib/` - Shared Python utilities (paths.py)
- `docs-archive/` - Archived fraud-specific documentation

## Why These Live Here

The olorin-fraud/ directory is a git subtree managed separately. These assets cannot be moved into the subtree without breaking git history and sync capabilities. This virtual directory provides clear organization while maintaining subtree integrity.

## Working with the Fraud Platform

All fraud development should reference assets under `fraud/`:

### Directory References
- **Specifications**: `fraud/specs/`
- **Integration Tests**: `fraud/tests/`
- **Backend Code**: `olorin-fraud/backend/` (explicit path, no symlinks)
- **Frontend Code**: `olorin-fraud/frontend/` (explicit path, no symlinks)
- **Shared Utilities**: `fraud/lib/`
- **Automation Scripts**: `fraud/scripts/`

### Path Resolution

Use the provided utilities for consistent path resolution:

**Shell Scripts:**
```bash
source "$OLORIN_ROOT/scripts/common/paths.sh"
cd "$FRAUD_BACKEND"
```

**Python Scripts:**
```python
from fraud.lib.paths import OLORIN_ROOT, FRAUD_BACKEND
os.chdir(FRAUD_BACKEND)
```

### Security

This organization eliminates security vulnerabilities (CWE-59, CWE-61) by:
- Using marker-based root detection (no symlinks)
- Validating all paths before use (fail-fast)
- Preventing path traversal attacks

## Git Subtree Management

The fraud platform backend and frontend are managed as a git subtree:

```bash
# Pull upstream changes
git subtree pull --prefix=olorin-fraud fraud-upstream main --squash

# Push changes upstream
git subtree push --prefix=olorin-fraud fraud-upstream main
```

See repository root documentation for complete subtree workflows.
