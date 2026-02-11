#!/bin/bash
# =============================================================================
# Bayit+ iOS Simulator Testing Script
# =============================================================================
# Reusable script for building, launching, and testing the Bayit+ iOS app
# on the iOS Simulator with --skip-auth for debugging.
#
# Usage:
#   ./Scripts/test-ios-simulator.sh                    # Full test
#   ./Scripts/test-ios-simulator.sh --screenshots-only # Skip build, just screenshots
#   ./Scripts/test-ios-simulator.sh --build-only       # Build only, don't launch
#   ./Scripts/test-ios-simulator.sh --device "iPhone 16 Pro" # Specific device
#
# Prerequisites:
#   - Xcode installed with iOS simulators
#   - xcodegen installed (brew install xcodegen)
# =============================================================================

set -euo pipefail

# --- Configuration ---
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_FILE="$PROJECT_DIR/BayitPlus.xcodeproj"
SCHEME="BayitPlusApp"
BUNDLE_ID="tv.bayit.plus"
SCREENSHOT_DIR="/tmp/bayit-testing-screenshots/ios"
DEFAULT_DEVICE_NAME="iPhone 17 Pro"
LOAD_WAIT=10       # seconds to wait after launch for content to load
NAV_WAIT=4         # seconds between deep link navigations

# --- Parse Arguments ---
SCREENSHOTS_ONLY=false
BUILD_ONLY=false
DEVICE_NAME="$DEFAULT_DEVICE_NAME"

while [[ $# -gt 0 ]]; do
    case $1 in
        --screenshots-only) SCREENSHOTS_ONLY=true; shift ;;
        --build-only) BUILD_ONLY=true; shift ;;
        --device) DEVICE_NAME="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# --- Helper Functions ---
timestamp() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "[$(timestamp)] $1"; }
error() { echo "[$(timestamp)] ERROR: $1" >&2; }

get_device_id() {
    local name="$1"
    xcrun simctl list devices available -j | \
        python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    if 'iOS' in runtime:
        for d in devices:
            if d['name'] == '$name' and d['state'] != 'Shutdown':
                print(d['udid']); sys.exit(0)
for runtime, devices in data.get('devices', {}).items():
    if 'iOS' in runtime:
        for d in devices:
            if d['name'] == '$name':
                print(d['udid']); sys.exit(0)
" 2>/dev/null
}

screenshot() {
    local device_id="$1"
    local name="$2"
    xcrun simctl io "$device_id" screenshot "$SCREENSHOT_DIR/$name.png" 2>/dev/null
    log "  Screenshot: $name.png"
}

navigate() {
    local device_id="$1"
    local route="$2"
    xcrun simctl openurl "$device_id" "bayitplus://$route" 2>/dev/null
    sleep "$NAV_WAIT"
}

# --- Find Device ---
log "Finding simulator: $DEVICE_NAME"
DEVICE_ID=$(get_device_id "$DEVICE_NAME")

if [[ -z "$DEVICE_ID" ]]; then
    error "Device '$DEVICE_NAME' not found. Available iOS devices:"
    xcrun simctl list devices available | grep "iOS"
    exit 1
fi
log "Device ID: $DEVICE_ID"

# --- Boot Simulator ---
DEVICE_STATE=$(xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if d['udid'] == '$DEVICE_ID':
            print(d['state']); sys.exit(0)
" 2>/dev/null)

if [[ "$DEVICE_STATE" != "Booted" ]]; then
    log "Booting simulator..."
    xcrun simctl boot "$DEVICE_ID" 2>/dev/null || true
    sleep 5
fi
log "Simulator booted"

# --- Build Phase ---
if [[ "$SCREENSHOTS_ONLY" == false ]]; then
    log "=== BUILD PHASE ==="

    cd "$PROJECT_DIR"

    # Regenerate Xcode project
    log "Regenerating Xcode project..."
    xcodegen generate 2>&1 | tail -1

    # Build
    log "Building $SCHEME for iOS Simulator..."
    BUILD_OUTPUT=$(xcodebuild \
        -project "$PROJECT_FILE" \
        -scheme "$SCHEME" \
        -configuration Debug \
        -destination "platform=iOS Simulator,id=$DEVICE_ID" \
        build 2>&1)

    if echo "$BUILD_OUTPUT" | grep -q "BUILD SUCCEEDED"; then
        log "BUILD SUCCEEDED"
    else
        error "BUILD FAILED"
        echo "$BUILD_OUTPUT" | grep "error:" | head -10
        exit 1
    fi

    if [[ "$BUILD_ONLY" == true ]]; then
        log "Build-only mode. Exiting."
        exit 0
    fi

    # Install
    log "Installing app on simulator..."
    DERIVED_DATA_DIR="$HOME/Library/Developer/Xcode/DerivedData"
    APP_PATH=$(find "$DERIVED_DATA_DIR" -path "*/BayitPlus-*/Build/Products/Debug-iphonesimulator/Bayit+.app" -maxdepth 5 2>/dev/null | head -1)

    if [[ -z "$APP_PATH" ]]; then
        error "Built app not found in DerivedData"
        exit 1
    fi

    xcrun simctl install "$DEVICE_ID" "$APP_PATH"
    log "App installed"
fi

# --- Launch Phase ---
log "=== LAUNCH PHASE ==="

# Terminate if running
xcrun simctl terminate "$DEVICE_ID" "$BUNDLE_ID" 2>/dev/null || true
sleep 1

# Launch with --skip-auth
log "Launching with --skip-auth..."
xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID" --skip-auth --ui-testing
log "Waiting ${LOAD_WAIT}s for app to load..."
sleep "$LOAD_WAIT"

# --- Screenshot Phase ---
log "=== SCREENSHOT PHASE ==="
mkdir -p "$SCREENSHOT_DIR"

# 1. Splash/Home (should be loaded by now)
screenshot "$DEVICE_ID" "01-home"

# 2. Tab navigation via deep links
TABS=("live" "radio" "podcasts")
for tab in "${TABS[@]}"; do
    navigate "$DEVICE_ID" "$tab"
    screenshot "$DEVICE_ID" "02-tab-$tab"
done

# 3. Navigate back to home for sub-page tests
navigate "$DEVICE_ID" "home"
sleep 2

# 4. Sub-pages (pushed onto current tab)
SUBPAGES=("search" "profile" "settings" "favorites" "downloads" "audiobooks" "children" "youngsters" "judaism" "flows" "friends" "rewards" "household")
for page in "${SUBPAGES[@]}"; do
    navigate "$DEVICE_ID" "$page"
    screenshot "$DEVICE_ID" "03-page-$page"
    # Navigate back to home before next push
    navigate "$DEVICE_ID" "home"
    sleep 1
done

# --- Summary ---
TOTAL=$(ls "$SCREENSHOT_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
log "=== TESTING COMPLETE ==="
log "Screenshots taken: $TOTAL"
log "Screenshot directory: $SCREENSHOT_DIR"
log ""
log "=== VERIFICATION CHECKLIST ==="
log "[ ] App launches without crash"
log "[ ] Splash screen shows Bayit+ branding"
log "[ ] Home tab: Hero carousel, dual timezone, Live TV section"
log "[ ] Live TV tab: Channel grid loads"
log "[ ] Radio tab: Station grid loads"
log "[ ] Podcasts tab: Hebrew podcast covers, category filters"
log "[ ] Widgets tab: Widget gallery, personal widgets section"
log "[ ] Tab bar: All 6 tabs visible (Home, Live, VOD, Radio, Podcasts, Widgets)"
log "[ ] Left sidebar dock: Widget icons visible"
log "[ ] Dark theme: Consistent glassmorphism styling"
log "[ ] RTL: Hebrew text renders correctly"
log "[ ] No crash on any navigation"
log ""
log "=== KNOWN LIMITATIONS (--skip-auth mode) ==="
log "- Widget playback requires real auth tokens"
log "- User profile/settings show empty state"
log "- Features requiring server validation are disabled"
log "- Youngsters section hidden if /api/v1/youngsters/trending returns empty"
