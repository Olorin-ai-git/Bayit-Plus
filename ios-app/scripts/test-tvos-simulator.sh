#!/bin/bash
# =============================================================================
# Bayit+ tvOS Simulator Testing Script
# =============================================================================
# Reusable script for building, launching, and testing the Bayit+ tvOS app
# on the Apple TV Simulator with -skipAuth for debugging.
#
# Usage:
#   ./Scripts/test-tvos-simulator.sh                    # Full test
#   ./Scripts/test-tvos-simulator.sh --screenshots-only # Skip build
#   ./Scripts/test-tvos-simulator.sh --build-only       # Build only
#
# Prerequisites:
#   - Xcode installed with tvOS simulators
#   - xcodegen installed (brew install xcodegen)
# =============================================================================

set -euo pipefail

# --- Configuration ---
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_FILE="$PROJECT_DIR/BayitPlus.xcodeproj"
SCHEME="BayitPlusTVApp"
BUNDLE_ID="tv.bayit.plus"
SCREENSHOT_DIR="/tmp/bayit-testing-screenshots/tvos"
DEFAULT_DEVICE_NAME="Apple TV 4K (3rd generation)"
LOAD_WAIT=12

# --- Parse Arguments ---
SCREENSHOTS_ONLY=false
BUILD_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --screenshots-only) SCREENSHOTS_ONLY=true; shift ;;
        --build-only) BUILD_ONLY=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# --- Helper Functions ---
timestamp() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "[$(timestamp)] $1"; }
error() { echo "[$(timestamp)] ERROR: $1" >&2; }

get_device_id() {
    xcrun simctl list devices available -j | \
        python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    if 'tvOS' in runtime:
        for d in devices:
            if d['name'] == '$DEFAULT_DEVICE_NAME':
                print(d['udid']); sys.exit(0)
" 2>/dev/null
}

screenshot() {
    local device_id="$1"
    local name="$2"
    # tvOS screenshots use --display external
    xcrun simctl io "$device_id" screenshot --display=external "$SCREENSHOT_DIR/$name.png" 2>/dev/null
    log "  Screenshot: $name.png"
}

# --- Find Device ---
log "Finding Apple TV simulator..."
DEVICE_ID=$(get_device_id)

if [[ -z "$DEVICE_ID" ]]; then
    error "Apple TV simulator not found. Available tvOS devices:"
    xcrun simctl list devices available | grep "tvOS"
    exit 1
fi
log "Device ID: $DEVICE_ID"

# --- Boot Simulator ---
log "Booting Apple TV simulator..."
xcrun simctl boot "$DEVICE_ID" 2>/dev/null || true
sleep 5
log "Simulator booted"

# --- Build Phase ---
if [[ "$SCREENSHOTS_ONLY" == false ]]; then
    log "=== BUILD PHASE ==="

    cd "$PROJECT_DIR"

    log "Regenerating Xcode project..."
    xcodegen generate 2>&1 | tail -1

    log "Building $SCHEME for tvOS Simulator..."
    BUILD_OUTPUT=$(xcodebuild \
        -project "$PROJECT_FILE" \
        -scheme "$SCHEME" \
        -configuration Debug \
        -destination "platform=tvOS Simulator,id=$DEVICE_ID" \
        CODE_SIGN_IDENTITY="Apple Development" \
        CODE_SIGN_STYLE=Automatic \
        build 2>&1)

    if echo "$BUILD_OUTPUT" | grep -q "BUILD SUCCEEDED"; then
        log "BUILD SUCCEEDED"
    else
        error "BUILD FAILED"
        echo "$BUILD_OUTPUT" | grep "error:" | sort -u | head -10
        exit 1
    fi

    if [[ "$BUILD_ONLY" == true ]]; then
        log "Build-only mode. Exiting."
        exit 0
    fi

    # Install
    log "Installing app on Apple TV simulator..."
    DERIVED_DATA_DIR="$HOME/Library/Developer/Xcode/DerivedData"
    APP_PATH=$(find "$DERIVED_DATA_DIR" -path "*/BayitPlus-*/Build/Products/Debug-appletvsimulator/Bayit+*TV.app" -maxdepth 5 2>/dev/null | head -1)

    if [[ -z "$APP_PATH" ]]; then
        error "Built tvOS app not found in DerivedData"
        exit 1
    fi

    xcrun simctl install "$DEVICE_ID" "$APP_PATH"
    log "App installed"
fi

# --- Launch Phase ---
log "=== LAUNCH PHASE ==="

xcrun simctl terminate "$DEVICE_ID" "$BUNDLE_ID" 2>/dev/null || true
sleep 1

log "Launching with -skipAuth..."
xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID" -skipAuth
log "Waiting ${LOAD_WAIT}s for app to load..."
sleep "$LOAD_WAIT"

# --- Screenshot Phase ---
log "=== SCREENSHOT PHASE ==="
mkdir -p "$SCREENSHOT_DIR"

screenshot "$DEVICE_ID" "01-home"

# tvOS navigation via deep links
ROUTES=("live" "podcasts" "audiobooks" "search" "settings" "favorites")
for route in "${ROUTES[@]}"; do
    xcrun simctl openurl "$DEVICE_ID" "bayitplus://$route" 2>/dev/null
    sleep 5
    screenshot "$DEVICE_ID" "02-$route"
done

# --- Summary ---
TOTAL=$(ls "$SCREENSHOT_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
log "=== TESTING COMPLETE ==="
log "Screenshots taken: $TOTAL"
log "Screenshot directory: $SCREENSHOT_DIR"
log ""
log "=== tvOS VERIFICATION CHECKLIST ==="
log "[ ] App launches without crash on Apple TV"
log "[ ] Splash screen renders correctly"
log "[ ] Home tab: Content rows load"
log "[ ] Live TV: Channel grid with focus navigation"
log "[ ] Podcasts: Hebrew content loads"
log "[ ] Focus navigation: No focus traps"
log "[ ] Siri Remote: Clickpad/swipe gestures work"
log "[ ] 10-foot typography: Text readable from distance"
log "[ ] Tab bar: All tabs accessible via focus"
log "[ ] Dark theme: Consistent on large screen"
log "[ ] No crash on any navigation"
log ""
log "=== tvOS-SPECIFIC CHECKS ==="
log "[ ] Focus ring visible on all interactive elements"
log "[ ] Minimum 44pt touch target equivalent for focus areas"
log "[ ] Top Shelf extension renders (if applicable)"
log "[ ] Siri Remote microphone button works"
log "[ ] Back button (Menu) navigates correctly"
log "[ ] Play/Pause button toggles playback"
