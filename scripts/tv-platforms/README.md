# TV Platform Scripts

TV platform scripts for Apple TV (tvOS), Samsung Tizen, and LG webOS.

---

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [tvOS Scripts](#tvos-scripts-apple-tv)
- [Tizen Scripts](#tizen-scripts-samsung)
- [webOS Scripts](#webos-scripts-lg)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)

---

## Overview

This directory contains scripts for TV platform operations including:
- **tvOS scripts** - Apple TV deployment and localization
- **Tizen scripts** - Samsung TV packaging and deployment
- **webOS scripts** - LG TV packaging and deployment

**Note:** This directory structure is prepared for future TV platform scripts. Currently no scripts exist but the organization is ready.

---

## Directory Structure

```
tv-platforms/
├── README.md                          # This file
├── tvos/                              # Apple TV scripts
│   ├── localization-audit.sh         # tvOS i18n audit (future)
│   ├── deploy-tvos.sh                # tvOS deployment (future)
│   └── package-tvos.sh               # tvOS packaging (future)
├── tizen/                             # Samsung Tizen scripts
│   ├── deploy.sh                     # Tizen deployment (future)
│   ├── package-tizen.sh              # Tizen packaging (future)
│   └── verify-tizen.sh               # Tizen verification (future)
└── webos/                             # LG webOS scripts
    ├── package-webos.sh              # webOS packaging (future)
    └── deploy-webos.sh               # webOS deployment (future)
```

---

## tvOS Scripts (Apple TV)

### localization-audit.sh (Future)

**Purpose:** Audit tvOS app for internationalization compliance.

**Planned Features:**
- Check for hardcoded strings
- Verify localization files completeness
- Validate RTL support
- Check image asset localization
- Verify voice-over labels

**Usage:**
```bash
cd scripts/tv-platforms
./tvos/localization-audit.sh
```

---

### deploy-tvos.sh (Future)

**Purpose:** Deploy tvOS app to App Store Connect or TestFlight.

**Planned Features:**
- Build tvOS app for release
- Code signing with distribution certificate
- Archive creation
- Upload to App Store Connect
- Submit to TestFlight

**Environment Variables:**
- `TVOS_PROVISIONING_PROFILE` - Path to provisioning profile
- `TVOS_TEAM_ID` - Apple Developer Team ID
- `TVOS_BUNDLE_ID` - App bundle identifier

---

### package-tvos.sh (Future)

**Purpose:** Package tvOS app for distribution.

**Planned Features:**
- Create .ipa file
- Include required assets
- Optimize for TV interface
- Validate 10-foot UI compliance

---

## Tizen Scripts (Samsung)

### deploy.sh (Future)

**Purpose:** Deploy Tizen app to Samsung TV or Samsung Apps store.

**Planned Features:**
- Connect to Samsung TV via network
- Install app on connected TV
- Upload to Samsung Apps seller portal
- Submit for review

**Environment Variables:**
- `TIZEN_SDK_PATH` - Path to Tizen Studio SDK
- `TIZEN_DEVICE_IP` - IP address of Samsung TV for testing
- `TIZEN_SECURITY_PROFILE` - Security profile name

**Usage:**
```bash
cd scripts/tv-platforms
export TIZEN_DEVICE_IP='192.168.1.100'
./tizen/deploy.sh
```

---

### package-tizen.sh (Future)

**Purpose:** Package Tizen app as .wgt file for distribution.

**Planned Features:**
- Build Tizen web application
- Create .wgt package
- Sign with security profile
- Validate Tizen manifest

**Usage:**
```bash
cd scripts/tv-platforms
./tizen/package-tizen.sh
```

---

### verify-tizen.sh (Future)

**Purpose:** Verify Tizen app compliance with Samsung requirements.

**Planned Features:**
- Check manifest validity
- Verify required permissions
- Validate icon assets
- Check API usage
- Verify TV-specific UI guidelines

---

## webOS Scripts (LG)

### package-webos.sh (Future)

**Purpose:** Package webOS app as .ipk file for distribution.

**Planned Features:**
- Build webOS web application
- Create .ipk package
- Sign with developer certificate
- Validate webOS manifest

**Environment Variables:**
- `WEBOS_SDK_PATH` - Path to webOS TV SDK
- `WEBOS_DEVICE_IP` - IP address of LG TV for testing

**Usage:**
```bash
cd scripts/tv-platforms
./webos/package-webos.sh
```

---

### deploy-webos.sh (Future)

**Purpose:** Deploy webOS app to LG TV or LG Content Store.

**Planned Features:**
- Connect to LG TV via network
- Install app on connected TV
- Upload to LG Content Store
- Submit for review

**Usage:**
```bash
cd scripts/tv-platforms
export WEBOS_DEVICE_IP='192.168.1.101'
./webos/deploy-webos.sh
```

---

## Configuration

### Global Configuration

**File:** `scripts/config/monorepo-paths.env.example`

**TV Platform Variables:**
```bash
TIZEN_DIR="${PROJECT_ROOT}/tizen"
WEBOS_DIR="${PROJECT_ROOT}/webos"
TVOS_APP_DIR="${PROJECT_ROOT}/tvos-app"

TIZEN_SDK_PATH="${TIZEN_SDK_PATH:-${HOME}/tizen-studio}"
WEBOS_SDK_PATH="${WEBOS_SDK_PATH:-${HOME}/webOS_TV_SDK}"
TVOS_PROVISIONING_PROFILE="${TVOS_PROVISIONING_PROFILE:-}"
```

### Platform-Specific Configuration

**tvOS:**
```bash
TVOS_BUNDLE_ID="com.olorin.bayit.tv"
TVOS_TEAM_ID="${TVOS_TEAM_ID:-}"
TVOS_MIN_VERSION="16.0"
```

**Tizen:**
```bash
TIZEN_APP_ID="olorin.bayit"
TIZEN_SECURITY_PROFILE="default"
TIZEN_API_VERSION="6.0"
```

**webOS:**
```bash
WEBOS_APP_ID="com.olorin.bayit"
WEBOS_API_VERSION="6.0.0"
```

---

## Usage Examples

### tvOS Development Workflow (Future)

```bash
# 1. Run localization audit
cd scripts/tv-platforms
./tvos/localization-audit.sh

# 2. Package app
./tvos/package-tvos.sh

# 3. Deploy to TestFlight
export TVOS_PROVISIONING_PROFILE='path/to/profile'
./tvos/deploy-tvos.sh --testflight
```

### Tizen Development Workflow (Future)

```bash
# 1. Package app
cd scripts/tv-platforms
./tizen/package-tizen.sh

# 2. Verify compliance
./tizen/verify-tizen.sh

# 3. Deploy to Samsung TV
export TIZEN_DEVICE_IP='192.168.1.100'
./tizen/deploy.sh --device

# 4. Submit to Samsung Apps
./tizen/deploy.sh --store
```

### webOS Development Workflow (Future)

```bash
# 1. Package app
cd scripts/tv-platforms
./webos/package-webos.sh

# 2. Deploy to LG TV
export WEBOS_DEVICE_IP='192.168.1.101'
./webos/deploy-webos.sh --device

# 3. Submit to LG Content Store
./webos/deploy-webos.sh --store
```

---

## TV Platform Guidelines

### tvOS Best Practices
- **10-foot UI:** Minimum touch target 250x100 points
- **Focus navigation:** All interactive elements focusable
- **Siri Remote:** Support menu button, play/pause, directional pad
- **Top Shelf:** Provide Top Shelf content
- **Parallax images:** Layered images for depth effect

### Tizen Best Practices
- **Remote control:** Support directional keys, back, enter
- **Resolution:** Support 1920x1080 (Full HD) and 3840x2160 (4K)
- **Memory:** Optimize for 1.5GB RAM limit
- **Permissions:** Request only required permissions

### webOS Best Practices
- **Magic Remote:** Support pointer and gesture controls
- **Resolution:** Support 1920x1080 and 3840x2160
- **Performance:** Target 60fps for smooth UI
- **Manifest:** Complete webOS manifest with all required fields

---

## CI/CD Integration (Future)

```yaml
# .github/workflows/tv-platforms.yml
- name: Package Tizen
  run: |
    cd scripts/tv-platforms
    ./tizen/package-tizen.sh

- name: Verify Tizen
  run: |
    cd scripts/tv-platforms
    ./tizen/verify-tizen.sh

- name: Deploy to Samsung Apps
  env:
    TIZEN_SECURITY_PROFILE: ${{ secrets.TIZEN_SECURITY_PROFILE }}
  run: |
    cd scripts/tv-platforms
    ./tizen/deploy.sh --store
```

---

## Backward Compatibility

When TV platform scripts are added, symlinks will be created at original locations during transition period (90 days):

```bash
# Future symlinks
tizen/deploy.sh → ../scripts/tv-platforms/tizen/deploy.sh
webos/package-webos.sh → ../scripts/tv-platforms/webos/package-webos.sh
```

---

## Contributing

### Adding New TV Platform Scripts

1. **Determine platform:** tvOS, Tizen, or webOS
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
- **Monorepo Scripts:** Run `scripts/find-all-scripts.sh tv`

---

## Version History

- **2026-01-23**: Initial TV platforms structure
  - Created directory organization for tvOS, Tizen, webOS
  - Prepared for future TV platform scripts
  - Documentation framework established
