#!/bin/bash

# Enhanced Cloud Run Deployment Script - Builds on proven deploy-cloudrun-direct.sh
# Uses modular functions for deployment automation
# Author: Gil Klainert
# Date: 2025-09-06

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"
ENVIRONMENT="staging"
CONFIG_FILE=""
DEPLOYMENT_ID="$(date +%Y%m%d-%H%M%S)"

# Source deployment functions
source "$SCRIPT_DIR/deploy-functions.sh"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --config|-c)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --deployment-id)
            DEPLOYMENT_ID="$2"
            shift 2
            ;;
        --help)
            cat << EOF
Enhanced Cloud Run Deployment Script for Olorin Backend

Usage: $0 [OPTIONS]

OPTIONS:
    --environment, -e   Target environment (staging|production) [default: staging]
    --config, -c        Configuration file path (overrides environment default)
    --deployment-id     Custom deployment ID for tracking
    --help              Show this help message

Examples:
    $0 --environment staging           # Deploy to staging
    $0 --environment production        # Deploy to production  
    $0 --config custom-config.yaml     # Deploy with custom config
EOF
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

print_header "OLORIN BACKEND - ENHANCED DEPLOYMENT"

print_status "Deployment Configuration:"
echo "  Environment: $ENVIRONMENT"
echo "  Deployment ID: $DEPLOYMENT_ID"
echo "  Script Directory: $SCRIPT_DIR"
echo "  Backend Directory: $BACKEND_DIR"
echo

# Set config file if not explicitly provided
if [[ -z "$CONFIG_FILE" ]]; then
    CONFIG_FILE="$SCRIPT_DIR/$ENVIRONMENT.yaml"
fi

# Load configuration
print_header "LOADING CONFIGURATION"
if ! load_configuration "$CONFIG_FILE"; then
    exit 1
fi

print_status "Parsed Configuration:"
echo "  Service Name: $SERVICE_NAME"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Resources: ${MEMORY} RAM, ${CPU} CPU"
echo "  Scaling: ${MIN_INSTANCES}-${MAX_INSTANCES} instances"
echo

# Enhanced pre-deployment validation
print_header "ENHANCED PRE-DEPLOYMENT VALIDATION"
if ! validate_docker_setup "$BACKEND_DIR"; then
    exit 1
fi

# Create deployment tracking
print_header "DEPLOYMENT TRACKING"
DEPLOYMENT_LOG="$SCRIPT_DIR/deployments.log"
create_deployment_tracking "$DEPLOYMENT_ID" "$ENVIRONMENT" "$SERVICE_NAME" "$DEPLOYMENT_LOG"

# Build environment variables
print_header "ENVIRONMENT CONFIGURATION"
ENV_VARS_FILE=$(mktemp)
build_env_vars_file "$CONFIG_FILE" "$ENV_VARS_FILE"

# Build secrets configuration
SECRETS_CMD=""
build_secrets_command "$CONFIG_FILE" SECRETS_CMD

# Execute deployment
print_header "EXECUTING DEPLOYMENT"
cd "$BACKEND_DIR"

# Build deployment command
DEPLOY_CMD=(
    gcloud run deploy "$SERVICE_NAME"
    --source "."
    --region "$REGION"
    --project "$PROJECT_ID"
    --env-vars-file "$ENV_VARS_FILE"
    --memory "$MEMORY"
    --cpu "$CPU"
    --min-instances "$MIN_INSTANCES"
    --max-instances "$MAX_INSTANCES"
    --timeout "$(yq eval '.service.timeout // "300"' "$CONFIG_FILE")"
    --concurrency "$(yq eval '.service.concurrency // "100"' "$CONFIG_FILE")"
    --execution-environment "$(yq eval '.service.execution_environment // "gen2"' "$CONFIG_FILE")"
    --allow-unauthenticated
    --quiet
)

# Add secrets if configured
if [[ -n "$SECRETS_CMD" ]]; then
    eval "DEPLOY_CMD+=($SECRETS_CMD)"
fi

print_status "Executing deployment command..."
print_status "This may take several minutes..."

# Execute deployment with error handling
if "${DEPLOY_CMD[@]}"; then
    print_success "✓ Deployment completed successfully!"
    log_deployment_result "SUCCESS" "$DEPLOYMENT_ID" "$ENVIRONMENT" "$SERVICE_NAME" "$DEPLOYMENT_LOG"
    
    # Get service URL and validate
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")
    
    print_header "POST-DEPLOYMENT VALIDATION"
    print_status "Service URL: $SERVICE_URL"
    
    validate_health_endpoints "$SERVICE_URL"
    
    # Final deployment summary
    print_header "DEPLOYMENT COMPLETE"
    print_success "🎉 Enhanced Olorin Backend deployment successful!"
    echo
    print_status "Deployment Information:"
    echo "  Deployment ID: $DEPLOYMENT_ID"
    echo "  Environment: $ENVIRONMENT"
    echo "  Service Name: $SERVICE_NAME"
    echo "  Service URL: $SERVICE_URL"
    echo "  Configuration: $CONFIG_FILE"
    
else
    print_error "Deployment failed"
    log_deployment_result "FAILED" "$DEPLOYMENT_ID" "$ENVIRONMENT" "$SERVICE_NAME" "$DEPLOYMENT_LOG"
    rm -f "$ENV_VARS_FILE"
    exit 1
fi

# Cleanup
rm -f "$ENV_VARS_FILE"
print_success "Enhanced deployment script completed successfully!"