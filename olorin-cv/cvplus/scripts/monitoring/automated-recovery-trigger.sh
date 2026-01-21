#!/bin/bash

# CVPlus Level 2 Automated Recovery Trigger
# Monitors system health and automatically initiates recovery when needed
# Task: T052 - Create automated recovery trigger script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RECOVERY_DIR="$PROJECT_ROOT/functions/src/recovery"
LOGS_DIR="$PROJECT_ROOT/logs/automated-recovery"
CONFIG_FILE="$PROJECT_ROOT/recovery-state.json"
TRIGGER_STATE_FILE="$PROJECT_ROOT/automated-recovery-trigger.json"

# Recovery thresholds
HEALTH_THRESHOLD=70          # Trigger recovery if health score below this
CRITICAL_MODULE_COUNT=3      # Trigger if this many modules are critical
FAILED_BUILD_COUNT=3         # Trigger after this many consecutive build failures
MONITORING_INTERVAL=60       # Check interval in seconds
COOLDOWN_PERIOD=1800         # Cooldown between recovery attempts (30 minutes)

# Notification settings
ENABLE_SLACK_NOTIFICATIONS=false
ENABLE_EMAIL_NOTIFICATIONS=false
SLACK_WEBHOOK_URL=""
EMAIL_RECIPIENTS=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Module definitions
MODULES=(
    "auth"
    "i18n"
    "processing"
    "multimedia"
    "analytics"
    "premium"
    "public-profiles"
    "recommendations"
    "admin"
    "workflow"
    "payments"
)

# Recovery strategies
declare -A RECOVERY_STRATEGIES=(
    ["minor"]="dependency_check"
    ["moderate"]="incremental_rebuild"
    ["severe"]="full_recovery"
    ["critical"]="emergency_reset"
)

# Initialize logging
setup_logging() {
    mkdir -p "$LOGS_DIR"
    local log_file="$LOGS_DIR/automated-recovery-$(date +%Y%m%d-%H%M%S).log"
    exec 1> >(tee -a "$log_file")
    exec 2> >(tee -a "$log_file" >&2)
    log_info "Automated recovery trigger started"
}

# Logging functions
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $*" >&2
}

log_warn() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $*" >&2
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $*" >&2
}

# Initialize trigger state
initialize_trigger_state() {
    if [[ ! -f "$TRIGGER_STATE_FILE" ]]; then
        cat > "$TRIGGER_STATE_FILE" << EOF
{
  "triggerState": {
    "isActive": false,
    "lastCheck": null,
    "lastRecoveryAttempt": null,
    "consecutiveFailures": 0,
    "recoveryAttempts": 0,
    "currentSeverity": "none",
    "monitoringStarted": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
  },
  "thresholds": {
    "healthThreshold": $HEALTH_THRESHOLD,
    "criticalModuleCount": $CRITICAL_MODULE_COUNT,
    "failedBuildCount": $FAILED_BUILD_COUNT,
    "monitoringInterval": $MONITORING_INTERVAL,
    "cooldownPeriod": $COOLDOWN_PERIOD
  },
  "statistics": {
    "totalChecks": 0,
    "triggeredRecoveries": 0,
    "successfulRecoveries": 0,
    "failedRecoveries": 0
  }
}
EOF
        log_info "Initialized trigger state file"
    fi
}

# Update trigger state
update_trigger_state() {
    local key="$1"
    local value="$2"

    if command -v jq >/dev/null 2>&1; then
        jq --arg key "$key" --arg value "$value" '.triggerState[$key] = $value' "$TRIGGER_STATE_FILE" > "${TRIGGER_STATE_FILE}.tmp" && mv "${TRIGGER_STATE_FILE}.tmp" "$TRIGGER_STATE_FILE"
    else
        log_warn "jq not available, using basic update"
        sed -i.bak "s/\"$key\": \"[^\"]*\"/\"$key\": \"$value\"/" "$TRIGGER_STATE_FILE"
    fi
}

# Get trigger state value
get_trigger_state() {
    local key="$1"
    if command -v jq >/dev/null 2>&1; then
        jq -r ".triggerState.$key // \"\"" "$TRIGGER_STATE_FILE" 2>/dev/null || echo ""
    else
        grep -o "\"$key\":\"[^\"]*\"" "$TRIGGER_STATE_FILE" 2>/dev/null | cut -d'"' -f4 || echo ""
    fi
}

# Increment counter in trigger state
increment_counter() {
    local counter="$1"
    if command -v jq >/dev/null 2>&1; then
        jq ".statistics.$counter += 1" "$TRIGGER_STATE_FILE" > "${TRIGGER_STATE_FILE}.tmp" && mv "${TRIGGER_STATE_FILE}.tmp" "$TRIGGER_STATE_FILE"
    else
        local current=$(grep -o "\"$counter\": [0-9]*" "$TRIGGER_STATE_FILE" | cut -d' ' -f2)
        local new_value=$((current + 1))
        sed -i.bak "s/\"$counter\": $current/\"$counter\": $new_value/" "$TRIGGER_STATE_FILE"
    fi
}

# Check if we're in cooldown period
is_in_cooldown() {
    local last_recovery=$(get_trigger_state "lastRecoveryAttempt")
    if [[ -z "$last_recovery" || "$last_recovery" == "null" ]]; then
        return 1
    fi

    local last_recovery_epoch=$(date -d "$last_recovery" +%s 2>/dev/null || echo 0)
    local current_epoch=$(date +%s)
    local elapsed=$((current_epoch - last_recovery_epoch))

    [[ $elapsed -lt $COOLDOWN_PERIOD ]]
}

# Get module health score
get_module_health_score() {
    local module="$1"
    local module_path="$PROJECT_ROOT/packages/$module"
    local score=0

    # Check if module exists (20 points)
    if [[ -d "$module_path" ]]; then
        score=$((score + 20))
    else
        return $score
    fi

    # Check if package.json exists (20 points)
    if [[ -f "$module_path/package.json" ]]; then
        score=$((score + 20))
    fi

    # Check if module builds (30 points)
    if cd "$module_path" && npm run build >/dev/null 2>&1; then
        score=$((score + 30))
    fi

    # Check if types are valid (20 points)
    if cd "$module_path" && npm run type-check >/dev/null 2>&1; then
        score=$((score + 20))
    fi

    # Check if tests pass (10 points)
    if cd "$module_path" && npm test >/dev/null 2>&1; then
        score=$((score + 10))
    fi

    echo $score
}

# Get overall system health
get_system_health() {
    local total_score=0
    local module_count=0
    local critical_modules=0

    for module in "${MODULES[@]}"; do
        local health_score=$(get_module_health_score "$module")
        total_score=$((total_score + health_score))
        module_count=$((module_count + 1))

        if [[ $health_score -lt 40 ]]; then
            critical_modules=$((critical_modules + 1))
        fi
    done

    local average_health=$((total_score / module_count))

    echo "{\"averageHealth\": $average_health, \"criticalModules\": $critical_modules, \"totalModules\": $module_count}"
}

# Determine recovery severity
determine_recovery_severity() {
    local health_data="$1"
    local average_health critical_modules

    if command -v jq >/dev/null 2>&1; then
        average_health=$(echo "$health_data" | jq -r '.averageHealth')
        critical_modules=$(echo "$health_data" | jq -r '.criticalModules')
    else
        average_health=$(echo "$health_data" | grep -o '"averageHealth": [0-9]*' | cut -d' ' -f2)
        critical_modules=$(echo "$health_data" | grep -o '"criticalModules": [0-9]*' | cut -d' ' -f2)
    fi

    local consecutive_failures=$(get_trigger_state "consecutiveFailures")

    # Determine severity based on multiple factors
    if [[ $critical_modules -ge 5 ]] || [[ $average_health -lt 30 ]] || [[ $consecutive_failures -ge 5 ]]; then
        echo "critical"
    elif [[ $critical_modules -ge 3 ]] || [[ $average_health -lt 50 ]] || [[ $consecutive_failures -ge 3 ]]; then
        echo "severe"
    elif [[ $critical_modules -ge 1 ]] || [[ $average_health -lt 70 ]] || [[ $consecutive_failures -ge 1 ]]; then
        echo "moderate"
    else
        echo "minor"
    fi
}

# Check if recovery should be triggered
should_trigger_recovery() {
    local health_data="$1"
    local severity="$2"
    local average_health critical_modules

    if command -v jq >/dev/null 2>&1; then
        average_health=$(echo "$health_data" | jq -r '.averageHealth')
        critical_modules=$(echo "$health_data" | jq -r '.criticalModules')
    else
        average_health=$(echo "$health_data" | grep -o '"averageHealth": [0-9]*' | cut -d' ' -f2)
        critical_modules=$(echo "$health_data" | grep -o '"criticalModules": [0-9]*' | cut -d' ' -f2)
    fi

    # Check thresholds
    [[ $average_health -lt $HEALTH_THRESHOLD ]] || [[ $critical_modules -ge $CRITICAL_MODULE_COUNT ]]
}

# Send notification
send_notification() {
    local message="$1"
    local severity="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    log_info "Notification: $message"

    # Slack notification
    if [[ "$ENABLE_SLACK_NOTIFICATIONS" == "true" ]] && [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local color
        case $severity in
            "critical") color="#ff0000" ;;
            "severe") color="#ff8800" ;;
            "moderate") color="#ffaa00" ;;
            *) color="#00aa00" ;;
        esac

        local payload=$(cat << EOF
{
  "attachments": [
    {
      "color": "$color",
      "title": "CVPlus Automated Recovery Alert",
      "text": "$message",
      "footer": "CVPlus Recovery System",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || log_warn "Failed to send Slack notification"
    fi

    # Email notification (basic implementation)
    if [[ "$ENABLE_EMAIL_NOTIFICATIONS" == "true" ]] && [[ -n "$EMAIL_RECIPIENTS" ]] && command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "CVPlus Recovery Alert [$severity] - $timestamp" "$EMAIL_RECIPIENTS" || log_warn "Failed to send email notification"
    fi
}

# Execute recovery strategy
execute_recovery() {
    local severity="$1"
    local strategy="${RECOVERY_STRATEGIES[$severity]}"

    log_info "Executing recovery strategy: $strategy (severity: $severity)"

    update_trigger_state "lastRecoveryAttempt" "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
    update_trigger_state "currentSeverity" "$severity"
    increment_counter "triggeredRecoveries"

    send_notification "🚨 Automated recovery initiated with severity: $severity" "$severity"

    local recovery_success=false

    case $strategy in
        "dependency_check")
            log_info "Running dependency validation..."
            if [[ -f "$SCRIPT_DIR/../recovery/validate-dependencies.sh" ]]; then
                if bash "$SCRIPT_DIR/../recovery/validate-dependencies.sh"; then
                    recovery_success=true
                fi
            fi
            ;;

        "incremental_rebuild")
            log_info "Running incremental rebuild..."
            local failed_modules=0
            for module in "${MODULES[@]}"; do
                local health_score=$(get_module_health_score "$module")
                if [[ $health_score -lt 70 ]]; then
                    log_info "Rebuilding module: $module"
                    local module_path="$PROJECT_ROOT/packages/$module"
                    if [[ -d "$module_path" ]]; then
                        cd "$module_path"
                        if ! npm run build >/dev/null 2>&1; then
                            failed_modules=$((failed_modules + 1))
                        fi
                    fi
                fi
            done

            if [[ $failed_modules -eq 0 ]]; then
                recovery_success=true
            fi
            ;;

        "full_recovery")
            log_info "Running full recovery process..."
            if [[ -f "$SCRIPT_DIR/../recovery/build-recovery.sh" ]]; then
                if bash "$SCRIPT_DIR/../recovery/build-recovery.sh"; then
                    recovery_success=true
                fi
            fi
            ;;

        "emergency_reset")
            log_info "Executing emergency reset..."
            # Clear recovery state and rebuild everything
            rm -f "$CONFIG_FILE" 2>/dev/null || true

            if [[ -f "$SCRIPT_DIR/../recovery/build-recovery.sh" ]]; then
                if bash "$SCRIPT_DIR/../recovery/build-recovery.sh" --force; then
                    recovery_success=true
                fi
            fi
            ;;
    esac

    if $recovery_success; then
        log_success "Recovery strategy '$strategy' completed successfully"
        increment_counter "successfulRecoveries"
        update_trigger_state "consecutiveFailures" "0"
        send_notification "✅ Automated recovery completed successfully" "success"
    else
        log_error "Recovery strategy '$strategy' failed"
        increment_counter "failedRecoveries"
        local consecutive_failures=$(get_trigger_state "consecutiveFailures")
        update_trigger_state "consecutiveFailures" "$((consecutive_failures + 1))"
        send_notification "❌ Automated recovery failed for strategy: $strategy" "error"
    fi

    return $recovery_success
}

# Main monitoring loop
monitor_system_health() {
    log_info "Starting system health monitoring..."
    log_info "Health threshold: $HEALTH_THRESHOLD%, Critical module threshold: $CRITICAL_MODULE_COUNT"
    log_info "Monitoring interval: ${MONITORING_INTERVAL}s, Cooldown period: ${COOLDOWN_PERIOD}s"

    while true; do
        update_trigger_state "lastCheck" "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
        increment_counter "totalChecks"

        log_info "Performing health check..."

        # Get system health
        local health_data=$(get_system_health)
        local severity=$(determine_recovery_severity "$health_data")

        if command -v jq >/dev/null 2>&1; then
            local average_health=$(echo "$health_data" | jq -r '.averageHealth')
            local critical_modules=$(echo "$health_data" | jq -r '.criticalModules')
        else
            local average_health=$(echo "$health_data" | grep -o '"averageHealth": [0-9]*' | cut -d' ' -f2)
            local critical_modules=$(echo "$health_data" | grep -o '"criticalModules": [0-9]*' | cut -d' ' -f2)
        fi

        log_info "System health: ${average_health}%, Critical modules: $critical_modules, Severity: $severity"

        # Check if recovery should be triggered
        if should_trigger_recovery "$health_data" "$severity"; then
            if is_in_cooldown; then
                local last_recovery=$(get_trigger_state "lastRecoveryAttempt")
                log_warn "Recovery needed but in cooldown period (last attempt: $last_recovery)"
            else
                log_warn "Health thresholds exceeded, triggering automated recovery"
                execute_recovery "$severity"
            fi
        else
            log_info "System health within acceptable parameters"
            # Reset consecutive failures on successful check
            update_trigger_state "consecutiveFailures" "0"
        fi

        # Sleep until next check
        sleep "$MONITORING_INTERVAL"
    done
}

# Start monitoring in daemon mode
start_daemon() {
    local pid_file="$LOGS_DIR/automated-recovery.pid"

    if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "Automated recovery trigger is already running (PID: $(cat "$pid_file"))"
        exit 1
    fi

    echo "Starting automated recovery trigger in daemon mode..."

    # Start in background
    nohup "$0" --monitor > "$LOGS_DIR/daemon.log" 2>&1 &
    local daemon_pid=$!

    echo $daemon_pid > "$pid_file"
    echo "Automated recovery trigger started with PID: $daemon_pid"
    echo "Logs: $LOGS_DIR/daemon.log"
}

# Stop daemon
stop_daemon() {
    local pid_file="$LOGS_DIR/automated-recovery.pid"

    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping automated recovery trigger (PID: $pid)..."
            kill "$pid"
            rm -f "$pid_file"
            echo "Automated recovery trigger stopped"
        else
            echo "Process not running, cleaning up PID file"
            rm -f "$pid_file"
        fi
    else
        echo "Automated recovery trigger is not running"
    fi
}

# Show status
show_status() {
    local pid_file="$LOGS_DIR/automated-recovery.pid"

    echo "CVPlus Automated Recovery Trigger Status:"
    echo "========================================"

    if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "Status: RUNNING (PID: $(cat "$pid_file"))"
    else
        echo "Status: STOPPED"
    fi

    if [[ -f "$TRIGGER_STATE_FILE" ]]; then
        echo
        echo "Statistics:"
        if command -v jq >/dev/null 2>&1; then
            jq -r '.statistics | to_entries[] | "\(.key): \(.value)"' "$TRIGGER_STATE_FILE"
        else
            grep -o '"[^"]*": [0-9]*' "$TRIGGER_STATE_FILE" | sed 's/"//g'
        fi

        echo
        echo "Last Check: $(get_trigger_state "lastCheck")"
        echo "Last Recovery: $(get_trigger_state "lastRecoveryAttempt")"
        echo "Current Severity: $(get_trigger_state "currentSeverity")"
    fi
}

# Print usage information
print_usage() {
    echo "CVPlus Automated Recovery Trigger"
    echo
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  start                 Start monitoring daemon"
    echo "  stop                  Stop monitoring daemon"
    echo "  status                Show current status"
    echo "  monitor               Run monitoring loop (internal)"
    echo "  test                  Run one-time health check"
    echo "  reset                 Reset trigger state"
    echo
    echo "Options:"
    echo "  --health-threshold N  Set health threshold (default: $HEALTH_THRESHOLD)"
    echo "  --critical-count N    Set critical module count (default: $CRITICAL_MODULE_COUNT)"
    echo "  --interval N          Set monitoring interval in seconds (default: $MONITORING_INTERVAL)"
    echo "  --cooldown N          Set cooldown period in seconds (default: $COOLDOWN_PERIOD)"
    echo "  --enable-slack        Enable Slack notifications"
    echo "  --enable-email        Enable email notifications"
    echo "  --slack-webhook URL   Set Slack webhook URL"
    echo "  --email-recipients    Set email recipients"
    echo "  -h, --help           Show this help message"
}

# Run one-time test
run_test() {
    echo "Running one-time health check..."

    local health_data=$(get_system_health)
    local severity=$(determine_recovery_severity "$health_data")

    if command -v jq >/dev/null 2>&1; then
        local average_health=$(echo "$health_data" | jq -r '.averageHealth')
        local critical_modules=$(echo "$health_data" | jq -r '.criticalModules')
        local total_modules=$(echo "$health_data" | jq -r '.totalModules')
    else
        local average_health=$(echo "$health_data" | grep -o '"averageHealth": [0-9]*' | cut -d' ' -f2)
        local critical_modules=$(echo "$health_data" | grep -o '"criticalModules": [0-9]*' | cut -d' ' -f2)
        local total_modules=$(echo "$health_data" | grep -o '"totalModules": [0-9]*' | cut -d' ' -f2)
    fi

    echo "Results:"
    echo "  Average Health: ${average_health}%"
    echo "  Critical Modules: $critical_modules/$total_modules"
    echo "  Severity Level: $severity"
    echo "  Recovery Needed: $(should_trigger_recovery "$health_data" "$severity" && echo "YES" || echo "NO")"

    if should_trigger_recovery "$health_data" "$severity"; then
        echo "  Recommended Strategy: ${RECOVERY_STRATEGIES[$severity]}"
    fi
}

# Reset trigger state
reset_state() {
    echo "Resetting trigger state..."
    rm -f "$TRIGGER_STATE_FILE" "$CONFIG_FILE"
    initialize_trigger_state
    echo "Trigger state reset complete"
}

# Main function
main() {
    local command=""

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            start|stop|status|monitor|test|reset)
                command="$1"
                shift
                ;;
            --health-threshold)
                HEALTH_THRESHOLD="$2"
                shift 2
                ;;
            --critical-count)
                CRITICAL_MODULE_COUNT="$2"
                shift 2
                ;;
            --interval)
                MONITORING_INTERVAL="$2"
                shift 2
                ;;
            --cooldown)
                COOLDOWN_PERIOD="$2"
                shift 2
                ;;
            --enable-slack)
                ENABLE_SLACK_NOTIFICATIONS=true
                shift
                ;;
            --enable-email)
                ENABLE_EMAIL_NOTIFICATIONS=true
                shift
                ;;
            --slack-webhook)
                SLACK_WEBHOOK_URL="$2"
                ENABLE_SLACK_NOTIFICATIONS=true
                shift 2
                ;;
            --email-recipients)
                EMAIL_RECIPIENTS="$2"
                ENABLE_EMAIL_NOTIFICATIONS=true
                shift 2
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Set default command
    if [[ -z "$command" ]]; then
        command="start"
    fi

    # Initialize state
    initialize_trigger_state

    # Change to project root
    cd "$PROJECT_ROOT"

    # Execute command
    case $command in
        "start")
            start_daemon
            ;;
        "stop")
            stop_daemon
            ;;
        "status")
            show_status
            ;;
        "monitor")
            setup_logging
            monitor_system_health
            ;;
        "test")
            run_test
            ;;
        "reset")
            reset_state
            ;;
        *)
            echo "Unknown command: $command"
            print_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"