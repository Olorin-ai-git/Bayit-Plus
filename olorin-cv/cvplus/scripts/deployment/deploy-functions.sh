#!/bin/bash

# Deploy functions with retry logic to handle quota limits
# This script will deploy functions in small batches with delays

set -e

echo "Starting Firebase Functions deployment with retry logic..."

# List of critical functions that need immediate deployment (CORS updates)
CRITICAL_FUNCTIONS=(
    "applyImprovements"
    "podcastStatusPublic"
    "trackUserOutcome"
    "updateUserOutcome" 
    "getUserOutcomeStats"
)

# Function to deploy with retry logic
deploy_with_retry() {
    local functions_list="$1"
    local max_attempts=5
    local wait_time=120  # 2 minutes
    
    for attempt in $(seq 1 $max_attempts); do
        echo "Attempt $attempt/$max_attempts: Deploying functions: $functions_list"
        
        if timeout 300 firebase deploy --only "functions:$functions_list" 2>&1; then
            echo "✅ Successfully deployed: $functions_list"
            return 0
        else
            echo "❌ Deployment failed for: $functions_list"
            
            if [ $attempt -eq $max_attempts ]; then
                echo "❌ Max attempts reached for: $functions_list"
                return 1
            fi
            
            echo "⏳ Waiting $wait_time seconds before retry..."
            sleep $wait_time
            
            # Increase wait time for next retry
            wait_time=$((wait_time + 60))
        fi
    done
}

# Deploy critical functions first (one by one to avoid quota limits)
echo "🚀 Deploying critical functions..."
for func in "${CRITICAL_FUNCTIONS[@]}"; do
    echo "Deploying $func..."
    deploy_with_retry "$func"
    echo "⏳ Waiting 60 seconds before next deployment..."
    sleep 60
done

echo "✅ All critical functions deployed successfully!"

# Optional: Deploy remaining functions in small batches
echo "🚀 Starting deployment of remaining functions in batches..."

# Get all function names and exclude the ones already deployed
ALL_FUNCTIONS=$(firebase functions:list --format=json | jq -r '.[] | .name' | grep -v -E "($(IFS="|"; echo "${CRITICAL_FUNCTIONS[*]}"))" | head -20)

# Convert to array and deploy in batches of 5
REMAINING_FUNCTIONS=($ALL_FUNCTIONS)
BATCH_SIZE=5

for ((i=0; i<${#REMAINING_FUNCTIONS[@]}; i+=BATCH_SIZE)); do
    batch_functions=("${REMAINING_FUNCTIONS[@]:i:BATCH_SIZE}")
    batch_string=$(IFS=","; echo "functions:${batch_functions[*]}")
    batch_string=${batch_string//,/,functions:}
    
    echo "Deploying batch: ${batch_functions[*]}"
    deploy_with_retry "$batch_string"
    
    # Wait between batches
    echo "⏳ Waiting 120 seconds before next batch..."
    sleep 120
done

echo "✅ Deployment completed!"