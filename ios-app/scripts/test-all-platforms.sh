#!/bin/bash
# =============================================================================
# Bayit+ Full Platform Testing Script
# =============================================================================
# Runs both iOS and tvOS simulator tests in sequence.
# Generates a consolidated test report.
#
# Usage:
#   ./Scripts/test-all-platforms.sh
#   ./Scripts/test-all-platforms.sh --ios-only
#   ./Scripts/test-all-platforms.sh --tvos-only
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPORT_DIR="/tmp/bayit-testing-screenshots"
REPORT_FILE="$REPORT_DIR/test-report.txt"

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "[$(timestamp)] $1"; }

RUN_IOS=true
RUN_TVOS=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --ios-only) RUN_TVOS=false; shift ;;
        --tvos-only) RUN_IOS=false; shift ;;
        *) shift ;;
    esac
done

mkdir -p "$REPORT_DIR"

{
echo "============================================="
echo "  BAYIT+ SIMULATOR TEST REPORT"
echo "  Generated: $(timestamp)"
echo "============================================="
echo ""

# --- iOS Tests ---
if [[ "$RUN_IOS" == true ]]; then
    echo ">>> iOS TESTING"
    echo "---"
    if "$SCRIPT_DIR/test-ios-simulator.sh" 2>&1; then
        echo "iOS: PASSED"
    else
        echo "iOS: FAILED (see errors above)"
    fi
    echo ""
    echo "iOS screenshots: $REPORT_DIR/ios/"
    echo "Total iOS screenshots: $(ls "$REPORT_DIR/ios/"*.png 2>/dev/null | wc -l | tr -d ' ')"
    echo ""
fi

# --- tvOS Tests ---
if [[ "$RUN_TVOS" == true ]]; then
    echo ">>> tvOS TESTING"
    echo "---"
    if "$SCRIPT_DIR/test-tvos-simulator.sh" 2>&1; then
        echo "tvOS: PASSED"
    else
        echo "tvOS: FAILED (see errors above)"
    fi
    echo ""
    echo "tvOS screenshots: $REPORT_DIR/tvos/"
    echo "Total tvOS screenshots: $(ls "$REPORT_DIR/tvos/"*.png 2>/dev/null | wc -l | tr -d ' ')"
    echo ""
fi

echo "============================================="
echo "  FULL VERIFICATION CHECKLIST"
echo "============================================="
echo ""
echo "=== CROSS-PLATFORM ==="
echo "[ ] Both platforms build successfully"
echo "[ ] --skip-auth / -skipAuth bypasses login"
echo "[ ] Dark theme consistent across platforms"
echo "[ ] Hebrew/RTL text renders correctly"
echo "[ ] API data loads (when backend running)"
echo "[ ] No crashes during navigation"
echo ""
echo "=== iOS SPECIFIC ==="
echo "[ ] 6-tab bar: Home, Live, VOD, Radio, Podcasts, Widgets"
echo "[ ] Hero carousel auto-rotates with movie posters"
echo "[ ] Dual timezone display (Israel / NY)"
echo "[ ] Widget dock sidebar visible"
echo "[ ] PiP widget renders (poster + controls)"
echo "[ ] Deep links navigate correctly"
echo "[ ] Safe area handling (notch/Dynamic Island)"
echo ""
echo "=== tvOS SPECIFIC ==="
echo "[ ] Focus navigation works with Siri Remote"
echo "[ ] No focus traps in any view"
echo "[ ] 10-foot readable typography"
echo "[ ] Tab bar navigation via focus"
echo "[ ] Player controls via Siri Remote"
echo ""
echo "=== CONTENT SECTIONS ==="
echo "[ ] Home: Hero carousel, Live TV row, location content"
echo "[ ] Live TV: Channel grid with LIVE badges"
echo "[ ] VOD: Movie/series cards with metadata"
echo "[ ] Radio: Station grid"
echo "[ ] Podcasts: Hebrew covers, category filters"
echo "[ ] Widgets: Gallery + personal widgets"
echo "[ ] Jerusalem section with event cards"
echo "[ ] Tel Aviv section"
echo "[ ] Youngsters section (requires backend data)"
echo "[ ] Audiobooks section"
echo ""
echo "=== BUGS FOUND ($(date +%Y-%m-%d)) ==="
echo "1. Widget poster sizing - Channel logos display oversized"
echo "2. Widget play button - Requires real auth (expected in skip-auth)"
echo "3. Youngsters section - Missing when backend returns empty trending"
echo "4. Deep links timing - Need 10s+ after launch before deep links work"
echo ""
echo "============================================="
} | tee "$REPORT_FILE"

log "Report saved to: $REPORT_FILE"
