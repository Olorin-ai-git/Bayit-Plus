#!/bin/bash

# Deploy all functions in small batches to avoid timeouts
# Usage: ./scripts/deployment/deploy-all-functions.sh

set -e

PROJECT_ID="getmycv-ai"
BATCH_SIZE=3
DELAY_BETWEEN_BATCHES=10

echo "🚀 Deploying all functions in batches of $BATCH_SIZE"
echo "📡 Project: $PROJECT_ID"
echo ""

# Core functions (most critical)
CORE_FUNCTIONS=(
    "processCV"
    "analyzeCV"
    "generateCV"
    "generatePodcast"
    "podcastStatus"
)

# Enhancement functions
ENHANCEMENT_FUNCTIONS=(
    "generateVideoIntroduction"
    "generatePortfolioGallery"
    "generateCertificationBadges"
    "generateQRCode"
    "trackQRCodeScan"
)

# ATS and optimization functions
ATS_FUNCTIONS=(
    "analyzeATSCompatibility"
    "applyATSOptimizations"
    "getATSTemplates"
    "generateATSKeywords"
    "batchATSAnalysis"
)

# Advanced features
ADVANCED_FUNCTIONS=(
    "generateSkillsVisualization"
    "generatePersonalityInsights"
    "createPublicProfile"
    "generateTimeline"
    "optimizeForIndustry"
    "optimizeForRegion"
)

# Media and social functions
MEDIA_FUNCTIONS=(
    "generateAudioFromText"
    "generateSocialMediaIntegration"
    "addSocialProfile"
    "updateSocialProfile"
    "removeSocialProfile"
)

# Utility and admin functions
UTILITY_FUNCTIONS=(
    "getTemplates"
    "testConfiguration"
    "testAuth"
    "llmVerificationStatus"
    "podcastStatusPublic"
)

deploy_batch() {
    local functions=("$@")
    local function_list=""
    
    for func in "${functions[@]}"; do
        if [ -n "$function_list" ]; then
            function_list="$function_list,functions:$func"
        else
            function_list="functions:$func"
        fi
    done
    
    echo "📦 Deploying batch: ${functions[*]}"
    echo "⏳ Command: firebase deploy --only $function_list --project $PROJECT_ID"
    
    if firebase deploy --only "$function_list" --project "$PROJECT_ID"; then
        echo "✅ Batch deployed successfully"
    else
        echo "❌ Batch deployment failed"
        return 1
    fi
    
    echo "⏸️  Waiting $DELAY_BETWEEN_BATCHES seconds before next batch..."
    sleep $DELAY_BETWEEN_BATCHES
    echo ""
}

deploy_functions_in_batches() {
    local all_functions=("$@")
    local batch=()
    local count=0
    
    for func in "${all_functions[@]}"; do
        batch+=("$func")
        count=$((count + 1))
        
        if [ $count -eq $BATCH_SIZE ]; then
            deploy_batch "${batch[@]}"
            batch=()
            count=0
        fi
    done
    
    # Deploy remaining functions if any
    if [ ${#batch[@]} -gt 0 ]; then
        deploy_batch "${batch[@]}"
    fi
}

main() {
    echo "🏗️  Phase 1: Core Functions"
    deploy_functions_in_batches "${CORE_FUNCTIONS[@]}"
    
    echo "🎨 Phase 2: Enhancement Functions"
    deploy_functions_in_batches "${ENHANCEMENT_FUNCTIONS[@]}"
    
    echo "🎯 Phase 3: ATS Functions"
    deploy_functions_in_batches "${ATS_FUNCTIONS[@]}"
    
    echo "🚀 Phase 4: Advanced Functions"
    deploy_functions_in_batches "${ADVANCED_FUNCTIONS[@]}"
    
    echo "📱 Phase 5: Media Functions"
    deploy_functions_in_batches "${MEDIA_FUNCTIONS[@]}"
    
    echo "🔧 Phase 6: Utility Functions"
    deploy_functions_in_batches "${UTILITY_FUNCTIONS[@]}"
    
    echo ""
    echo "🎉 All functions deployed successfully!"
    echo "📊 Total functions deployed: $((${#CORE_FUNCTIONS[@]} + ${#ENHANCEMENT_FUNCTIONS[@]} + ${#ATS_FUNCTIONS[@]} + ${#ADVANCED_FUNCTIONS[@]} + ${#MEDIA_FUNCTIONS[@]} + ${#UTILITY_FUNCTIONS[@]}))"
}

# Run the deployment
main