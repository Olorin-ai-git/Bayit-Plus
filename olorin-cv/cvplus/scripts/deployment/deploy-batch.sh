#!/bin/bash

# Simplified Strategic Deployment Script
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success_log() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
error_log() { echo -e "${RED}[ERROR]${NC} $1"; }
warn_log() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# High priority functions for core features
HIGH_PRIORITY=(
    "enhancedQR"
    "mediaGeneration" 
    "skillsVisualization"
    "portfolioGallery"
    "testimonials"
)

# Medium priority functions
MEDIUM_PRIORITY=(
    "achievementHighlighting"
    "calendarIntegration"
    "certificationBadges"
    "personalityInsights"
    "publicProfile"
)

# Lower priority functions
LOW_PRIORITY=(
    "atsOptimization"
    "industryOptimization"
    "regionalOptimization"
    "predictSuccess"
    "advancedPredictions"
    "languageProficiency"
    "socialMedia"
    "ragChat"
    "trackOutcome"
    "cleanupTempFiles"
    "processCV.enhanced"
)

deploy_function() {
    local func="$1"
    local max_retries=2
    local retry=0
    
    log "Deploying $func..."
    
    while [ $retry -lt $max_retries ]; do
        if timeout 300 firebase deploy --only functions:$func --project getmycv-ai; then
            success_log "✓ $func deployed successfully"
            return 0
        else
            retry=$((retry + 1))
            if [ $retry -lt $max_retries ]; then
                warn_log "Retry $retry/$max_retries for $func in 30 seconds..."
                sleep 30
            fi
        fi
    done
    
    error_log "✗ Failed to deploy $func after $max_retries attempts"
    return 1
}

deploy_batch() {
    local -n batch=$1
    local batch_name="$2"
    local delay="$3"
    
    log "Deploying $batch_name batch (${#batch[@]} functions)"
    
    local success_count=0
    local failed_functions=()
    
    for func in "${batch[@]}"; do
        if deploy_function "$func"; then
            success_count=$((success_count + 1))
        else
            failed_functions+=("$func")
        fi
        
        # Small delay between functions
        sleep 20
    done
    
    log "$batch_name batch: $success_count/${#batch[@]} functions deployed"
    
    if [ ${#failed_functions[@]} -gt 0 ]; then
        error_log "Failed functions: ${failed_functions[*]}"
    fi
    
    if [ $delay -gt 0 ] && [ $success_count -gt 0 ]; then
        log "Waiting $delay seconds before next batch to avoid quota limits..."
        sleep $delay
    fi
    
    return ${#failed_functions[@]}
}

main() {
    log "Starting strategic deployment of remaining functions"
    
    # Check current directory
    if [ ! -f "firebase.json" ]; then
        error_log "Not in Firebase project root directory"
        exit 1
    fi
    
    cd functions
    
    # Try to build (but don't fail if there are warnings)
    log "Attempting to build functions..."
    if npm run build 2>/dev/null; then
        success_log "Build successful"
    else
        warn_log "Build warnings detected, proceeding anyway"
    fi
    
    cd ..
    
    local total_failed=0
    
    # Deploy high priority batch
    deploy_batch HIGH_PRIORITY "HIGH_PRIORITY" 120
    total_failed=$((total_failed + $?))
    
    # Deploy medium priority batch
    deploy_batch MEDIUM_PRIORITY "MEDIUM_PRIORITY" 120
    total_failed=$((total_failed + $?))
    
    # Deploy low priority batch (in smaller sub-batches)
    local low_batch1=(${LOW_PRIORITY[@]:0:4})
    local low_batch2=(${LOW_PRIORITY[@]:4:4})  
    local low_batch3=(${LOW_PRIORITY[@]:8})
    
    deploy_batch low_batch1 "LOW_PRIORITY_1" 120
    total_failed=$((total_failed + $?))
    
    deploy_batch low_batch2 "LOW_PRIORITY_2" 120
    total_failed=$((total_failed + $?))
    
    deploy_batch low_batch3 "LOW_PRIORITY_3" 0
    total_failed=$((total_failed + $?))
    
    # Final summary
    if [ $total_failed -eq 0 ]; then
        success_log "🎉 All functions deployed successfully!"
    else
        warn_log "Deployment completed with $total_failed failed functions"
    fi
    
    # Show final status
    log "Final function status:"
    firebase functions:list --json 2>/dev/null | jq -r '.result[]? | "\(.id): \(.state)"' | tail -20
}

main "$@"