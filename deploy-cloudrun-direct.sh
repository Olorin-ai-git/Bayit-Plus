#!/bin/bash

# Direct Cloud Run Deployment Script for Olorin Backend
# Deploy Python FastAPI backend with MCP integration directly to Google Cloud Run
# Author: Gil Klainert
# Date: 2025-08-31

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="olorin-backend"
REGION="us-central1"
PORT="8000"
PROJECT_ID="olorin-ai"
SOURCE_DIR="./olorin-server"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

# Parse command line arguments
FORCE_DEPLOY=false
DRY_RUN=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --help)
            cat << EOF
Direct Cloud Run Deployment Script for Olorin Backend

Usage: $0 [OPTIONS]

OPTIONS:
    --force      Force deployment even if validation fails
    --dry-run    Show what would be deployed without actually deploying
    --verbose    Enable verbose output
    --project    Google Cloud project ID (default: olorin-ai)
    --region     Deployment region (default: us-central1)
    --port       Service port (default: 8000)
    --help       Show this help message

Examples:
    $0                          # Deploy with default settings
    $0 --dry-run                # Preview deployment
    $0 --force --verbose        # Force deploy with verbose output
    $0 --project my-project     # Deploy to different project
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

print_header "OLORIN BACKEND - DIRECT CLOUD RUN DEPLOYMENT"

print_status "Deployment Configuration:"
echo "  Service Name: $SERVICE_NAME"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Port: $PORT"
echo "  Source Directory: $SOURCE_DIR"
echo "  Force Deploy: $FORCE_DEPLOY"
echo "  Dry Run: $DRY_RUN"
echo

# Pre-deployment validation
print_header "PRE-DEPLOYMENT VALIDATION"

# Check if we're in the correct directory
if [[ ! -f "pyproject.toml" ]] && [[ ! -d "$SOURCE_DIR" ]]; then
    print_error "Not in Olorin project directory or source directory not found"
    print_error "Expected to find either pyproject.toml or $SOURCE_DIR directory"
    exit 1
fi

print_success "✓ Found Olorin project structure"

# Check for source directory
if [[ ! -d "$SOURCE_DIR" ]]; then
    print_error "Source directory $SOURCE_DIR not found"
    exit 1
fi

print_success "✓ Source directory exists: $SOURCE_DIR"

# Check for Dockerfile
if [[ ! -f "$SOURCE_DIR/Dockerfile" ]]; then
    print_error "Dockerfile not found in $SOURCE_DIR"
    exit 1
fi

print_success "✓ Dockerfile found"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not found. Please install Google Cloud SDK"
    exit 1
fi

print_success "✓ gcloud CLI installed"

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    print_error "No active gcloud authentication found"
    print_error "Please run: gcloud auth login"
    exit 1
fi

print_success "✓ gcloud authentication active"

# Set project
if [[ $VERBOSE == true ]]; then
    print_status "Setting gcloud project to: $PROJECT_ID"
fi

gcloud config set project "$PROJECT_ID" --quiet

# Check project access
if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
    print_error "Cannot access project: $PROJECT_ID"
    print_error "Please check project ID and permissions"
    exit 1
fi

print_success "✓ Project access verified: $PROJECT_ID"

# Check required APIs
print_status "Checking required Google Cloud APIs..."

REQUIRED_APIS=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "secretmanager.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        if [[ $VERBOSE == true ]]; then
            print_success "✓ API enabled: $api"
        fi
    else
        print_warning "API not enabled: $api"
        print_status "Enabling $api..."
        gcloud services enable "$api" --quiet
        print_success "✓ Enabled: $api"
    fi
done

print_success "✓ All required APIs enabled"

# Validate Python application structure
print_status "Validating Python application structure..."

if [[ ! -f "$SOURCE_DIR/pyproject.toml" ]]; then
    print_error "pyproject.toml not found in $SOURCE_DIR"
    exit 1
fi

if [[ ! -d "$SOURCE_DIR/app" ]]; then
    print_error "app directory not found in $SOURCE_DIR"
    exit 1
fi

print_success "✓ Python FastAPI structure validated"

# Check for MCP integration
if grep -q "langchain-mcp-adapters" "$SOURCE_DIR/pyproject.toml"; then
    print_success "✓ MCP integration detected in dependencies"
else
    print_warning "MCP integration not found in dependencies"
fi

# Environment variables setup
print_header "ENVIRONMENT CONFIGURATION"

# Create environment variables file for deployment
ENV_VARS_FILE=$(mktemp)
cat > "$ENV_VARS_FILE" << EOF
APP_ENV=prd
FIREBASE_PROJECT_ID=$PROJECT_ID
LOG_LEVEL=INFO
PYTHONPATH=/app
EOF

print_status "Environment variables configured:"
if [[ $VERBOSE == true ]]; then
    cat "$ENV_VARS_FILE"
fi

print_success "✓ Environment configuration ready"

# Dry run check
if [[ $DRY_RUN == true ]]; then
    print_header "DRY RUN - DEPLOYMENT PREVIEW"
    
    echo "Would execute the following gcloud command:"
    echo
    echo "gcloud run deploy $SERVICE_NAME \\"
    echo "  --source $SOURCE_DIR \\"
    echo "  --region $REGION \\"
    echo "  --port $PORT \\"
    echo "  --allow-unauthenticated \\"
    echo "  --project $PROJECT_ID \\"
    echo "  --set-env-vars APP_ENV=prd,FIREBASE_PROJECT_ID=$PROJECT_ID,LOG_LEVEL=INFO,PYTHONPATH=/app \\"
    echo "  --memory 4Gi \\"
    echo "  --cpu 2 \\"
    echo "  --min-instances 1 \\"
    echo "  --max-instances 100 \\"
    echo "  --timeout 300 \\"
    echo "  --concurrency 100"
    echo
    
    print_status "Dry run complete. Use without --dry-run to execute deployment."
    rm -f "$ENV_VARS_FILE"
    exit 0
fi

# Final confirmation unless forced
if [[ $FORCE_DEPLOY == false ]]; then
    print_header "DEPLOYMENT CONFIRMATION"
    echo "Ready to deploy to Google Cloud Run with the following configuration:"
    echo "  Project: $PROJECT_ID"
    echo "  Service: $SERVICE_NAME"
    echo "  Region: $REGION"
    echo "  Source: $SOURCE_DIR"
    echo "  Port: $PORT"
    echo
    read -p "Proceed with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled by user"
        rm -f "$ENV_VARS_FILE"
        exit 0
    fi
fi

# Execute deployment
print_header "EXECUTING CLOUD RUN DEPLOYMENT"

print_status "Deploying $SERVICE_NAME to Cloud Run..."
print_status "This may take several minutes..."

# Build deployment command
DEPLOY_CMD=(
    gcloud run deploy "$SERVICE_NAME"
    --source "$SOURCE_DIR"
    --region "$REGION"
    --port "$PORT"
    --allow-unauthenticated
    --project "$PROJECT_ID"
    --set-env-vars "APP_ENV=prd,FIREBASE_PROJECT_ID=$PROJECT_ID,LOG_LEVEL=INFO,PYTHONPATH=/app"
    --memory "4Gi"
    --cpu "2"
    --min-instances "1"
    --max-instances "100"
    --timeout "300"
    --concurrency "100"
    --quiet
)

# Add verbose flag if requested
if [[ $VERBOSE == true ]]; then
    DEPLOY_CMD+=(--verbosity=info)
fi

# Execute deployment
if "${DEPLOY_CMD[@]}"; then
    print_success "✓ Cloud Run deployment completed successfully!"
else
    print_error "Deployment failed"
    rm -f "$ENV_VARS_FILE"
    exit 1
fi

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")

print_header "DEPLOYMENT VALIDATION"

# Test health endpoint
print_status "Testing health endpoint..."
sleep 10  # Wait for service to be fully ready

if curl -f -s "${SERVICE_URL}/health" > /dev/null; then
    print_success "✓ Health endpoint responding correctly"
else
    print_warning "Health endpoint not responding (may still be starting up)"
fi

# Test basic API
print_status "Testing basic API endpoint..."
if curl -f -s "${SERVICE_URL}/docs" > /dev/null; then
    print_success "✓ FastAPI docs endpoint accessible"
else
    print_warning "API docs not accessible (may still be starting up)"
fi

# Final status
print_header "DEPLOYMENT COMPLETE"

print_success "🎉 Olorin Backend successfully deployed to Google Cloud Run!"
echo
print_status "Service Information:"
echo "  Service Name: $SERVICE_NAME"
echo "  Project: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service URL: $SERVICE_URL"
echo
print_status "Important URLs:"
echo "  Health Check: ${SERVICE_URL}/health"
echo "  API Documentation: ${SERVICE_URL}/docs"
echo "  OpenAPI Spec: ${SERVICE_URL}/openapi.json"
echo
print_status "Management Commands:"
echo "  View logs: gcloud run logs tail $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
echo "  Service info: gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
echo "  Scale service: gcloud run services update $SERVICE_NAME --min-instances=N --max-instances=N --region=$REGION --project=$PROJECT_ID"
echo

# Cleanup
rm -f "$ENV_VARS_FILE"

print_success "Deployment script completed successfully!"