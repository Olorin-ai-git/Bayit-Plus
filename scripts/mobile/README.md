# Mobile Scripts

Mobile app scripts for iOS and Android build, deployment, and testing operations.

---

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [iOS Scripts](#ios-scripts)
- [Android Scripts](#android-scripts)
- [Shared Scripts](#shared-scripts)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)

---

## Overview

This directory contains scripts for mobile app operations including:
- **iOS scripts** - Xcode setup, iOS deployment, and testing
- **Android scripts** - Android build, deployment, and testing
- **Shared scripts** - Cross-platform mobile utilities

**Note:** This directory structure is prepared for future mobile scripts. Currently no scripts exist but the organization is ready.

---

## Directory Structure

```
mobile/
├── README.md                          # This file
├── ios/                               # iOS-specific scripts
│   ├── setup-xcode.sh                # Xcode environment setup (future)
│   ├── deploy-ios.sh                 # iOS deployment (future)
│   └── build-ios.sh                  # iOS build process (future)
├── android/                           # Android-specific scripts
│   ├── setup-android.sh              # Android SDK setup (future)
│   ├── deploy-android.sh             # Android deployment (future)
│   └── build-android.sh              # Android build process (future)
└── shared/                            # Cross-platform mobile utilities
    └── mobile-common.sh              # Shared mobile functions (future)
```

---

## iOS Scripts

### setup-xcode.sh (Future)

**Purpose:** Configure Xcode environment for iOS development.

**Planned Features:**
- Verify Xcode installation
- Install required command-line tools
- Configure code signing
- Set up provisioning profiles
- Install iOS simulators

**Usage:**
```bash
cd scripts/mobile
./ios/setup-xcode.sh
```

---

### deploy-ios.sh (Future)

**Purpose:** Deploy iOS app to App Store Connect or TestFlight.

**Planned Features:**
- Build iOS app for release
- Code signing with distribution certificate
- Archive creation
- Upload to App Store Connect
- Submit to TestFlight

**Usage:**
```bash
cd scripts/mobile
export IOS_PROVISIONING_PROFILE='path/to/profile'
./ios/deploy-ios.sh
```

---

### build-ios.sh (Future)

**Purpose:** Build iOS app for development or testing.

**Planned Features:**
- Build for simulator
- Build for device
- Run unit tests
- Run UI tests

---

## Android Scripts

### setup-android.sh (Future)

**Purpose:** Configure Android SDK for development.

**Planned Features:**
- Verify Android SDK installation
- Install build tools
- Configure Android emulators
- Set up signing keys

---

### deploy-android.sh (Future)

**Purpose:** Deploy Android app to Google Play Console.

**Planned Features:**
- Build Android APK/AAB
- Sign with release key
- Upload to Google Play Console
- Submit to internal/alpha/beta track

---

### build-android.sh (Future)

**Purpose:** Build Android app for development or testing.

**Planned Features:**
- Build debug APK
- Build release AAB
- Run unit tests
- Run instrumentation tests

---

## Shared Scripts

### mobile-common.sh (Future)

**Purpose:** Shared functions for both iOS and Android scripts.

**Planned Features:**
- Common configuration loading
- Cross-platform build utilities
- Version management functions
- Changelog generation

---

## Configuration

### Global Configuration

**File:** `scripts/config/monorepo-paths.env.example`

**Mobile-Specific Variables:**
```bash
MOBILE_APP_DIR="${PROJECT_ROOT}/mobile-app"
IOS_PROJECT_PATH="${MOBILE_APP_DIR}/ios"
ANDROID_PROJECT_PATH="${MOBILE_APP_DIR}/android"
```

### Platform-Specific Configuration

**iOS:**
```bash
IOS_BUNDLE_ID="com.olorin.bayit"
IOS_PROVISIONING_PROFILE="${IOS_PROVISIONING_PROFILE:-}"
IOS_TEAM_ID="${IOS_TEAM_ID:-}"
```

**Android:**
```bash
ANDROID_PACKAGE_NAME="com.olorin.bayit"
ANDROID_KEYSTORE_PATH="${ANDROID_KEYSTORE_PATH:-}"
ANDROID_KEY_ALIAS="${ANDROID_KEY_ALIAS:-}"
```

---

## Usage Examples

### iOS Development Workflow (Future)

```bash
# 1. Setup Xcode environment
cd scripts/mobile
./ios/setup-xcode.sh

# 2. Build for simulator
./ios/build-ios.sh --simulator

# 3. Run tests
./ios/build-ios.sh --test

# 4. Deploy to TestFlight
export IOS_PROVISIONING_PROFILE='path/to/profile'
./ios/deploy-ios.sh --testflight
```

### Android Development Workflow (Future)

```bash
# 1. Setup Android SDK
cd scripts/mobile
./android/setup-android.sh

# 2. Build debug APK
./android/build-android.sh --debug

# 3. Run tests
./android/build-android.sh --test

# 4. Deploy to Google Play
export ANDROID_KEYSTORE_PATH='path/to/keystore'
./android/deploy-android.sh --track alpha
```

---

## CI/CD Integration (Future)

```yaml
# .github/workflows/mobile-ios.yml
- name: Setup iOS
  run: |
    cd scripts/mobile
    ./ios/setup-xcode.sh

- name: Build iOS
  run: |
    cd scripts/mobile
    ./ios/build-ios.sh --release

- name: Deploy to TestFlight
  env:
    IOS_PROVISIONING_PROFILE: ${{ secrets.IOS_PROVISIONING_PROFILE }}
  run: |
    cd scripts/mobile
    ./ios/deploy-ios.sh --testflight
```

---

## Backward Compatibility

When mobile scripts are added, symlinks will be created at original locations during transition period (90 days):

```bash
# Future symlinks
mobile-app/setup-xcode.sh → ../scripts/mobile/ios/setup-xcode.sh
```

---

## Contributing

### Adding New Mobile Scripts

1. **Determine platform:** iOS, Android, or shared
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
- **Monorepo Scripts:** Run `scripts/find-all-scripts.sh mobile`

---

## Version History

- **2026-01-23**: Initial mobile scripts structure
  - Created directory organization for iOS, Android, shared
  - Prepared for future mobile scripts
  - Documentation framework established
