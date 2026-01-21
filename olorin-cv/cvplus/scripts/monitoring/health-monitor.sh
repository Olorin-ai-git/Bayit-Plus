#!/bin/bash

# CVPlus Level 2 Recovery System - Health Monitoring Script
# Continuous monitoring of workspace and module health with alerting

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." &> /dev/null && pwd)"
LOG_DIR="$ROOT_DIR/logs/monitoring"
ALERTS_DIR="$ROOT_DIR/logs/alerts"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/health-monitor-$TIMESTAMP.log"

# CVPlus Level 2 modules
ALL_MODULES=("auth" "i18n" "processing" "multimedia" "analytics" "premium" "public-profiles" "recommendations" "admin" "workflow" "payments")

# Monitoring configuration
MONITOR_INTERVAL=60          # seconds between health checks
ALERT_THRESHOLD=70          # health score below which to alert
CRITICAL_THRESHOLD=30       # health score below which to send critical alerts
CONTINUOUS_MODE=false
DAEMON_MODE=false
ALERT_ENABLED=true
REPORT_INTERVAL=300         # seconds between status reports
CHECK_COUNT=0
TOTAL_CHECKS=0
PID_FILE="$LOG_DIR/health-monitor.pid"

# Alert configuration
ALERT_EMAIL=""
ALERT_WEBHOOK=""
ALERT_SLACK=""
SLACK_CHANNEL=""

# Health tracking
declare -A MODULE_HEALTH_HISTORY
declare -A MODULE_ALERT_SENT
declare -A MODULE_RECOVERY_SUGGESTED

# Function to print formatted output
print_status() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "CRITICAL")
            echo -e "${RED}[CRITICAL]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "HEALTH")
            echo -e "${CYAN}[HEALTH]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "ALERT")
            echo -e "${PURPLE}[ALERT]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Function to show usage
show_usage() {
    cat << EOF
CVPlus Level 2 Recovery System - Health Monitoring Script

Usage: $0 [OPTIONS] [MODULES...]

OPTIONS:
    -c, --continuous          Run in continuous monitoring mode
    -d, --daemon              Run as background daemon
    -i, --interval SECONDS    Monitoring interval in seconds (default: 60)
    -t, --threshold SCORE     Alert threshold health score (default: 70)
    -C, --critical SCORE      Critical alert threshold (default: 30)
    -r, --report-interval SEC Status report interval in seconds (default: 300)
    -a, --no-alerts           Disable alerting
    -e, --email EMAIL         Alert email address
    -w, --webhook URL         Alert webhook URL
    -s, --slack URL           Slack webhook URL
    --slack-channel CHANNEL   Slack channel name
    -p, --pid-file FILE       PID file location (default: logs/monitoring/health-monitor.pid)
    -h, --help                Show this help message

DAEMON OPERATIONS:
    start                     Start monitoring daemon
    stop                      Stop monitoring daemon
    restart                   Restart monitoring daemon
    status                    Show daemon status

MODULES:
    If no modules specified, all modules will be monitored.
    Valid modules: ${ALL_MODULES[*]}

EXAMPLES:
    $0 --continuous                                 # Continuous monitoring all modules
    $0 --daemon start                              # Start as background daemon
    $0 --threshold 80 --critical 40               # Custom alert thresholds
    $0 --email admin@example.com --webhook http://... # With alerting
    $0 auth i18n processing                        # Monitor specific modules only

MONITORING FEATURES:
    - Real-time health scoring
    - Trend analysis and prediction
    - Automatic alert escalation
    - Recovery recommendation system
    - Performance metrics tracking
    - Integration with recovery system

HEALTH SCORING:
    90-100: Healthy (green)
    70-89:  Degraded (yellow)
    30-69:  Critical (orange)
    0-29:   Offline (red)

EOF
}

# Function to parse command line arguments
parse_args() {
    local target_modules=()

    while [[ $# -gt 0 ]]; do
        case $1 in
            -c|--continuous)
                CONTINUOUS_MODE=true
                shift
                ;;
            -d|--daemon)
                DAEMON_MODE=true
                shift
                ;;
            -i|--interval)
                MONITOR_INTERVAL="$2"
                shift 2
                ;;
            -t|--threshold)
                ALERT_THRESHOLD="$2"
                shift 2
                ;;
            -C|--critical)
                CRITICAL_THRESHOLD="$2"
                shift 2
                ;;
            -r|--report-interval)
                REPORT_INTERVAL="$2"
                shift 2
                ;;
            -a|--no-alerts)
                ALERT_ENABLED=false
                shift
                ;;
            -e|--email)
                ALERT_EMAIL="$2"
                shift 2
                ;;
            -w|--webhook)
                ALERT_WEBHOOK="$2"
                shift 2
                ;;
            -s|--slack)
                ALERT_SLACK="$2"
                shift 2
                ;;
            --slack-channel)
                SLACK_CHANNEL="$2"
                shift 2
                ;;
            -p|--pid-file)
                PID_FILE="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            start|stop|restart|status)
                daemon_operation "$1"
                exit $?
                ;;
            -*)
                print_status "ERROR" "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                # Validate module name
                if [[ " ${ALL_MODULES[*]} " =~ " $1 " ]]; then
                    target_modules+=("$1")
                else
                    print_status "ERROR" "Invalid module: $1"
                    print_status "INFO" "Valid modules: ${ALL_MODULES[*]}"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # If specific modules were provided, use them; otherwise use all modules
    if [[ ${#target_modules[@]} -gt 0 ]]; then
        ALL_MODULES=("${target_modules[@]}")
    fi
}

# Function to setup logging and environment
setup_environment() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$ALERTS_DIR"

    print_status "INFO" "Starting CVPlus Health Monitoring"
    print_status "INFO" "Log file: $LOG_FILE"
    print_status "INFO" "Monitoring modules: ${ALL_MODULES[*]}"
    print_status "INFO" "Configuration: Interval=${MONITOR_INTERVAL}s, AlertThreshold=$ALERT_THRESHOLD, CriticalThreshold=$CRITICAL_THRESHOLD"
    print_status "INFO" "Alerts: Enabled=$ALERT_ENABLED, Email=$ALERT_EMAIL, Webhook=$ALERT_WEBHOOK, Slack=$ALERT_SLACK"

    # Initialize health history
    for module in "${ALL_MODULES[@]}"; do
        MODULE_HEALTH_HISTORY[$module]=""
        MODULE_ALERT_SENT[$module]="false"
        MODULE_RECOVERY_SUGGESTED[$module]="false"
    done
}

# Function to check module health
check_module_health() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"
    local health_score=100
    local status="healthy"
    local issues=()
    local recommendations=()

    print_status "HEALTH" "Checking health for module: $module"

    # Check if module directory exists
    if [[ ! -d "$module_path" ]]; then
        print_status "ERROR" "Module directory not found: $module_path"
        return 1
    fi

    # Check package.json validity
    if [[ ! -f "$module_path/package.json" ]]; then
        issues+=("Missing package.json")
        health_score=$((health_score - 30))
    elif ! jq empty "$module_path/package.json" 2>/dev/null; then
        issues+=("Invalid package.json format")
        health_score=$((health_score - 25))
    fi

    # Check TypeScript configuration
    if [[ ! -f "$module_path/tsconfig.json" ]]; then
        issues+=("Missing tsconfig.json")
        health_score=$((health_score - 15))
        recommendations+=("Add TypeScript configuration")
    fi

    # Check source directory
    if [[ ! -d "$module_path/src" ]]; then
        issues+=("Missing src directory")
        health_score=$((health_score - 20))
        recommendations+=("Create source directory structure")
    elif [[ -z "$(ls -A "$module_path/src" 2>/dev/null)" ]]; then
        issues+=("Empty src directory")
        health_score=$((health_score - 15))
    fi

    # Check for build artifacts
    if [[ ! -d "$module_path/dist" ]]; then
        issues+=("Missing build artifacts")
        health_score=$((health_score - 10))
        recommendations+=("Run build process")
    elif [[ -z "$(ls -A "$module_path/dist" 2>/dev/null)" ]]; then
        issues+=("Empty dist directory")
        health_score=$((health_score - 8))
    fi

    # Check node_modules
    if [[ ! -d "$module_path/node_modules" ]]; then
        issues+=("Missing node_modules")
        health_score=$((health_score - 15))
        recommendations+=("Run npm install")
    fi

    # Check for lock file
    if [[ ! -f "$module_path/package-lock.json" ]] && [[ ! -f "$module_path/yarn.lock" ]]; then
        issues+=("Missing lock file")
        health_score=$((health_score - 5))
    fi

    # Check for TypeScript compilation issues
    if [[ -f "$module_path/tsconfig.json" ]] && [[ -d "$module_path/src" ]]; then
        if command -v npx &> /dev/null; then
            if ! (cd "$module_path" && npx tsc --noEmit --skipLibCheck 2>/dev/null); then
                issues+=("TypeScript compilation errors")
                health_score=$((health_score - 12))
                recommendations+=("Fix TypeScript errors")
            fi
        fi
    fi

    # Check file permissions
    if [[ ! -r "$module_path/package.json" ]]; then
        issues+=("Package.json not readable")
        health_score=$((health_score - 5))
    fi

    # Performance checks
    if [[ -d "$module_path/node_modules" ]]; then
        local node_modules_size=$(du -sm "$module_path/node_modules" 2>/dev/null | cut -f1 || echo 0)
        if [[ $node_modules_size -gt 500 ]]; then
            issues+=("Large node_modules ($node_modules_size MB)")
            health_score=$((health_score - 3))
            recommendations+=("Consider dependency cleanup")
        fi
    fi

    # Determine health status
    if [[ $health_score -ge 90 ]]; then
        status="healthy"
    elif [[ $health_score -ge 70 ]]; then
        status="degraded"
    elif [[ $health_score -ge 30 ]]; then
        status="critical"
    else
        status="offline"
    fi

    # Ensure health score is not negative
    health_score=$((health_score < 0 ? 0 : health_score))

    # Update health history
    local current_time=$(date +%s)
    if [[ -n "${MODULE_HEALTH_HISTORY[$module]}" ]]; then
        MODULE_HEALTH_HISTORY[$module]="${MODULE_HEALTH_HISTORY[$module]},$current_time:$health_score"
    else
        MODULE_HEALTH_HISTORY[$module]="$current_time:$health_score"
    fi

    # Keep only last 10 health readings
    local history_array=($(echo "${MODULE_HEALTH_HISTORY[$module]}" | tr ',' '\n'))
    if [[ ${#history_array[@]} -gt 10 ]]; then
        MODULE_HEALTH_HISTORY[$module]=$(printf "%s," "${history_array[@]: -10}" | sed 's/,$//')
    fi

    # Print health results
    local color=$GREEN
    case $status in
        "degraded") color=$YELLOW ;;
        "critical") color=$RED ;;
        "offline") color=$RED ;;
    esac

    print_status "HEALTH" "Module $module: ${color}$status${NC} (score: $health_score/100)"

    if [[ ${#issues[@]} -gt 0 ]]; then
        for issue in "${issues[@]}"; do
            print_status "WARNING" "  Issue: $issue"
        done
    fi

    if [[ ${#recommendations[@]} -gt 0 ]]; then
        for rec in "${recommendations[@]}"; do
            print_status "INFO" "  Recommendation: $rec"
        done
    fi

    # Check if alerting is needed
    if [[ "$ALERT_ENABLED" == true ]]; then
        check_alert_conditions "$module" "$health_score" "$status" "${issues[*]}" "${recommendations[*]}"
    fi

    return 0
}

# Function to check alert conditions
check_alert_conditions() {
    local module=$1
    local health_score=$2
    local status=$3
    local issues=$4
    local recommendations=$5

    # Critical alerts
    if [[ $health_score -le $CRITICAL_THRESHOLD ]]; then
        if [[ "${MODULE_ALERT_SENT[$module]}" != "critical" ]]; then
            send_alert "critical" "$module" "$health_score" "$status" "$issues" "$recommendations"
            MODULE_ALERT_SENT[$module]="critical"
        fi
    # Warning alerts
    elif [[ $health_score -le $ALERT_THRESHOLD ]]; then
        if [[ "${MODULE_ALERT_SENT[$module]}" != "warning" ]] && [[ "${MODULE_ALERT_SENT[$module]}" != "critical" ]]; then
            send_alert "warning" "$module" "$health_score" "$status" "$issues" "$recommendations"
            MODULE_ALERT_SENT[$module]="warning"
        fi
    # Recovery alerts (health improved)
    elif [[ $health_score -gt $ALERT_THRESHOLD ]] && [[ "${MODULE_ALERT_SENT[$module]}" != "false" ]]; then
        send_alert "recovery" "$module" "$health_score" "$status" "$issues" "$recommendations"
        MODULE_ALERT_SENT[$module]="false"
    fi

    # Suggest recovery if health is consistently low
    if [[ $health_score -le $ALERT_THRESHOLD ]] && [[ "${MODULE_RECOVERY_SUGGESTED[$module]}" != "true" ]]; then
        suggest_recovery "$module" "$health_score" "$issues" "$recommendations"
        MODULE_RECOVERY_SUGGESTED[$module]="true"
    elif [[ $health_score -gt $ALERT_THRESHOLD ]]; then
        MODULE_RECOVERY_SUGGESTED[$module]="false"
    fi
}

# Function to send alerts
send_alert() {
    local severity=$1
    local module=$2
    local health_score=$3
    local status=$4
    local issues=$5
    local recommendations=$6

    local alert_message="CVPlus Health Alert: Module $module is $status (score: $health_score/100)"
    if [[ -n "$issues" ]]; then
        alert_message+="\nIssues: $issues"
    fi
    if [[ -n "$recommendations" ]]; then
        alert_message+="\nRecommendations: $recommendations"
    fi

    print_status "ALERT" "$severity alert for $module: $alert_message"

    # Save alert to file
    local alert_file="$ALERTS_DIR/alert-$module-$(date +%Y%m%d_%H%M%S).json"
    cat > "$alert_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "severity": "$severity",
  "module": "$module",
  "health_score": $health_score,
  "status": "$status",
  "issues": "$issues",
  "recommendations": "$recommendations",
  "alert_message": "$alert_message"
}
EOF

    # Send email alert
    if [[ -n "$ALERT_EMAIL" ]] && command -v mail &> /dev/null; then
        echo "$alert_message" | mail -s "CVPlus Health Alert: $module $severity" "$ALERT_EMAIL" 2>/dev/null || true
    fi

    # Send webhook alert
    if [[ -n "$ALERT_WEBHOOK" ]] && command -v curl &> /dev/null; then
        curl -X POST -H "Content-Type: application/json" \
             -d "{\"module\":\"$module\",\"severity\":\"$severity\",\"health_score\":$health_score,\"message\":\"$alert_message\"}" \
             "$ALERT_WEBHOOK" 2>/dev/null || true
    fi

    # Send Slack alert
    if [[ -n "$ALERT_SLACK" ]] && command -v curl &> /dev/null; then
        local slack_color="good"
        case $severity in
            "critical") slack_color="danger" ;;
            "warning") slack_color="warning" ;;
        esac

        local slack_payload="{\"channel\":\"${SLACK_CHANNEL:-#alerts}\",\"attachments\":[{\"color\":\"$slack_color\",\"title\":\"CVPlus Health Alert\",\"text\":\"$alert_message\"}]}"
        curl -X POST -H "Content-Type: application/json" \
             -d "$slack_payload" \
             "$ALERT_SLACK" 2>/dev/null || true
    fi
}

# Function to suggest recovery
suggest_recovery() {
    local module=$1
    local health_score=$2
    local issues=$3
    local recommendations=$4

    print_status "INFO" "Recovery suggestion for module $module (score: $health_score)"

    local recovery_script="$ROOT_DIR/scripts/recovery/build-recovery.sh"
    if [[ -f "$recovery_script" ]]; then
        print_status "INFO" "Suggested recovery command: $recovery_script $module"

        # Auto-trigger recovery if score is critically low and auto-recovery is enabled
        if [[ $health_score -le $CRITICAL_THRESHOLD ]] && [[ "${AUTO_RECOVERY:-false}" == "true" ]]; then
            print_status "WARNING" "Auto-triggering recovery for critically low health score"
            if "$recovery_script" "$module" --force 2>&1 | tee -a "$LOG_FILE"; then
                print_status "SUCCESS" "Auto-recovery completed for $module"
            else
                print_status "ERROR" "Auto-recovery failed for $module"
            fi
        fi
    fi
}

# Function to generate health report
generate_health_report() {
    local report_file="$LOG_DIR/health-report-$(date +%Y%m%d_%H%M%S).json"
    local total_modules=${#ALL_MODULES[@]}
    local healthy_modules=0
    local degraded_modules=0
    local critical_modules=0
    local offline_modules=0
    local total_score=0

    # Calculate statistics
    for module in "${ALL_MODULES[@]}"; do
        # Get latest health score from history
        local history="${MODULE_HEALTH_HISTORY[$module]}"
        if [[ -n "$history" ]]; then
            local latest_entry=$(echo "$history" | tr ',' '\n' | tail -1)
            local score=$(echo "$latest_entry" | cut -d':' -f2)
            total_score=$((total_score + score))

            if [[ $score -ge 90 ]]; then
                healthy_modules=$((healthy_modules + 1))
            elif [[ $score -ge 70 ]]; then
                degraded_modules=$((degraded_modules + 1))
            elif [[ $score -ge 30 ]]; then
                critical_modules=$((critical_modules + 1))
            else
                offline_modules=$((offline_modules + 1))
            fi
        else
            offline_modules=$((offline_modules + 1))
        fi
    done

    local average_score=0
    if [[ $total_modules -gt 0 ]]; then
        average_score=$((total_score / total_modules))
    fi

    # Determine overall workspace health
    local workspace_status="healthy"
    if [[ $average_score -lt 90 ]] && [[ $healthy_modules -lt $((total_modules * 80 / 100)) ]]; then
        workspace_status="degraded"
    fi
    if [[ $average_score -lt 70 ]] || [[ $critical_modules -gt 0 ]] || [[ $offline_modules -gt 0 ]]; then
        workspace_status="critical"
    fi

    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "check_count": $CHECK_COUNT,
  "total_checks": $TOTAL_CHECKS,
  "workspace_health": {
    "status": "$workspace_status",
    "average_score": $average_score,
    "total_modules": $total_modules,
    "healthy_modules": $healthy_modules,
    "degraded_modules": $degraded_modules,
    "critical_modules": $critical_modules,
    "offline_modules": $offline_modules
  },
  "module_details": [
$(for module in "${ALL_MODULES[@]}"; do
    local history="${MODULE_HEALTH_HISTORY[$module]}"
    local latest_score=0
    local latest_status="unknown"

    if [[ -n "$history" ]]; then
        local latest_entry=$(echo "$history" | tr ',' '\n' | tail -1)
        latest_score=$(echo "$latest_entry" | cut -d':' -f2)

        if [[ $latest_score -ge 90 ]]; then
            latest_status="healthy"
        elif [[ $latest_score -ge 70 ]]; then
            latest_status="degraded"
        elif [[ $latest_score -ge 30 ]]; then
            latest_status="critical"
        else
            latest_status="offline"
        fi
    fi

    echo "    {\"module\":\"$module\",\"score\":$latest_score,\"status\":\"$latest_status\",\"alert_sent\":\"${MODULE_ALERT_SENT[$module]}\",\"recovery_suggested\":\"${MODULE_RECOVERY_SUGGESTED[$module]}\"}"
done | paste -sd ',' -)
  ],
  "configuration": {
    "monitor_interval": $MONITOR_INTERVAL,
    "alert_threshold": $ALERT_THRESHOLD,
    "critical_threshold": $CRITICAL_THRESHOLD,
    "alerts_enabled": $ALERT_ENABLED
  }
}
EOF

    print_status "INFO" "Health report generated: $report_file"
    print_status "INFO" "Workspace Status: $workspace_status (Average Score: $average_score/100)"
    print_status "INFO" "Module Distribution: Healthy=$healthy_modules, Degraded=$degraded_modules, Critical=$critical_modules, Offline=$offline_modules"
}

# Function to handle daemon operations
daemon_operation() {
    local operation=$1

    case $operation in
        "start")
            if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
                print_status "WARNING" "Health monitor daemon is already running (PID: $(cat "$PID_FILE"))"
                exit 1
            fi

            print_status "INFO" "Starting health monitor daemon"
            nohup "$0" --continuous --daemon > "$LOG_DIR/daemon.log" 2>&1 &
            echo $! > "$PID_FILE"
            print_status "SUCCESS" "Health monitor daemon started (PID: $!)"
            ;;
        "stop")
            if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
                local pid=$(cat "$PID_FILE")
                kill "$pid"
                rm -f "$PID_FILE"
                print_status "SUCCESS" "Health monitor daemon stopped (PID: $pid)"
            else
                print_status "WARNING" "Health monitor daemon is not running"
                exit 1
            fi
            ;;
        "restart")
            daemon_operation "stop" 2>/dev/null || true
            sleep 2
            daemon_operation "start"
            ;;
        "status")
            if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
                local pid=$(cat "$PID_FILE")
                print_status "INFO" "Health monitor daemon is running (PID: $pid)"
                print_status "INFO" "Log file: $LOG_DIR/daemon.log"
            else
                print_status "INFO" "Health monitor daemon is not running"
                exit 1
            fi
            ;;
    esac
}

# Function to run monitoring cycle
run_monitoring_cycle() {
    CHECK_COUNT=$((CHECK_COUNT + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    print_status "INFO" "Starting health check cycle #$CHECK_COUNT"

    # Check health of all modules
    for module in "${ALL_MODULES[@]}"; do
        check_module_health "$module"
    done

    # Generate report at intervals
    if [[ $((CHECK_COUNT % (REPORT_INTERVAL / MONITOR_INTERVAL))) -eq 0 ]]; then
        generate_health_report
    fi

    print_status "SUCCESS" "Health check cycle #$CHECK_COUNT completed"
}

# Function to handle cleanup on exit
cleanup() {
    print_status "INFO" "Cleaning up health monitor"
    if [[ -f "$PID_FILE" ]] && [[ "$$" == "$(cat "$PID_FILE")" ]]; then
        rm -f "$PID_FILE"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    # Parse command line arguments
    parse_args "$@"

    # Setup environment
    setup_environment

    # Handle daemon mode
    if [[ "$DAEMON_MODE" == true ]] && [[ "$1" != "--daemon" ]]; then
        CONTINUOUS_MODE=true
        DAEMON_MODE=false  # Reset to avoid infinite recursion
    fi

    # Save PID for daemon mode
    if [[ "$DAEMON_MODE" == true ]] || [[ "$CONTINUOUS_MODE" == true ]]; then
        echo $$ > "$PID_FILE"
    fi

    print_status "INFO" "Environment: Node.js $(node --version 2>/dev/null || echo "not available"), jq $(jq --version 2>/dev/null || echo "not available")"

    if [[ "$CONTINUOUS_MODE" == true ]]; then
        print_status "INFO" "Starting continuous monitoring (interval: ${MONITOR_INTERVAL}s)"

        while true; do
            run_monitoring_cycle
            sleep "$MONITOR_INTERVAL"
        done
    else
        # Single check mode
        run_monitoring_cycle
        generate_health_report
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi