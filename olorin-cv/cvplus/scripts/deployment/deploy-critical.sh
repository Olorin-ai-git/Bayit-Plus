#!/bin/bash

# Deploy only critical CORS functions with retry logic

set -e

echo "🚀 Deploying critical CORS functions..."

# Critical functions that need immediate deployment
CRITICAL_FUNCTIONS=(
    "applyImprovements"
    "getRecommendations"
    "previewImprovement"
    "podcastStatusPublic"
    "trackUserOutcome"
    "updateUserOutcome"
    "getUserOutcomeStats"
)

# Function to deploy with retry logic
deploy_with_retry() {
    local func_name="$1"
    local max_attempts=5
    local wait_time=120  # 2 minutes
    
    for attempt in $(seq 1 $max_attempts); do
        echo "🚀 Attempt $attempt/$max_attempts: Deploying $func_name"
        
        if firebase deploy --only "functions:$func_name" 2>&1; then
            echo "✅ Successfully deployed: $func_name"
            return 0
        else
            exit_code=$?
            echo "❌ Deployment failed for: $func_name (exit code: $exit_code)"
            
            if [ $attempt -eq $max_attempts ]; then
                echo "💀 Max attempts reached for: $func_name"
                return 1
            fi
            
            echo "⏳ Waiting $wait_time seconds before retry..."
            sleep $wait_time
            
            # Increase wait time for next retry
            wait_time=$((wait_time + 60))
        fi
    done
}

# Deploy each critical function
success_count=0
total_functions=${#CRITICAL_FUNCTIONS[@]}

for func in "${CRITICAL_FUNCTIONS[@]}"; do
    echo ""
    echo "🎯 Deploying critical function: $func"
    
    if deploy_with_retry "$func"; then
        success_count=$((success_count + 1))
    else
        echo "❌ Failed to deploy: $func"
    fi
    
    # Wait between deployments to avoid quota limits
    if [ $success_count -lt $total_functions ]; then
        echo "⏳ Waiting 90 seconds before next deployment..."
        sleep 90
    fi
done

echo ""
echo "📊 Deployment Summary:"
echo "✅ Successful: $success_count/$total_functions critical functions"

if [ $success_count -eq $total_functions ]; then
    echo ""
    echo "🎉 ALL CRITICAL FUNCTIONS DEPLOYED SUCCESSFULLY!"
    echo "✅ CORS issues should now be resolved."
    echo "🧪 You can now test the Magic Transform button."
    exit 0
else
    echo ""
    echo "⚠️  Some critical functions failed to deploy."
    echo "❌ CORS issues may persist."
    exit 1
fi