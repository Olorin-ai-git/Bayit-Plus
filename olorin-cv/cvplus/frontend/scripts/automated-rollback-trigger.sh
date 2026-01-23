#!/bin/bash

# CVPlus Automated Rollback Trigger
# Monitors deployment health and triggers rollback if critical thresholds exceeded
# Author: Claude
# Date: 2026-01-22

set -e

# Configuration
FRONTEND_URL="${FRONTEND_URL:-https://cvplus.web.app}"
HEALTH_CHECK_INTERVAL=30  # seconds
MAX_FAILURES=3
RESPONSE_TIME_THRESHOLD=5000  # milliseconds

# State tracking
CONSECUTIVE_FAILURES=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# Health check function
check_frontend_health() {
    local start_time=$(date +%s%3N)

    # Perform HTTP request
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" --max-time 10)

    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))

    # Check HTTP status code
    if [ "$http_code" != "200" ]; then
        log_error "Frontend returned HTTP $http_code"
        return 1
    fi

    # Check response time
    if [ "$response_time" -gt "$RESPONSE_TIME_THRESHOLD" ]; then
        log_warn "Response time ${response_time}ms exceeds threshold ${RESPONSE_TIME_THRESHOLD}ms"
        return 1
    fi

    log_info "Health check passed (${response_time}ms)"
    return 0
}

# Trigger rollback function
trigger_rollback() {
    log_error "🚨 CRITICAL: Triggering automated rollback"

    # Check if Firebase CLI is available
    if ! command -v firebase &> /dev/null; then
        log_error "Firebase CLI not found. Install with: npm install -g firebase-tools"
        exit 1
    fi

    # Trigger Firebase Hosting rollback
    log_info "Executing Firebase Hosting rollback..."

    if firebase hosting:rollback --project "${FIREBASE_PROJECT_ID:-cvplus-production}" --yes; then
        log_info "✅ Rollback completed successfully"

        # Send notification (placeholder - integrate with your notification system)
        log_info "📧 Sending rollback notification..."
        echo "Frontend rollback triggered at $(date)" | mail -s "CVPlus Rollback Alert" "${ALERT_EMAIL:-admin@cvplus.com}" || true

        # Reset failure counter
        CONSECUTIVE_FAILURES=0

        return 0
    else
        log_error "❌ Rollback failed"
        return 1
    fi
}

# Main monitoring loop
monitor_deployment() {
    log_info "Starting automated rollback monitoring"
    log_info "Frontend URL: $FRONTEND_URL"
    log_info "Check interval: ${HEALTH_CHECK_INTERVAL}s"
    log_info "Failure threshold: $MAX_FAILURES consecutive failures"

    while true; do
        if check_frontend_health; then
            # Health check passed - reset failure counter
            CONSECUTIVE_FAILURES=0
        else
            # Health check failed - increment counter
            CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
            log_warn "Consecutive failures: $CONSECUTIVE_FAILURES / $MAX_FAILURES"

            # Trigger rollback if threshold exceeded
            if [ "$CONSECUTIVE_FAILURES" -ge "$MAX_FAILURES" ]; then
                trigger_rollback

                # Exit after rollback (monitoring system will restart)
                exit 0
            fi
        fi

        # Wait before next check
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Show usage
show_usage() {
    cat << EOF
CVPlus Automated Rollback Trigger

USAGE:
    $0 [COMMAND]

COMMANDS:
    monitor     Start continuous monitoring (default)
    check       Perform single health check
    rollback    Trigger immediate rollback
    help        Show this help message

ENVIRONMENT VARIABLES:
    FRONTEND_URL                Frontend URL to monitor (default: https://cvplus.web.app)
    HEALTH_CHECK_INTERVAL       Seconds between health checks (default: 30)
    MAX_FAILURES                Consecutive failures before rollback (default: 3)
    RESPONSE_TIME_THRESHOLD     Max response time in ms (default: 5000)
    FIREBASE_PROJECT_ID         Firebase project ID (default: cvplus-production)
    ALERT_EMAIL                 Email for rollback notifications (default: admin@cvplus.com)

EXAMPLES:
    # Start monitoring with defaults
    $0 monitor

    # Monitor with custom URL and interval
    FRONTEND_URL=https://cvplus-staging.web.app HEALTH_CHECK_INTERVAL=60 $0 monitor

    # Perform single health check
    $0 check

    # Trigger immediate rollback
    $0 rollback
EOF
}

# Parse command
COMMAND="${1:-monitor}"

case "$COMMAND" in
    monitor)
        monitor_deployment
        ;;
    check)
        if check_frontend_health; then
            echo "✅ Frontend is healthy"
            exit 0
        else
            echo "❌ Frontend health check failed"
            exit 1
        fi
        ;;
    rollback)
        trigger_rollback
        ;;
    help|--help|-h)
        show_usage
        exit 0
        ;;
    *)
        echo "Unknown command: $COMMAND"
        show_usage
        exit 1
        ;;
esac
