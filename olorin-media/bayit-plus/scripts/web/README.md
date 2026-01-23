# Web Scripts

Frontend/web scripts for build, deployment, and testing operations.

---

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Build Scripts](#build-scripts)
- [Deployment Scripts](#deployment-scripts)
- [Testing Scripts](#testing-scripts)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)

---

## Overview

This directory contains scripts for frontend/web operations including:
- **Build scripts** - Webpack bundle analysis and verification
- **Deployment scripts** - Deployment health checks and verification
- **Testing scripts** - Visual regression, accessibility, and iOS tests

---

## Directory Structure

```
web/
├── README.md                          # This file
├── build/                             # Build and bundle scripts
│   ├── analyze-bundle.sh             # Webpack bundle analysis
│   ├── check-bundle-size.cjs         # Bundle size validation
│   └── detect-stylesheets.sh         # Detect remaining StyleSheet usage
├── deployment/                        # Deployment scripts
│   └── verify-deployment.sh          # Deployment health checks
└── testing/                           # Testing scripts
    ├── run-visual-regression.sh      # Visual regression tests
    ├── validate-touch-targets.sh     # Touch target accessibility
    ├── run-ios-tests.sh              # iOS-specific tests
    └── generate-test-report.ts       # Test report generation
```

---

## Build Scripts

### analyze-bundle.sh

**Purpose:** Analyze Webpack bundle composition and identify optimization opportunities.

**Usage:**
```bash
cd scripts/web
./build/analyze-bundle.sh
```

**Features:**
- Bundle size breakdown by module
- Identifies large dependencies
- Suggests optimization strategies
- Generates interactive visualization

**Output:**
- Console report with top contributors
- `webpack-stats.html` - Interactive bundle visualizer

---

### check-bundle-size.cjs

**Purpose:** Validate bundle sizes against configured thresholds.

**Usage:**
```bash
cd scripts/web
node build/check-bundle-size.cjs
```

**Features:**
- Checks main bundle and chunk sizes
- Fails CI if thresholds exceeded
- Provides detailed size breakdown
- Suggests code-splitting strategies

**Configuration:**
```javascript
// In check-bundle-size.cjs
const SIZE_LIMITS = {
  mainBundle: 500 * 1024,  // 500KB
  vendorBundle: 800 * 1024, // 800KB
  asyncChunk: 200 * 1024    // 200KB
};
```

---

### detect-stylesheets.sh

**Purpose:** Detect remaining StyleSheet.create() usage (migration to Tailwind).

**Usage:**
```bash
cd scripts/web
./build/detect-stylesheets.sh
```

**Features:**
- Scans for StyleSheet.create() patterns
- Reports files still using StyleSheet
- Checks for inline style objects
- Provides migration guidance

---

## Deployment Scripts

### verify-deployment.sh

**Purpose:** Comprehensive deployment health checks and verification.

**Usage:**
```bash
cd scripts/web
export DEPLOYMENT_URL='https://your-app.com'
./deployment/verify-deployment.sh
```

**Environment Variables:**
- `DEPLOYMENT_URL` - URL to verify (required)
- `TIMEOUT` - Request timeout in seconds (default: 30)
- `RETRY_COUNT` - Number of retries (default: 3)

**Features:**
- HTTP health check (200 OK status)
- Response time validation
- Content integrity checks
- SSL certificate validation
- DNS resolution verification
- CDN cache status
- Asset availability checks (CSS, JS, images)

**Output:**
```
✅ Health check: PASSED (200 OK)
✅ Response time: 234ms
✅ SSL certificate: Valid (expires 2026-06-15)
✅ CDN cache: HIT
✅ Critical assets: All loaded
```

---

## Testing Scripts

### run-visual-regression.sh

**Purpose:** Visual regression testing using Playwright and Percy.

**Usage:**
```bash
cd scripts/web
./testing/run-visual-regression.sh
```

**Environment Variables:**
- `PERCY_TOKEN` - Percy API token (required)
- `BASE_URL` - Application URL to test (default: http://localhost:3000)

**Features:**
- Captures screenshots of key pages
- Compares against baseline
- Detects visual changes
- Reports pixel-level differences
- Supports responsive viewports

**Test Coverage:**
- Homepage
- Dashboard
- Content detail pages
- Settings pages
- Error states
- Loading states

---

### validate-touch-targets.sh

**Purpose:** Validate touch target sizes for mobile accessibility (WCAG 2.1 Level AA).

**Usage:**
```bash
cd scripts/web
./testing/validate-touch-targets.sh
```

**Standards:**
- Minimum touch target: 44x44 CSS pixels (iOS HIG, WCAG)
- Minimum spacing: 8px between targets
- Interactive elements: buttons, links, inputs

**Features:**
- Scans components for touch target violations
- Reports elements below minimum size
- Checks spacing between adjacent targets
- Provides fix suggestions

**Output:**
```
❌ Button in Header.tsx (line 45): 36x36px - TOO SMALL
   Recommendation: Increase to at least 44x44px
✅ All form inputs: PASSED
```

---

### run-ios-tests.sh

**Purpose:** Run iOS-specific tests for React Native Web compatibility.

**Usage:**
```bash
cd scripts/web
./testing/run-ios-tests.sh
```

**Test Coverage:**
- Safe area handling
- Touch gesture compatibility
- iOS-specific UI patterns
- WebKit rendering
- Performance on iOS devices

---

### generate-test-report.ts

**Purpose:** Generate comprehensive HTML test report from test results.

**Usage:**
```bash
cd scripts/web
npx ts-node testing/generate-test-report.ts
```

**Features:**
- Aggregates test results from Jest, Playwright, Percy
- Generates HTML report with charts
- Test coverage visualization
- Performance metrics
- Failed test screenshots

**Output:** `test-report.html`

---

## Configuration

### Global Configuration

**File:** `scripts/config/monorepo-paths.env.example`

**Web-Specific Variables:**
```bash
WEB_DIR="${PROJECT_ROOT}/web"
WEB_BUILD_DIR="${WEB_DIR}/build"
WEB_DIST_DIR="${WEB_DIR}/dist"
WEB_URL="${WEB_URL:-http://localhost:3000}"
```

---

## Usage Examples

### Pre-Deploy Verification

```bash
# 1. Build application
cd web
npm run build

# 2. Analyze bundle size
cd ../scripts/web
./build/analyze-bundle.sh

# 3. Check bundle size limits
node build/check-bundle-size.cjs

# 4. Run visual regression tests
export PERCY_TOKEN='your-token'
./testing/run-visual-regression.sh

# 5. Verify deployment
export DEPLOYMENT_URL='https://staging.your-app.com'
./deployment/verify-deployment.sh
```

### CI/CD Integration

```yaml
# .github/workflows/web-deploy.yml
- name: Analyze Bundle
  run: |
    cd scripts/web
    ./build/analyze-bundle.sh

- name: Verify Deployment
  env:
    DEPLOYMENT_URL: ${{ needs.deploy.outputs.url }}
  run: |
    cd scripts/web
    ./deployment/verify-deployment.sh
```

### Local Development

```bash
# Check for StyleSheet usage before committing
cd scripts/web
./build/detect-stylesheets.sh

# Validate touch targets
./testing/validate-touch-targets.sh
```

---

## Backward Compatibility

Symlinks exist at original locations during transition period (90 days):

```bash
# Old location (still works via symlink)
cd web/scripts
./analyze-bundle.sh

# New location (preferred)
cd scripts/web
./build/analyze-bundle.sh
```

**Removal Date:** Q2 2026 (planned)

---

## Contributing

### Adding New Web Scripts

1. **Determine category:** build, deployment, or testing
2. **Place in correct subdirectory**
3. **Follow naming conventions:** lowercase with hyphens (`script-name.sh`)
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
- **Monorepo Scripts:** Run `scripts/find-all-scripts.sh web`

---

## Version History

- **2026-01-23**: Initial web scripts organization
  - Organized 8 scripts into build, deployment, testing
  - Created backward compatibility symlinks
  - Comprehensive documentation
