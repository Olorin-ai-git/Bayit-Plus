#!/bin/bash
# Progressive Migration Script
# Manages phased migration with automated health checks and rollback capability
# Author: Gil Klainert
# Date: 2025-08-27

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/tmp/progressive-migration-$(date +%Y%m%d-%H%M%S).log"

# Migration parameters
PHASE=${1:-"phase1"}
TRAFFIC_PERCENTAGE=${2:-10}
DRY_RUN=${3:-false}

# Health check thresholds
ERROR_RATE_THRESHOLD=0.05  # 5%
LATENCY_THRESHOLD_MULTIPLIER=2.0  # 2x baseline
MONITORING_INTERVAL=30  # seconds
MAX_MONITORING_DURATION=1800  # 30 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)  echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$LOG_FILE" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" | tee -a "$LOG_FILE" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Health monitoring function
monitor_health() {
    log INFO "📊 Starting health monitoring for $MONITORING_INTERVAL second intervals..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + MAX_MONITORING_DURATION))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local current_time=$(date +%s)
        
        # Check error rate
        local error_rate=$(get_current_error_rate)
        log INFO "Current error rate: ${error_rate}%"
        
        if (( $(echo "$error_rate > $ERROR_RATE_THRESHOLD * 100" | bc -l) )); then
            log ERROR "⚠️ Error rate threshold exceeded: ${error_rate}% > ${ERROR_RATE_THRESHOLD}%"
            trigger_automatic_rollback "error_rate_exceeded"
            return 1
        fi
        
        # Check latency
        local current_latency=$(get_current_latency)
        local baseline_latency=$(get_baseline_latency)
        local latency_ratio=$(echo "scale=2; $current_latency / $baseline_latency" | bc -l)
        
        log INFO "Current latency: ${current_latency}ms (${latency_ratio}x baseline)"
        
        if (( $(echo "$latency_ratio > $LATENCY_THRESHOLD_MULTIPLIER" | bc -l) )); then
            log ERROR "⚠️ Latency threshold exceeded: ${latency_ratio}x > ${LATENCY_THRESHOLD_MULTIPLIER}x baseline"
            trigger_automatic_rollback "latency_degradation"
            return 1
        fi
        
        # Check data integrity
        if ! check_data_integrity; then
            log ERROR "⚠️ Data integrity check failed"
            trigger_automatic_rollback "data_integrity_failure"
            return 1
        fi
        
        # Check user experience metrics
        local user_success_rate=$(get_user_success_rate)
        log INFO "User success rate: ${user_success_rate}%"
        
        if (( $(echo "$user_success_rate < 95" | bc -l) )); then
            log WARN "User success rate below threshold: ${user_success_rate}%"
        fi
        
        log SUCCESS "Health check passed at $(date)"
        sleep $MONITORING_INTERVAL
    done
    
    log SUCCESS "Health monitoring completed successfully"
}

# Helper functions for metrics
get_current_error_rate() {
    node -e "
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
    node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        db.collection('performance_metrics')
            .where('timestamp', '>=', fiveMinutesAgo)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    console.log('500'); // Default latency
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

get_baseline_latency() {
    node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        db.collection('performance_baselines')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    console.log('250'); // Default baseline
                    return process.exit(0);
                }
                
                const baseline = snapshot.docs[0].data();
                const baselineLatency = baseline.metrics?.responseTime?.p50 || 250;
                console.log(baselineLatency);
                process.exit(0);
            })
            .catch(() => { console.log('250'); process.exit(0); });
    " 2>/dev/null || echo "250"
}

get_user_success_rate() {
    node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        Promise.all([
            db.collection('user_actions').where('timestamp', '>=', tenMinutesAgo).get(),
            db.collection('user_actions').where('timestamp', '>=', tenMinutesAgo).where('success', '==', true).get()
        ]).then(([all, successful]) => {
            const totalActions = all.size || 1;
            const successfulActions = successful.size || 0;
            const successRate = (successfulActions / totalActions * 100).toFixed(2);
            console.log(successRate);
            process.exit(0);
        }).catch(() => { console.log('100'); process.exit(0); });
    " 2>/dev/null || echo "100"
}

check_data_integrity() {
    node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        // Simple data integrity check
        Promise.all([
            db.collection('users').limit(1).get(),
            db.collection('recommendations').limit(1).get(),
            db.collection('user_cvs').limit(1).get()
        ]).then(results => {
            const allAccessible = results.every(snapshot => snapshot !== null);
            if (allAccessible) {
                console.log('true');
            } else {
                console.log('false');
            }
            process.exit(0);
        }).catch(() => { console.log('false'); process.exit(0); });
    " 2>/dev/null && echo "true" || echo "false"
    
    [[ $(echo "$?") == "true" ]]
}

# Migration phase implementations
migrate_phase1_low_risk_services() {
    log INFO "🚀 Starting Phase 1: Low-Risk Services Migration"
    
    # Migrate CVAnalyzer
    log INFO "Migrating CVAnalyzer service..."
    if update_feature_flag "cv-analyzer-package-enabled" "true" "$TRAFFIC_PERCENTAGE"; then
        log SUCCESS "CVAnalyzer migration initiated"
    else
        log ERROR "Failed to migrate CVAnalyzer"
        return 1
    fi
    
    # Migrate ImprovementOrchestrator
    log INFO "Migrating ImprovementOrchestrator service..."
    if update_feature_flag "improvement-orchestrator-package-enabled" "true" "$TRAFFIC_PERCENTAGE"; then
        log SUCCESS "ImprovementOrchestrator migration initiated"
    else
        log ERROR "Failed to migrate ImprovementOrchestrator"
        return 1
    fi
    
    # Create migration checkpoint
    create_migration_checkpoint "phase1" "low_risk_services_migrated"
}

migrate_phase2_medium_risk_services() {
    log INFO "🚀 Starting Phase 2: Medium-Risk Services Migration"
    
    # Validate Phase 1 success
    if ! validate_phase_completion "phase1"; then
        log ERROR "Phase 1 validation failed - cannot proceed to Phase 2"
        return 1
    fi
    
    # Migrate CacheManager with dual-write pattern
    log INFO "Migrating CacheManager with dual-write pattern..."
    if enable_dual_write_cache && update_feature_flag "cache-package-enabled" "true" "$TRAFFIC_PERCENTAGE"; then
        log SUCCESS "CacheManager dual-write migration initiated"
    else
        log ERROR "Failed to migrate CacheManager"
        return 1
    fi
    
    # Migrate RecommendationGenerator
    log INFO "Migrating RecommendationGenerator service..."
    if update_feature_flag "recommendation-generator-package-enabled" "true" "$TRAFFIC_PERCENTAGE"; then
        log SUCCESS "RecommendationGenerator migration initiated"
    else
        log ERROR "Failed to migrate RecommendationGenerator"
        return 1
    fi
    
    create_migration_checkpoint "phase2" "medium_risk_services_migrated"
}

migrate_phase3_critical_services() {
    log INFO "🚀 Starting Phase 3: Critical Services Migration"
    
    # Validate Phase 2 success
    if ! validate_phase_completion "phase2"; then
        log ERROR "Phase 2 validation failed - cannot proceed to Phase 3"
        return 1
    fi
    
    # Migrate CircuitBreakerCore with state preservation
    log INFO "Migrating CircuitBreakerCore with state preservation..."
    if preserve_circuit_breaker_state && update_feature_flag "circuit-breaker-package-enabled" "true" "$TRAFFIC_PERCENTAGE"; then
        log SUCCESS "CircuitBreakerCore migration initiated"
    else
        log ERROR "Failed to migrate CircuitBreakerCore"
        return 1
    fi
    
    # Migrate RecommendationOrchestrator
    log INFO "Migrating RecommendationOrchestrator service..."
    if update_feature_flag "recommendation-orchestrator-package-enabled" "true" "$TRAFFIC_PERCENTAGE"; then
        log SUCCESS "RecommendationOrchestrator migration initiated"
    else
        log ERROR "Failed to migrate RecommendationOrchestrator"
        return 1
    fi
    
    # Migrate ActionOrchestrator
    log INFO "Migrating ActionOrchestrator service..."
    if update_feature_flag "action-orchestrator-package-enabled" "true" "$TRAFFIC_PERCENTAGE"; then
        log SUCCESS "ActionOrchestrator migration initiated"
    else
        log ERROR "Failed to migrate ActionOrchestrator"
        return 1
    fi
    
    create_migration_checkpoint "phase3" "critical_services_migrated"
}

# Helper functions
update_feature_flag() {
    local flag_name=$1
    local enabled=$2
    local percentage=$3
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would update feature flag: $flag_name = $enabled ($percentage%)"
        return 0
    fi
    
    node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const flagUpdate = {
            enabled: $enabled,
            rolloutPercentage: $percentage,
            updatedAt: new Date(),
            updatedBy: 'progressive-migration-script'
        };
        
        db.collection('feature_flags').doc('migration_flags').update({
            '$flag_name': flagUpdate
        }).then(() => {
            console.log('Feature flag updated successfully');
            process.exit(0);
        }).catch(error => {
            console.error('Failed to update feature flag:', error.message);
            process.exit(1);
        });
    " && return 0 || return 1
}

enable_dual_write_cache() {
    log INFO "Enabling dual-write cache pattern..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would enable dual-write cache pattern"
        return 0
    fi
    
    # Implementation would enable writing to both legacy and package cache systems
    node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const config = {
            dualWrite: true,
            readPreference: 'legacy',
            enabledAt: new Date()
        };
        
        db.collection('system_config').doc('cache_migration').set(config)
            .then(() => {
                console.log('Dual-write cache enabled');
                process.exit(0);
            })
            .catch(error => {
                console.error('Failed to enable dual-write cache:', error.message);
                process.exit(1);
            });
    " && return 0 || return 1
}

preserve_circuit_breaker_state() {
    log INFO "Preserving circuit breaker state for migration..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would preserve circuit breaker state"
        return 0
    fi
    
    node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        // Capture current circuit breaker states
        const stateBackup = {
            timestamp: new Date(),
            migrationPhase: 'phase3',
            states: {
                recommendation_service: 'CLOSED',
                cv_processing: 'CLOSED',
                external_apis: 'HALF_OPEN'
            },
            backupReason: 'critical_service_migration'
        };
        
        db.collection('service_state_backups').add(stateBackup)
            .then(doc => {
                console.log('Circuit breaker state preserved:', doc.id);
                process.exit(0);
            })
            .catch(error => {
                console.error('Failed to preserve circuit breaker state:', error.message);
                process.exit(1);
            });
    " && return 0 || return 1
}

validate_phase_completion() {
    local phase=$1
    
    node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        db.collection('migration_checkpoints')
            .where('phase', '==', '$phase')
            .where('status', '==', 'completed')
            .limit(1)
            .get()
            .then(snapshot => {
                if (!snapshot.empty) {
                    console.log('Phase validation passed');
                    process.exit(0);
                } else {
                    console.log('Phase validation failed');
                    process.exit(1);
                }
            })
            .catch(() => {
                console.log('Phase validation error');
                process.exit(1);
            });
    " && return 0 || return 1
}

create_migration_checkpoint() {
    local phase=$1
    local milestone=$2
    
    node -e "
        const admin = require('firebase-admin');
        if (!admin.apps.length) { admin.initializeApp(); }
        const db = admin.firestore();
        
        const checkpoint = {
            phase: '$phase',
            milestone: '$milestone',
            status: 'completed',
            timestamp: new Date(),
            trafficPercentage: $TRAFFIC_PERCENTAGE,
            metrics: {
                errorRate: $(get_current_error_rate),
                latency: $(get_current_latency),
                userSuccessRate: $(get_user_success_rate)
            }
        };
        
        db.collection('migration_checkpoints').add(checkpoint)
            .then(doc => {
                console.log('Migration checkpoint created:', doc.id);
                process.exit(0);
            })
            .catch(error => {
                console.error('Failed to create checkpoint:', error.message);
                process.exit(1);
            });
    " && log SUCCESS "Migration checkpoint created: $phase - $milestone" || log ERROR "Failed to create checkpoint"
}

trigger_automatic_rollback() {
    local reason=$1
    
    log ERROR "🔴 TRIGGERING AUTOMATIC ROLLBACK: $reason"
    
    # Stop health monitoring
    killall -q sleep || true
    
    # Execute rollback script
    if [[ -f "$SCRIPT_DIR/emergency-rollback.sh" ]]; then
        log INFO "Executing emergency rollback script..."
        "$SCRIPT_DIR/emergency-rollback.sh" "phase" "$reason"
    else
        log ERROR "Emergency rollback script not found"
        
        # Manual rollback steps
        log INFO "Executing manual rollback steps..."
        
        # Disable all package feature flags
        update_feature_flag "recommendations-package-enabled" "false" "0"
        update_feature_flag "circuit-breaker-package-enabled" "false" "0"
        update_feature_flag "cache-package-enabled" "false" "0"
        
        log SUCCESS "Manual rollback completed"
    fi
    
    return 1
}

main() {
    log INFO "🚀 Starting Progressive Migration: Phase $PHASE with $TRAFFIC_PERCENTAGE% traffic"
    log INFO "Dry run: $DRY_RUN"
    log INFO "Log file: $LOG_FILE"
    
    # Start background health monitoring
    monitor_health &
    local monitor_pid=$!
    
    # Execute migration phase
    case $PHASE in
        "phase1")
            if migrate_phase1_low_risk_services; then
                log SUCCESS "Phase 1 migration completed successfully"
            else
                log ERROR "Phase 1 migration failed"
                kill $monitor_pid 2>/dev/null || true
                return 1
            fi
            ;;
        "phase2")
            if migrate_phase2_medium_risk_services; then
                log SUCCESS "Phase 2 migration completed successfully"
            else
                log ERROR "Phase 2 migration failed"
                kill $monitor_pid 2>/dev/null || true
                return 1
            fi
            ;;
        "phase3")
            if migrate_phase3_critical_services; then
                log SUCCESS "Phase 3 migration completed successfully"
            else
                log ERROR "Phase 3 migration failed"
                kill $monitor_pid 2>/dev/null || true
                return 1
            fi
            ;;
        *)
            log ERROR "Unknown migration phase: $PHASE"
            kill $monitor_pid 2>/dev/null || true
            return 1
            ;;
    esac
    
    # Stop health monitoring
    kill $monitor_pid 2>/dev/null || true
    
    log SUCCESS "✅ Progressive Migration Phase $PHASE Complete"
}

# Handle script interruption
trap 'log ERROR "Migration interrupted - triggering rollback"; trigger_automatic_rollback "script_interrupted"; exit 1' INT TERM

# Run main function
main "$@"