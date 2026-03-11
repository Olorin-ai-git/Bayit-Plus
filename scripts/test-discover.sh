#!/bin/bash
# =============================================================================
# Discover Tab E2E Test Orchestrator
# =============================================================================
# Starts local backend + ws-gateway, seeds test data, runs platform tests in
# parallel, collects results into a unified report.
#
# The WebSocket Gateway (port 8001) handles all /api/v1/ws/* routes including
# live dubbing, live subtitles, trivia, and other real-time features.
# The backend monolith (port 8000) handles REST endpoints.
#
# Usage:
#   ./scripts/test-discover.sh                          # All platforms
#   ./scripts/test-discover.sh --platform ios            # iOS only
#   ./scripts/test-discover.sh --platform tvos           # tvOS only
#   ./scripts/test-discover.sh --platform web            # Web (Playwright) only
#   ./scripts/test-discover.sh --platform android        # Android only
#   ./scripts/test-discover.sh --feature pause_ask       # Single feature, all platforms
#   ./scripts/test-discover.sh --skip-backend            # Skip backend startup (already running)
#   ./scripts/test-discover.sh --skip-gateway            # Skip ws-gateway startup (already running)
#   ./scripts/test-discover.sh --skip-seed               # Skip data seeding
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
IOS_DIR="$PROJECT_ROOT/ios-app"
WEB_DIR="$PROJECT_ROOT/web"
ANDROID_DIR="$PROJECT_ROOT/android-app"
REPORT_DIR="/tmp/discover-e2e-report"
REPORT_FILE="$REPORT_DIR/report.txt"
BACKEND_PID=""
WS_GATEWAY_PID=""

PLATFORM="all"
FEATURE="all"
SKIP_BACKEND=false
SKIP_GATEWAY=false
SKIP_SEED=false
BACKEND_PORT=8000
WS_GATEWAY_PORT=8001
BACKEND_HEALTH_URL="http://localhost:${BACKEND_PORT}/api/v1/health"
WS_GATEWAY_HEALTH_URL="http://localhost:${WS_GATEWAY_PORT}/health"

IOS_SIMULATOR="iPhone 17 Pro"
TVOS_SIMULATOR="Apple TV 4K (3rd generation)"
IOS_SCHEME="BayitPlusApp"

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "[$(timestamp)] $1"; }
log_section() { echo ""; echo "=== $1 ==="; echo ""; }

# --- Argument parsing ---
while [[ $# -gt 0 ]]; do
    case $1 in
        --platform) PLATFORM="$2"; shift 2 ;;
        --feature) FEATURE="$2"; shift 2 ;;
        --skip-backend) SKIP_BACKEND=true; shift ;;
        --skip-gateway) SKIP_GATEWAY=true; shift ;;
        --skip-seed) SKIP_SEED=true; shift ;;
        *) log "Unknown arg: $1"; shift ;;
    esac
done

cleanup() {
    if [[ -n "$WS_GATEWAY_PID" ]] && kill -0 "$WS_GATEWAY_PID" 2>/dev/null; then
        log "Stopping ws-gateway (PID $WS_GATEWAY_PID)..."
        kill "$WS_GATEWAY_PID" 2>/dev/null || true
        wait "$WS_GATEWAY_PID" 2>/dev/null || true
    fi
    if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        log "Stopping backend (PID $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

mkdir -p "$REPORT_DIR"/{ios,tvos,web,android}

# =============================================================================
# Phase 1: Backend
# =============================================================================
start_backend() {
    if [[ "$SKIP_BACKEND" == true ]]; then
        log "Skipping backend startup (--skip-backend)"
        return
    fi

    log_section "Starting Local Backend"

    if curl -sf "$BACKEND_HEALTH_URL" > /dev/null 2>&1; then
        log "Backend already running on port $BACKEND_PORT"
        return
    fi

    cd "$BACKEND_DIR"
    poetry run uvicorn app.main:app \
        --host 0.0.0.0 \
        --port "$BACKEND_PORT" \
        --log-level warning &
    BACKEND_PID=$!
    log "Backend starting (PID $BACKEND_PID)..."

    local retries=0
    local max_retries=30
    while ! curl -sf "$BACKEND_HEALTH_URL" > /dev/null 2>&1; do
        retries=$((retries + 1))
        if [[ $retries -ge $max_retries ]]; then
            log "Backend failed to start after ${max_retries}s"
            exit 1
        fi
        sleep 1
    done
    log "Backend ready"
}

# =============================================================================
# Phase 1b: WebSocket Gateway
# =============================================================================
WS_GATEWAY_DIR="$PROJECT_ROOT/bayit-ws-gateway"

start_ws_gateway() {
    if [[ "$SKIP_GATEWAY" == true ]]; then
        log "Skipping ws-gateway startup (--skip-gateway)"
        return
    fi

    log_section "Starting WebSocket Gateway"

    if curl -sf "$WS_GATEWAY_HEALTH_URL" > /dev/null 2>&1; then
        log "WS gateway already running on port $WS_GATEWAY_PORT"
        return
    fi

    # The ws-gateway overlays main.py + router_registry.py on the backend's app/
    # Same strategy as Docker: run from backend dir with gateway files patched in
    cd "$BACKEND_DIR"
    poetry run python "$SCRIPT_DIR/start-ws-gateway.py" \
        --port "$WS_GATEWAY_PORT" \
        --gateway-dir "$WS_GATEWAY_DIR" &
    WS_GATEWAY_PID=$!
    log "WS gateway starting (PID $WS_GATEWAY_PID)..."

    local retries=0
    local max_retries=30
    while ! curl -sf "$WS_GATEWAY_HEALTH_URL" > /dev/null 2>&1; do
        retries=$((retries + 1))
        if [[ $retries -ge $max_retries ]]; then
            log "WS gateway failed to start after ${max_retries}s"
            exit 1
        fi
        sleep 1
    done
    log "WS gateway ready"
}

# =============================================================================
# Phase 2: Seed Data
# =============================================================================
seed_data() {
    if [[ "$SKIP_SEED" == true ]]; then
        log "Skipping seed (--skip-seed)"
        return
    fi

    log_section "Seeding Test Data"
    cd "$BACKEND_DIR"
    PYTHONPATH="$BACKEND_DIR" poetry run python "$SCRIPT_DIR/seed-test-data.py"
    log "Seed complete"
}

# =============================================================================
# Phase 3: Platform Tests
# =============================================================================

run_ios_tests() {
    log_section "iOS Tests ($IOS_SIMULATOR)"
    cd "$IOS_DIR"
    xcodegen generate 2>/dev/null || true

    local test_filter=""
    if [[ "$FEATURE" != "all" ]]; then
        test_filter="-only-testing:BayitPlusUITests/Discover/${FEATURE}"
    else
        test_filter="-only-testing:BayitPlusUITests/Discover"
    fi

    local start_time
    start_time=$(date +%s)

    xcodebuild test \
        -project BayitPlus.xcodeproj \
        -scheme "$IOS_SCHEME" \
        -destination "platform=iOS Simulator,name=$IOS_SIMULATOR" \
        -derivedDataPath /tmp/discover-derived \
        -enableCodeCoverage YES \
        -resultBundlePath "$REPORT_DIR/ios/results.xcresult" \
        $test_filter \
        2>&1 | tee "$REPORT_DIR/ios/xcodebuild.log" || true

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    local passed
    local failed
    passed=$(grep -c "Test Case.*passed" "$REPORT_DIR/ios/xcodebuild.log" 2>/dev/null || echo "0")
    failed=$(grep -c "Test Case.*failed" "$REPORT_DIR/ios/xcodebuild.log" 2>/dev/null || echo "0")

    echo "iOS: ${passed} passed, ${failed} failed (${duration}s)" >> "$REPORT_FILE"
    log "iOS complete: ${passed} passed, ${failed} failed (${duration}s)"
}

run_tvos_tests() {
    log_section "tvOS Tests ($TVOS_SIMULATOR)"
    cd "$IOS_DIR"

    local test_filter=""
    if [[ "$FEATURE" != "all" ]]; then
        test_filter="-only-testing:BayitPlusUITests/Discover/${FEATURE}"
    else
        test_filter="-only-testing:BayitPlusUITests/Discover"
    fi

    local start_time
    start_time=$(date +%s)

    xcodebuild test \
        -project BayitPlus.xcodeproj \
        -scheme "$IOS_SCHEME" \
        -destination "platform=tvOS Simulator,name=$TVOS_SIMULATOR" \
        -derivedDataPath /tmp/discover-derived-tvos \
        -resultBundlePath "$REPORT_DIR/tvos/results.xcresult" \
        $test_filter \
        2>&1 | tee "$REPORT_DIR/tvos/xcodebuild.log" || true

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    local passed
    local failed
    passed=$(grep -c "Test Case.*passed" "$REPORT_DIR/tvos/xcodebuild.log" 2>/dev/null || echo "0")
    failed=$(grep -c "Test Case.*failed" "$REPORT_DIR/tvos/xcodebuild.log" 2>/dev/null || echo "0")

    echo "tvOS: ${passed} passed, ${failed} failed (${duration}s)" >> "$REPORT_FILE"
    log "tvOS complete: ${passed} passed, ${failed} failed (${duration}s)"
}

run_web_tests() {
    log_section "Web Tests (Playwright)"
    cd "$WEB_DIR"

    local test_filter=""
    if [[ "$FEATURE" != "all" ]]; then
        test_filter="tests/e2e/discover/${FEATURE}.spec.ts"
    else
        test_filter="tests/e2e/discover/"
    fi

    local start_time
    start_time=$(date +%s)

    npx playwright test \
        --config playwright.e2e.config.ts \
        --reporter=html \
        --output "$REPORT_DIR/web/results" \
        "$test_filter" \
        2>&1 | tee "$REPORT_DIR/web/playwright.log" || true

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    local passed
    local failed
    passed=$(grep -c "passed" "$REPORT_DIR/web/playwright.log" 2>/dev/null || echo "0")
    failed=$(grep -c "failed" "$REPORT_DIR/web/playwright.log" 2>/dev/null || echo "0")

    echo "Web: ${passed} passed, ${failed} failed (${duration}s)" >> "$REPORT_FILE"
    log "Web complete: ${passed} passed, ${failed} failed (${duration}s)"
}

run_android_tests() {
    log_section "Android Tests (Gradle)"
    cd "$ANDROID_DIR"

    local test_filter=""
    if [[ "$FEATURE" != "all" ]]; then
        test_filter="-Pandroid.testInstrumentationRunnerArguments.class=tv.bayit.plus.feature.discover.${FEATURE}"
    fi

    local start_time
    start_time=$(date +%s)

    ./gradlew :feature:feature-discover:connectedAndroidTest \
        $test_filter \
        --no-daemon \
        2>&1 | tee "$REPORT_DIR/android/gradle.log" || true

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    local passed
    local failed
    passed=$(grep -c "PASSED" "$REPORT_DIR/android/gradle.log" 2>/dev/null || echo "0")
    failed=$(grep -c "FAILED" "$REPORT_DIR/android/gradle.log" 2>/dev/null || echo "0")

    echo "Android: ${passed} passed, ${failed} failed (${duration}s)" >> "$REPORT_FILE"
    log "Android complete: ${passed} passed, ${failed} failed (${duration}s)"
}

# =============================================================================
# Phase 4: Run
# =============================================================================

{
echo "============================================="
echo "  DISCOVER TAB E2E TEST REPORT"
echo "  Generated: $(timestamp)"
echo "  Platform: $PLATFORM"
echo "  Feature: $FEATURE"
echo "============================================="
echo ""
} > "$REPORT_FILE"

start_backend
start_ws_gateway
seed_data

log_section "Running Platform Tests"

case "$PLATFORM" in
    ios)     run_ios_tests ;;
    tvos)    run_tvos_tests ;;
    web)     run_web_tests ;;
    android) run_android_tests ;;
    all)
        # Run all 4 in parallel
        run_ios_tests &
        PID_IOS=$!
        run_web_tests &
        PID_WEB=$!
        run_android_tests &
        PID_ANDROID=$!

        # tvOS shares the Xcode project with iOS, run after iOS
        wait "$PID_IOS" || true
        run_tvos_tests &
        PID_TVOS=$!

        wait "$PID_WEB" || true
        wait "$PID_ANDROID" || true
        wait "$PID_TVOS" || true
        ;;
    *)
        log "Unknown platform: $PLATFORM"
        exit 1
        ;;
esac

# =============================================================================
# Phase 5: Report
# =============================================================================
log_section "Results"
{
echo ""
echo "============================================="
echo "  SUMMARY"
echo "============================================="
} >> "$REPORT_FILE"

cat "$REPORT_FILE"
log "Full report: $REPORT_FILE"
log "Screenshots: $REPORT_DIR/{ios,tvos,web,android}/"
