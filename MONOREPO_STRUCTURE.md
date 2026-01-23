# Olorin Monorepo Structure

This document explains the organization and structure of the Olorin monorepo, including the rationale behind the fraud/ directory and path resolution system.

## Organization Principles

### Platform Separation
Each platform is self-contained with independent:
- Source code (backend/frontend)
- Configuration (CLAUDE.md, configs)
- Testing infrastructure
- Deployment pipelines

### Git Subtrees
Major platforms are managed as git subtrees for independent development:
- `olorin-fraud/` - Fraud Detection Platform
- `olorin-media/bayit-plus/` - Bayit+ Streaming
- `olorin-media/israeli-radio-manager/` - Radio Manager
- `olorin-cv/cvplus/` - CV Plus
- `olorin-omen/ios-app/` - Omen iOS App

Git subtrees allow us to:
- Develop platforms independently
- Sync with upstream repositories
- Maintain separate histories
- Enable modular deployment

## The fraud/ Directory

### Why It Exists

The `fraud/` directory groups fraud-specific assets that cannot live inside the `olorin-fraud/` subtree:

```
fraud/
├── specs/          # Feature specifications (documents, not code)
├── tests/          # Integration tests that span multiple services
├── scripts/        # Automation specific to fraud workflows
├── lib/            # Shared Python utilities (paths.py)
└── README.md       # Fraud platform organization
```

### Why Not in the Subtree?

These assets live outside the subtree because:

1. **Git History**: Moving them into subtree breaks git history and sync capabilities
2. **Cross-Platform**: They reference or test multiple platforms
3. **Development Artifacts**: They're planning/testing artifacts, not shipped code
4. **Subtree Integrity**: Keeping them separate maintains clean subtree sync

### Working with Fraud Platform

All fraud work should reference `fraud/`:

```bash
# View specs
cd fraud/specs/001-arranging-investigation-files/

# Run integration tests
cd fraud/tests/
poetry run pytest integration/

# Access backend code (two equivalent ways)
cd olorin-fraud/backend/
# or
cd fraud/backend/  # if using symlinks (not recommended for security)
```

## Ecosystem-Wide Infrastructure

These directories serve ALL platforms:

### scripts/common/
Shared shell utilities:
- `paths.sh` - Path resolution with marker-based root detection
- `colors.sh` - Terminal color utilities
- `logging.sh` - Structured logging functions

### scripts/deployment/
Multi-platform deployment orchestration:
- Platform-specific deployment scripts
- Shared deployment utilities
- CI/CD integration

### scripts/development/
Development environment setup:
- `start_olorin.sh` - Start all services
- `run-server.sh` - Backend development server
- `run-frontend.sh` - Frontend development server

### deployment/
Infrastructure and CI/CD configuration:
- `cloudbuild.yaml` - Google Cloud Build configuration
- `firebase.json` - Firebase hosting configuration
- Terraform/infrastructure scripts

### tools/
Code quality enforcement:
- Reuse guard - Prevents code duplication
- Code generators
- Quality checks

### docs/
Cross-platform documentation:
- Architecture guides
- API documentation
- Development guides
- Security policies

## Path Resolution System

The monorepo uses a secure path resolution system to avoid hardcoded paths.

### Security Features

- **Marker-based**: Uses `.olorin-root` file for reliable detection
- **No symlinks**: Prevents path traversal vulnerabilities (CWE-59, CWE-61)
- **Fail-fast**: Validates paths on initialization
- **Cross-platform**: Works on macOS, Linux, Windows

### Shell Scripts

```bash
#!/bin/bash
# Source path utilities
source "$OLORIN_ROOT/scripts/common/paths.sh"

# Available variables:
# - OLORIN_ROOT: Repository root
# - FRAUD_ROOT: olorin-fraud directory
# - FRAUD_BACKEND: olorin-fraud/backend
# - FRAUD_FRONTEND: olorin-fraud/frontend
# - FRAUD_SPECS: fraud/specs
# - FRAUD_TESTS: fraud/tests

cd "$FRAUD_BACKEND"
```

### Python Scripts

```python
# Import path utilities
from fraud.lib.paths import OLORIN_ROOT, FRAUD_BACKEND

# Available paths:
# - OLORIN_ROOT: Repository root
# - FRAUD_ROOT: olorin-fraud directory
# - FRAUD_BACKEND: olorin-fraud/backend
# - FRAUD_FRONTEND: olorin-fraud/frontend
# - FRAUD_SPECS: fraud/specs
# - FRAUD_TESTS: fraud/tests

os.chdir(FRAUD_BACKEND)
```

### The .olorin-root Marker

The root marker file serves as a reliable anchor for path detection:

```bash
$ cat .olorin-root
Olorin monorepo root marker - do not delete
```

This file:
- **Never moves**: Always at repository root
- **Secure**: Prevents path traversal attacks
- **Reliable**: Works from any subdirectory
- **Simple**: No complex heuristics needed

## Working with the Monorepo

### Fraud Platform Development

```bash
# View specs
cd fraud/specs/

# Run tests
cd fraud/tests/
poetry run pytest

# Backend development
cd olorin-fraud/backend/
poetry run uvicorn app.main:app --reload

# Frontend development
cd olorin-fraud/frontend/
npm start
```

### Media Platform Development

```bash
cd olorin-media/bayit-plus/
npm run dev
```

### Ecosystem Scripts

```bash
# Start all services
./scripts/development/start_olorin.sh

# Deploy specific platform
./scripts/deployment/bayit-plus/deploy_all.sh

# Run quality checks
./scripts/tools/reuse-guard.sh
```

## Git Subtree Management

### Pull Upstream Changes

```bash
# Sync all subtrees
npm run subtree:pull

# Or pull specific subtree
git subtree pull --prefix=olorin-fraud fraud-upstream main --squash
```

### Push Changes to Upstream

```bash
# Push all changes
npm run subtree:push

# Or push specific subtree
git subtree push --prefix=olorin-fraud fraud-upstream main
```

### Adding New Subtree

```bash
git remote add fraud-upstream https://github.com/org/fraud-detection.git
git subtree add --prefix=olorin-fraud fraud-upstream main --squash
```

## CI/CD Integration

### Path Validation in CI

The path resolution system includes CI/CD validation:

```yaml
# cloudbuild.yaml
steps:
  - name: 'python:3.11-slim'
    dir: 'olorin-fraud/backend'  # Correct path
    entrypoint: 'bash'
    args: ['-c', 'source scripts/common/paths.sh && pytest']
```

### Pre-commit Hooks

Prevent hardcoded paths from entering the codebase:

```bash
# .githooks/pre-commit
# Blocks commits containing hardcoded paths
# Install: git config core.hooksPath .githooks
```

## Migration from Old Structure

### Old Paths → New Paths

| Old Path | New Path | Notes |
|----------|----------|-------|
| `specs/` | `fraud/specs/` | Fraud-specific specifications |
| `tests/` | `fraud/tests/` | Fraud integration tests |
| `scripts/investigation/` | `fraud/scripts/investigation/` | Fraud automation |
| `olorin-server/` | `olorin-fraud/backend/` | Backend code |
| `olorin-front/` | `olorin-fraud/frontend/` | Frontend code |
| `scripts/` | `scripts/` | Ecosystem-wide only |

### Hardcoded Path Cleanup

Run the inventory script to find remaining hardcoded paths:

```bash
./scripts/common/inventory-hardcoded-paths-fast.sh
```

Expected: 0 occurrences (down from 2,896)

## Best Practices

### For Shell Scripts

```bash
# ✅ Good: Use path utilities
source "$OLORIN_ROOT/scripts/common/paths.sh"
cd "$FRAUD_BACKEND"

# ❌ Bad: Hardcoded paths
cd /Users/olorin/Documents/olorin/olorin-server
cd ../olorin-fraud/backend  # Relative paths are fragile
```

### For Python Scripts

```python
# ✅ Good: Import path utilities
from fraud.lib.paths import FRAUD_BACKEND
os.chdir(FRAUD_BACKEND)

# ❌ Bad: Hardcoded paths
os.chdir("/Users/olorin/Documents/olorin/olorin-fraud/backend")
os.chdir("../../olorin-fraud/backend")  # Fragile
```

### For Configuration Files

```yaml
# ✅ Good: Relative to root
dir: 'olorin-fraud/backend'

# ❌ Bad: Absolute paths
dir: '/Users/olorin/Documents/olorin/olorin-fraud/backend'
```

## Troubleshooting

### "Could not find .olorin-root marker"

You're not in the Olorin repository. Navigate to the repo root:

```bash
cd /path/to/olorin
```

### "Required path does not exist"

The fraud platform may not be initialized. Run:

```bash
npm install  # Install all dependencies
```

### Path resolution fails in CI

Ensure cloudbuild.yaml uses correct paths:

```yaml
steps:
  - name: 'python:3.11-slim'
    dir: 'olorin-fraud/backend'  # Not 'olorin-server'
```

## Additional Resources

- **Fraud Platform**: `/fraud/README.md`
- **Path Utilities**: `/scripts/common/paths.sh`, `/fraud/lib/paths.py`
- **Main README**: `/README.md`
- **Platform CLAUDE.md**: Individual platform requirements

## Version History

- **2026-01-23**: Initial monorepo structure documentation
- **2026-01-23**: Added fraud/ directory organization
- **2026-01-23**: Implemented secure path resolution system
