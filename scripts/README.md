# Olorin Ecosystem Scripts

**Ecosystem-wide scripts only.** Platform-specific scripts live in their respective directories:

- **Fraud**: `/fraud/scripts/`
- **Media (Bayit+)**: `/olorin-media/bayit-plus/backend/scripts/`
- **CV**: `/olorin-cv/cvplus/backend/scripts/`

## Structure

- `common/` - Shared utilities (logging, colors, path resolution, prerequisites)
- `deployment/` - Multi-platform deployment orchestration
- `development/` - Development environment setup (start_olorin.sh)
- `security/` - Security scanning and validation
- `docker/` - Docker build and deployment utilities

## Usage

All scripts source shared utilities from `common/`:

```bash
#!/bin/bash
source "$OLORIN_ROOT/scripts/common/paths.sh"
source "$OLORIN_ROOT/scripts/common/colors.sh"

# Now you have:
# - OLORIN_ROOT, FRAUD_BACKEND, etc.
# - Color functions: info(), success(), error(), etc.
```

## Path Resolution

Scripts use the standard path resolution utility to avoid hardcoded paths:

```bash
source "$OLORIN_ROOT/scripts/common/paths.sh"

# Available variables:
# - OLORIN_ROOT: Repository root
# - FRAUD_ROOT: olorin-fraud directory
# - FRAUD_BACKEND: olorin-fraud/backend
# - FRAUD_FRONTEND: olorin-fraud/frontend
# - FRAUD_SPECS: fraud/specs
# - FRAUD_TESTS: fraud/tests
```

## Platform-Specific Scripts

If you need platform-specific automation:

- **Fraud platform**: Add to `/fraud/scripts/`
- **Media platform**: Add to platform-specific scripts directory
- **CV platform**: Add to platform-specific scripts directory

Only add to this directory if the script is truly ecosystem-wide (affects multiple platforms).

## Security

All scripts follow security best practices:
- No hardcoded paths
- Fail-fast validation
- Marker-based root detection
- No symlink vulnerabilities (CWE-59, CWE-61)
