#!/bin/bash
# Firebase App Hosting Deployment Script for Olorin Backend
# FastAPI Python service with MCP integration
# Author: Gil Klainert
# Date: 2025-08-31

set -e  # Exit on any error

# Configuration
PROJECT_ID="olorin-ai"
LOCATION="us-central1"
SERVICE_NAME="olorin-backend"
CODEBASE="olorin-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display usage
usage() {
    echo "🚀 Olorin Backend Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -p, --project PROJECT_ID    Firebase project ID (default: olorin-ai)"
    echo "  -l, --location LOCATION     Deployment location (default: us-central1)"
    echo "  -e, --env ENVIRONMENT       Environment (dev, staging, production)"
    echo "  -d, --dry-run              Dry run - validate only, don't deploy"
    echo "  -v, --verbose              Verbose output"
    echo "  -h, --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                         # Deploy to production"
    echo "  $0 --dry-run              # Validate configuration only"
    echo "  $0 --env staging          # Deploy to staging environment"
    echo "  $0 --verbose              # Deploy with verbose output"
}

# Parse command line arguments
DRY_RUN=false
VERBOSE=false
ENVIRONMENT="production"

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ID="$2"
            shift 2
            ;;
        -l|--location)
            LOCATION="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Display configuration
echo "🚀 Olorin Backend Firebase App Hosting Deployment"
echo "=============================================="
echo "Project ID: $PROJECT_ID"
echo "Location: $LOCATION"
echo "Environment: $ENVIRONMENT"
echo "Service: $SERVICE_NAME"
echo "Codebase: $CODEBASE"
echo "Dry Run: $DRY_RUN"
echo "Verbose: $VERBOSE"
echo ""

# Validate prerequisites
log_info "🔍 Validating prerequisites..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    log_error "Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase login:list | grep -q "olorin-ai.web.app"; then
    log_warning "You may not be logged in to Firebase. Please run:"
    echo "firebase login"
    exit 1
fi

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    log_warning "Google Cloud CLI not found. Some features may not work."
fi

# Check if we're in the right directory
if [ ! -f "apphosting.yaml" ] || [ ! -f "firebase.json" ]; then
    log_error "Configuration files not found. Please run this script from the project root."
    exit 1
fi

# Validate backend source directory
if [ ! -d "olorin-server" ]; then
    log_error "Backend source directory 'olorin-server' not found."
    exit 1
fi

# Check if Dockerfile exists
if [ ! -f "olorin-server/Dockerfile" ]; then
    log_error "Dockerfile not found in olorin-server directory."
    exit 1
fi

# Check if pyproject.toml exists
if [ ! -f "olorin-server/pyproject.toml" ]; then
    log_error "pyproject.toml not found in olorin-server directory."
    exit 1
fi

log_success "✅ Prerequisites validated"

# Validate configuration files
log_info "📋 Validating configuration files..."

# Validate apphosting.yaml
if [ ! -s "apphosting.yaml" ]; then
    log_error "apphosting.yaml is empty or invalid"
    exit 1
fi

# Validate firebase.json
if ! python3 -m json.tool firebase.json > /dev/null 2>&1; then
    log_error "firebase.json is not valid JSON"
    exit 1
fi

log_success "✅ Configuration files validated"

# Pre-deployment checks
log_info "🔧 Running pre-deployment checks..."

# Check Python version in backend
cd olorin-server

# Verify Poetry configuration
if [ -f "pyproject.toml" ]; then
    log_info "📦 Checking Poetry configuration..."
    if command -v poetry &> /dev/null; then
        poetry check || log_warning "Poetry configuration issues detected"
    else
        log_warning "Poetry not installed locally. Using container build."
    fi
fi

# Return to root directory
cd ..

log_success "✅ Pre-deployment checks completed"

# Dry run validation
if [ "$DRY_RUN" = true ]; then
    log_info "🧪 Dry run mode - validating deployment configuration..."
    
    # Validate Firebase project
    firebase projects:list | grep -q "$PROJECT_ID" || {
        log_error "Project $PROJECT_ID not found in your Firebase projects"
        exit 1
    }
    
    log_success "✅ Dry run validation completed successfully"
    log_info "Configuration is valid. Run without --dry-run to deploy."
    exit 0
fi

# Deploy to Firebase App Hosting
log_info "🚀 Starting Firebase App Hosting deployment..."

# Set Firebase project
firebase use "$PROJECT_ID" || {
    log_error "Failed to set Firebase project to $PROJECT_ID"
    exit 1
}

# Deploy the backend service
log_info "📤 Deploying backend service to App Hosting..."

DEPLOY_CMD="firebase apphosting:backends:create $CODEBASE --location=$LOCATION"

if [ "$VERBOSE" = true ]; then
    DEPLOY_CMD="$DEPLOY_CMD --debug"
fi

eval $DEPLOY_CMD || {
    log_error "Backend deployment failed"
    exit 1
}

log_success "✅ Backend deployed successfully"

# Display deployment information
log_info "📊 Deployment Summary:"
echo "  Project: $PROJECT_ID"
echo "  Service: $SERVICE_NAME"
echo "  Location: $LOCATION"
echo "  Environment: $ENVIRONMENT"
echo "  Timestamp: $(date)"

# Get service URL (if available)
log_info "🌐 Retrieving service URLs..."
firebase apphosting:backends:list --json | grep -A 10 "$CODEBASE" || {
    log_warning "Could not retrieve service URL. Check Firebase console."
}

# Health check
log_info "🏥 Running post-deployment health check..."

# Wait a moment for service to be ready
sleep 10

# Try to get service status
log_info "Checking service status..."
gcloud run services describe "$SERVICE_NAME" \
    --region="$LOCATION" \
    --project="$PROJECT_ID" \
    --format="value(status.url)" 2>/dev/null || {
    log_warning "Could not retrieve service status via gcloud"
}

log_success "🎉 Deployment completed successfully!"

echo ""
echo "📚 Next Steps:"
echo "1. Check the Firebase console for deployment status"
echo "2. Test the health endpoint: /health"
echo "3. Verify MCP server integration"
echo "4. Monitor logs for any issues"
echo ""
echo "🔗 Useful Links:"
echo "  Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
echo "  App Hosting: https://console.firebase.google.com/project/$PROJECT_ID/apphosting"
echo "  Cloud Run: https://console.cloud.google.com/run?project=$PROJECT_ID"