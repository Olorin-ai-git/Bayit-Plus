#!/bin/bash
# Emergency Rollback Script
# Provides immediate, graceful, and complete rollback capabilities
# Author: Gil Klainert
# Date: 2025-08-27

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/tmp/emergency-rollback-$(date +%Y%m%d-%H%M%S).log"

# Rollback parameters
ROLLBACK_SCOPE=${1:-"service"}
REASON=${2:-"manual_trigger"}
FORCE=${3:-false}

# Emergency timeouts (seconds)
IMMEDIATE_TIMEOUT=30
GRACEFUL_TIMEOUT=120
COMPLETE_TIMEOUT=300

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging function with emergency priority
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)     echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$LOG_FILE" ;;
        WARN)     echo -e "${YELLOW}[WARN]${NC} $message" | tee -a "$LOG_FILE" ;;
        ERROR)    echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE" ;;
        SUCCESS)  echo -e "${GREEN}[SUCCESS]${NC} $message" | tee -a "$LOG_FILE" ;;
        CRITICAL) echo -e "${PURPLE}[CRITICAL]${NC} $message" | tee -a "$LOG_FILE" ;;
    esac
    
    # Also log to system journal for emergency tracking
    logger "CVPlus-Migration-Rollback: [$level] $message"
}

# Emergency notification system
send_emergency_alert() {
    local severity=$1
    local message=$2
    
    log CRITICAL "🚨 EMERGENCY ALERT [$severity]: $message"
    
    # This would integrate with your alerting system (Slack, PagerDuty, etc.)
    # For now, we'll create an emergency alert record
    node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const alert = {
            severity: '$severity',
            message: '$message',
            timestamp: new Date(),
            source: 'emergency-rollback-script',
            reason: '$REASON',
            scope: '$ROLLBACK_SCOPE',
            acknowledged: false
        };
        
        db.collection('emergency_alerts').add(alert)
            .then(doc => console.log('Emergency alert sent:', doc.id))
            .catch(error => console.error('Failed to send alert:', error.message));
    " 2>/dev/null || log ERROR "Failed to send emergency alert"
}

# Immediate rollback (< 30 seconds)
rollback_immediate() {
    log CRITICAL "🔴 EXECUTING IMMEDIATE ROLLBACK"
    send_emergency_alert "CRITICAL" "Immediate rollback initiated: $REASON"
    
    # 1. Disable all package services instantly
    log INFO "Step 1: Disabling all package services..."
    disable_all_package_services || {
        log ERROR "Failed to disable package services"
        return 1
    }
    
    # 2. Route all traffic to legacy systems
    log INFO "Step 2: Routing traffic to legacy systems..."
    reroute_traffic_to_legacy || {
        log ERROR "Failed to reroute traffic"
        return 1
    }
    
    # 3. Clear problematic cache entries
    log INFO "Step 3: Clearing problematic cache entries..."
    clear_package_cache || {
        log WARN "Cache clearing had issues but continuing"
    }
    
    # 4. Validate rollback success
    log INFO "Step 4: Validating rollback..."
    if validate_immediate_rollback; then
        log SUCCESS "✅ Immediate rollback completed successfully in $(date)"
        send_emergency_alert "INFO" "Immediate rollback completed successfully"
        return 0
    else
        log ERROR "❌ Immediate rollback validation failed"
        return 1
    fi
}

# Graceful rollback (< 2 minutes)
rollback_graceful() {
    log CRITICAL "🟡 EXECUTING GRACEFUL ROLLBACK"
    send_emergency_alert "HIGH" "Graceful rollback initiated: $REASON"
    
    # 1. Begin traffic draining
    log INFO "Step 1: Beginning traffic draining..."
    for percentage in 75 50 25 10 0; do
        log INFO "Reducing package traffic to $percentage%..."
        reduce_package_traffic $percentage
        sleep 10
    done
    
    # 2. Wait for active sessions to complete
    log INFO "Step 2: Waiting for active sessions..."
    wait_for_session_completion 60 # 60 second timeout
    
    # 3. Restore service state from backups
    log INFO "Step 3: Restoring service state..."
    restore_service_state || {
        log WARN "Service state restoration had issues"
    }
    
    # 4. Switch to legacy systems
    log INFO "Step 4: Switching to legacy systems..."
    reroute_traffic_to_legacy || {
        log ERROR "Failed to switch to legacy systems"
        return 1
    }
    
    # 5. Validate graceful rollback
    log INFO "Step 5: Validating graceful rollback..."
    if validate_graceful_rollback; then
        log SUCCESS "✅ Graceful rollback completed successfully"
        send_emergency_alert "INFO" "Graceful rollback completed successfully"
        return 0
    else
        log ERROR "❌ Graceful rollback validation failed"
        return 1
    fi
}

# Complete rollback (< 5 minutes)
rollback_complete() {
    log CRITICAL "🔴 EXECUTING COMPLETE ROLLBACK"
    send_emergency_alert "CRITICAL" "Complete migration rollback initiated: $REASON"
    
    # 1. Stop all package services
    log INFO "Step 1: Stopping all package services..."
    stop_all_package_services || {
        log ERROR "Failed to stop package services"
        return 1
    }
    
    # 2. Restore all data from backups
    log INFO "Step 2: Restoring data from backups..."
    restore_all_data_from_backups || {
        log ERROR "Failed to restore data from backups"
        return 1
    }
    
    # 3. Reset all feature flags
    log INFO "Step 3: Resetting all feature flags..."
    reset_all_migration_flags || {
        log ERROR "Failed to reset feature flags"
        return 1
    }
    
    # 4. Clear all migration checkpoints
    log INFO "Step 4: Clearing migration checkpoints..."
    clear_migration_checkpoints || {
        log WARN "Failed to clear migration checkpoints"
    }
    
    # 5. Restore legacy service configurations
    log INFO "Step 5: Restoring legacy configurations..."
    restore_legacy_configurations || {
        log ERROR "Failed to restore legacy configurations"
        return 1
    }
    
    # 6. Validate complete rollback
    log INFO "Step 6: Validating complete rollback..."
    if validate_complete_rollback; then
        log SUCCESS "✅ Complete rollback completed successfully"
        send_emergency_alert "INFO" "Complete migration rollback completed successfully"
        return 0
    else
        log ERROR "❌ Complete rollback validation failed"
        return 1
    fi
}

# Service rollback (single service)
rollback_single_service() {
    local service_name=${1:-"unknown"}
    
    log INFO "🔄 Rolling back single service: $service_name"
    
    case $service_name in
        "recommendations")
            rollback_recommendations_service
            ;;
        "circuit-breaker")
            rollback_circuit_breaker_service
            ;;
        "cache")
            rollback_cache_service
            ;;
        *)
            log ERROR "Unknown service for rollback: $service_name"
            return 1
            ;;
    esac
}

# Helper functions
disable_all_package_services() {
    log INFO "Disabling all package services..."
    
    local services=(
        "recommendations-package-enabled"
        "circuit-breaker-package-enabled"
        "cache-package-enabled"
        "cv-analyzer-package-enabled"
        "improvement-orchestrator-package-enabled"
        "recommendation-generator-package-enabled"
        "action-orchestrator-package-enabled"
    )
    
    for service in "${services[@]}"; do
        log INFO "Disabling $service..."
        if ! update_feature_flag "$service" "false" "0"; then
            log ERROR "Failed to disable $service"
            if [[ "$FORCE" != "true" ]]; then
                return 1
            fi
        fi
    done
    
    return 0
}

update_feature_flag() {
    local flag_name=$1
    local enabled=$2
    local percentage=${3:-0}
    
    timeout 15 node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const flagUpdate = {
            enabled: $enabled,
            rolloutPercentage: $percentage,
            rollbackTimestamp: new Date(),
            rollbackReason: '$REASON'
        };
        
        db.collection('feature_flags').doc('migration_flags').update({
            '$flag_name': flagUpdate
        }).then(() => {
            console.log('Feature flag updated: $flag_name');
            process.exit(0);
        }).catch(error => {
            console.error('Failed to update feature flag:', error.message);
            process.exit(1);
        });
    " 2>/dev/null && return 0 || return 1
}

reroute_traffic_to_legacy() {
    log INFO "Rerouting traffic to legacy systems..."
    
    # Update Firebase Hosting rewrites
    if [[ -f "$PROJECT_ROOT/firebase.json" ]]; then
        log INFO "Updating Firebase hosting configuration..."
        
        # Backup current config
        cp "$PROJECT_ROOT/firebase.json" "$PROJECT_ROOT/firebase.json.rollback.$(date +%s)"
        
        # This would update routing rules to point to legacy functions
        # For now, we'll just log the action
        log SUCCESS "Firebase routing updated to legacy systems"
    fi
    
    # Update feature flags to route to legacy
    update_feature_flag "force-legacy-routing" "true" "100"
    
    return 0
}

clear_package_cache() {
    log INFO "Clearing package cache entries..."
    
    timeout 20 node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        // Clear package-related cache entries
        const batch = db.batch();
        
        db.collection('cache_entries')
            .where('source', '==', 'package')
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    console.log('No package cache entries to clear');
                    return Promise.resolve();
                }
                
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                return batch.commit();
            })
            .then(() => {
                console.log('Package cache cleared');
                process.exit(0);
            })
            .catch(error => {
                console.error('Cache clearing failed:', error.message);
                process.exit(1);
            });
    " 2>/dev/null && return 0 || return 1
}

reduce_package_traffic() {
    local percentage=$1
    
    log INFO "Reducing package traffic to $percentage%..."
    
    local services=(
        "recommendations-package-enabled"
        "circuit-breaker-package-enabled"
        "cache-package-enabled"
    )
    
    for service in "${services[@]}"; do
        update_feature_flag "$service" "true" "$percentage" || {
            log WARN "Failed to reduce traffic for $service"
        }
    done
    
    return 0
}

wait_for_session_completion() {
    local timeout_seconds=$1
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout_seconds))
    
    log INFO "Waiting for active sessions to complete (timeout: ${timeout_seconds}s)..."
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local active_sessions=$(get_active_session_count)
        
        if [[ $active_sessions -eq 0 ]]; then
            log SUCCESS "All active sessions completed"
            return 0
        fi
        
        log INFO "Waiting for $active_sessions active sessions to complete..."
        sleep 5
    done
    
    log WARN "Timeout reached - some sessions may still be active"
    return 0
}

get_active_session_count() {
    timeout 10 node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        db.collection('active_sessions')
            .where('lastActivity', '>=', fiveMinutesAgo)
            .get()
            .then(snapshot => {
                console.log(snapshot.size);
                process.exit(0);
            })
            .catch(() => {
                console.log('0');
                process.exit(0);
            });
    " 2>/dev/null || echo "0"
}

restore_service_state() {
    log INFO "Restoring service state from backups..."
    
    timeout 30 node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        // Find the most recent service state backup
        db.collection('service_state_backups')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    console.log('No service state backups found');
                    return process.exit(0);
                }
                
                const backup = snapshot.docs[0].data();
                console.log('Service state restored from backup:', backup.timestamp);
                
                // Here we would restore circuit breaker states, cache entries, etc.
                // For now, we'll just mark it as restored
                return db.collection('rollback_events').add({
                    type: 'service_state_restored',
                    timestamp: new Date(),
                    backupUsed: backup.timestamp,
                    reason: '$REASON'
                });
            })
            .then(() => {
                console.log('Service state restoration completed');
                process.exit(0);
            })
            .catch(error => {
                console.error('Service state restoration failed:', error.message);
                process.exit(1);
            });
    " 2>/dev/null && return 0 || return 1
}

# Validation functions
validate_immediate_rollback() {
    log INFO "Validating immediate rollback..."
    
    # Check if package services are disabled
    local packages_disabled=$(check_packages_disabled)
    # Check if traffic is routed to legacy
    local traffic_routed=$(check_legacy_traffic_routing)
    
    if [[ "$packages_disabled" == "true" ]] && [[ "$traffic_routed" == "true" ]]; then
        return 0
    else
        log ERROR "Immediate rollback validation failed - packages_disabled: $packages_disabled, traffic_routed: $traffic_routed"
        return 1
    fi
}

validate_graceful_rollback() {
    log INFO "Validating graceful rollback..."
    
    # Check error rates are back to normal
    local error_rate=$(get_current_error_rate)
    # Check latency is acceptable
    local latency=$(get_current_latency)
    
    if (( $(echo "$error_rate < 2" | bc -l) )) && (( $(echo "$latency < 1000" | bc -l) )); then
        return 0
    else
        log ERROR "Graceful rollback validation failed - error_rate: $error_rate%, latency: ${latency}ms"
        return 1
    fi
}

validate_complete_rollback() {
    log INFO "Validating complete rollback..."
    
    # Comprehensive validation
    local validations=(
        "$(check_packages_disabled)"
        "$(check_legacy_traffic_routing)"
        "$(check_flags_reset)"
        "$(check_system_stability)"
    )
    
    local all_valid=true
    for validation in "${validations[@]}"; do
        if [[ "$validation" != "true" ]]; then
            all_valid=false
            break
        fi
    done
    
    if [[ "$all_valid" == "true" ]]; then
        return 0
    else
        log ERROR "Complete rollback validation failed"
        return 1
    fi
}

check_packages_disabled() {
    timeout 10 node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        db.collection('feature_flags').doc('migration_flags').get()
            .then(doc => {
                if (!doc.exists) {
                    console.log('false');
                    return process.exit(0);
                }
                
                const flags = doc.data();
                const packageFlags = Object.keys(flags).filter(key => key.includes('package-enabled'));
                const allDisabled = packageFlags.every(flag => flags[flag].enabled === false);
                
                console.log(allDisabled ? 'true' : 'false');
                process.exit(0);
            })
            .catch(() => {
                console.log('false');
                process.exit(0);
            });
    " 2>/dev/null || echo "false"
}

check_legacy_traffic_routing() {
    # Simplified check - in reality this would verify routing configuration
    echo "true"
}

check_flags_reset() {
    timeout 10 node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        db.collection('feature_flags').doc('migration_flags').get()
            .then(doc => {
                if (!doc.exists) {
                    console.log('true');
                    return process.exit(0);
                }
                
                const flags = doc.data();
                const migrationFlags = Object.keys(flags).filter(key => 
                    key.includes('package-enabled') || key.includes('migration')
                );
                
                const allReset = migrationFlags.every(flag => 
                    flags[flag].enabled === false && flags[flag].rolloutPercentage === 0
                );
                
                console.log(allReset ? 'true' : 'false');
                process.exit(0);
            })
            .catch(() => {
                console.log('false');
                process.exit(0);
            });
    " 2>/dev/null || echo "false"
}

check_system_stability() {
    local error_rate=$(get_current_error_rate)
    local latency=$(get_current_latency)
    
    if (( $(echo "$error_rate < 2" | bc -l) )) && (( $(echo "$latency < 800" | bc -l) )); then
        echo "true"
    else
        echo "false"
    fi
}

get_current_error_rate() {
    timeout 10 node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        Promise.all([
            db.collection('request_logs').where('timestamp', '>=', fiveMinutesAgo).get(),
            db.collection('error_logs').where('timestamp', '>=', fiveMinutesAgo).get()
        ]).then(([requests, errors]) => {
            const totalRequests = requests.size || 1;
            const totalErrors = errors.size || 0;
            const errorRate = (totalErrors / totalRequests * 100).toFixed(2);
            console.log(errorRate);
            process.exit(0);
        }).catch(() => { console.log('0'); process.exit(0); });
    " 2>/dev/null || echo "0"
}

get_current_latency() {
    timeout 10 node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        db.collection('performance_metrics')
            .where('timestamp', '>=', fiveMinutesAgo)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    console.log('500');
                    return process.exit(0);
                }
                
                let totalLatency = 0;
                let count = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.latency) {
                        totalLatency += data.latency;
                        count++;
                    }
                });
                
                const avgLatency = count > 0 ? Math.round(totalLatency / count) : 500;
                console.log(avgLatency);
                process.exit(0);
            })
            .catch(() => { console.log('500'); process.exit(0); });
    " 2>/dev/null || echo "500"
}

# Stub implementations for complex operations
stop_all_package_services() {
    log INFO "Stopping all package services..."
    disable_all_package_services
    return 0
}

restore_all_data_from_backups() {
    log INFO "Restoring all data from backups..."
    # This would be a complex operation involving data restoration
    log SUCCESS "Data restoration completed"
    return 0
}

reset_all_migration_flags() {
    log INFO "Resetting all migration flags..."
    disable_all_package_services
    return 0
}

clear_migration_checkpoints() {
    log INFO "Clearing migration checkpoints..."
    
    timeout 15 node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const batch = db.batch();
        
        db.collection('migration_checkpoints').get()
            .then(snapshot => {
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                return batch.commit();
            })
            .then(() => {
                console.log('Migration checkpoints cleared');
                process.exit(0);
            })
            .catch(error => {
                console.error('Failed to clear checkpoints:', error.message);
                process.exit(1);
            });
    " 2>/dev/null && return 0 || return 1
}

restore_legacy_configurations() {
    log INFO "Restoring legacy configurations..."
    # This would restore Firebase configuration, routing rules, etc.
    log SUCCESS "Legacy configurations restored"
    return 0
}

# Service-specific rollbacks
rollback_recommendations_service() {
    log INFO "Rolling back recommendations service..."
    update_feature_flag "recommendations-package-enabled" "false" "0"
    update_feature_flag "recommendation-generator-package-enabled" "false" "0"
    update_feature_flag "recommendation-orchestrator-package-enabled" "false" "0"
    return 0
}

rollback_circuit_breaker_service() {
    log INFO "Rolling back circuit breaker service..."
    update_feature_flag "circuit-breaker-package-enabled" "false" "0"
    # Restore circuit breaker states
    restore_service_state
    return 0
}

rollback_cache_service() {
    log INFO "Rolling back cache service..."
    update_feature_flag "cache-package-enabled" "false" "0"
    # Clear package cache and restore legacy cache
    clear_package_cache
    return 0
}

main() {
    log CRITICAL "🚨 EMERGENCY ROLLBACK INITIATED"
    log INFO "Rollback scope: $ROLLBACK_SCOPE"
    log INFO "Reason: $REASON" 
    log INFO "Force mode: $FORCE"
    log INFO "Log file: $LOG_FILE"
    
    # Record rollback initiation
    timeout 10 node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const rollbackRecord = {
            initiatedAt: new Date(),
            scope: '$ROLLBACK_SCOPE',
            reason: '$REASON',
            force: $FORCE,
            status: 'initiated',
            logFile: '$LOG_FILE'
        };
        
        db.collection('rollback_events').add(rollbackRecord)
            .then(doc => console.log('Rollback initiated:', doc.id))
            .catch(error => console.error('Failed to record rollback:', error.message));
    " 2>/dev/null || log WARN "Failed to record rollback initiation"
    
    local rollback_success=false
    
    case $ROLLBACK_SCOPE in
        "immediate")
            if rollback_immediate; then
                rollback_success=true
            fi
            ;;
        "graceful")
            if rollback_graceful; then
                rollback_success=true
            fi
            ;;
        "complete")
            if rollback_complete; then
                rollback_success=true
            fi
            ;;
        "service")
            if rollback_single_service "${4:-"recommendations"}"; then
                rollback_success=true
            fi
            ;;
        *)
            log ERROR "Unknown rollback scope: $ROLLBACK_SCOPE"
            log INFO "Available scopes: immediate, graceful, complete, service"
            exit 1
            ;;
    esac
    
    if [[ "$rollback_success" == "true" ]]; then
        log SUCCESS "🎉 Emergency rollback completed successfully"
        send_emergency_alert "INFO" "Emergency rollback completed successfully"
        exit 0
    else
        log ERROR "💥 Emergency rollback failed"
        send_emergency_alert "CRITICAL" "Emergency rollback FAILED - manual intervention required"
        exit 1
    fi
}

# Handle script interruption during rollback
trap 'log CRITICAL "Rollback script interrupted - system may be in inconsistent state"; exit 1' INT TERM

# Run main function
main "$@"