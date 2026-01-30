#!/bin/bash
#
# Beta 500 Staging Deployment Script
# Deploys backend, frontend, and monitoring stack to staging environment
#
# Usage: ./scripts/deploy-beta-staging.sh [component]
#   component: all|backend|frontend|monitoring (default: all)
#

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="bayit-plus"
REGION="us-central1"
ENVIRONMENT="staging"
BACKEND_IMAGE="gcr.io/${PROJECT_ID}/backend:beta-500-${ENVIRONMENT}"
MONITORING_INSTANCE="beta-500-monitoring-${ENVIRONMENT}"

# Component to deploy (default: all)
COMPONENT="${1:-all}"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI not found. Please install Google Cloud SDK."
        exit 1
    fi

    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        log_error "firebase CLI not found. Please install: npm install -g firebase-tools"
        exit 1
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker."
        exit 1
    fi

    # Check authenticated with gcloud
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        log_error "Not authenticated with gcloud. Run: gcloud auth login"
        exit 1
    fi

    # Verify project
    CURRENT_PROJECT=$(gcloud config get-value project)
    if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
        log_warning "Current project is $CURRENT_PROJECT, switching to $PROJECT_ID"
        gcloud config set project $PROJECT_ID
    fi

    log_success "Prerequisites check passed"
}

# Deploy backend
deploy_backend() {
    log_info "Deploying backend to Cloud Run..."

    cd backend

    # Run tests first
    log_info "Running unit tests..."
    PYTHONPATH=. poetry run pytest test/unit/beta/ -v --tb=short || {
        log_error "Unit tests failed. Aborting deployment."
        exit 1
    }

    # Build Docker image
    log_info "Building Docker image: $BACKEND_IMAGE"
    docker build -t $BACKEND_IMAGE -f Dockerfile .

    # Push to GCR
    log_info "Pushing image to Google Container Registry..."
    docker push $BACKEND_IMAGE

    # Deploy to Cloud Run
    log_info "Deploying to Cloud Run (staging)..."
    gcloud run deploy bayit-backend-${ENVIRONMENT} \
        --image=$BACKEND_IMAGE \
        --platform=managed \
        --region=$REGION \
        --allow-unauthenticated \
        --min-instances=2 \
        --max-instances=4 \
        --memory=4Gi \
        --cpu=2 \
        --timeout=300 \
        --set-env-vars="ENVIRONMENT=${ENVIRONMENT}" \
        --set-secrets="BETA_500_PROGRAM_ACTIVE=BETA_500_PROGRAM_ACTIVE:latest,\
BETA_500_MAX_USERS=BETA_500_MAX_USERS:latest,\
BETA_500_INITIAL_CREDITS=BETA_500_INITIAL_CREDITS:latest,\
BETA_EMAIL_VERIFICATION_SECRET=BETA_EMAIL_VERIFICATION_SECRET:latest,\
BETA_FRAUD_FINGERPRINT_SALT=BETA_FRAUD_FINGERPRINT_SALT:latest,\
MONGODB_URI=MONGODB_URI_STAGING:latest"

    # Get service URL
    SERVICE_URL=$(gcloud run services describe bayit-backend-${ENVIRONMENT} \
        --region=$REGION \
        --format='value(status.url)')

    log_success "Backend deployed successfully: $SERVICE_URL"

    # Health check
    log_info "Running health check..."
    if curl -f -s "${SERVICE_URL}/health" > /dev/null; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi

    # Verify Beta API endpoints
    log_info "Verifying Beta API endpoints..."
    if curl -f -s "${SERVICE_URL}/api/v1/beta/credits/balance" > /dev/null 2>&1; then
        log_success "Beta API endpoints accessible"
    else
        log_warning "Beta API endpoints may require authentication"
    fi

    cd ..
}

# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend applications..."

    # Web Application
    log_info "Building and deploying web application..."
    cd web

    # Build for staging
    REACT_APP_ENV=staging \
    REACT_APP_API_BASE_URL="https://bayit-backend-${ENVIRONMENT}-xxx.run.app" \
    npm run build

    # Deploy to Firebase Hosting staging channel
    firebase deploy --only hosting:${ENVIRONMENT} --project $PROJECT_ID

    log_success "Web application deployed to staging"

    cd ..

    # Mobile Application (iOS)
    log_info "Building mobile application (iOS) - via EAS..."
    cd mobile-app

    if command -v eas &> /dev/null; then
        log_info "Starting iOS staging build..."
        eas build --platform ios --profile staging --non-interactive || {
            log_warning "iOS build started but may take time to complete"
        }
    else
        log_warning "EAS CLI not found. Skipping mobile builds. Install: npm install -g eas-cli"
    fi

    cd ..

    log_success "Frontend deployment initiated"
}

# Deploy monitoring stack
deploy_monitoring() {
    log_info "Deploying monitoring stack..."

    # Check if monitoring instance exists
    if ! gcloud compute instances describe $MONITORING_INSTANCE \
        --zone=${REGION}-a &> /dev/null; then
        log_info "Creating monitoring instance..."
        gcloud compute instances create $MONITORING_INSTANCE \
            --zone=${REGION}-a \
            --machine-type=n1-standard-2 \
            --boot-disk-size=50GB \
            --image-family=ubuntu-2004-lts \
            --image-project=ubuntu-os-cloud \
            --tags=http-server,https-server,monitoring

        log_info "Waiting for instance to be ready..."
        sleep 30
    else
        log_info "Monitoring instance already exists"
    fi

    # Copy monitoring configs to instance
    log_info "Copying monitoring configurations..."
    gcloud compute scp --recurse \
        infrastructure/monitoring/* \
        ${MONITORING_INSTANCE}:~/monitoring/ \
        --zone=${REGION}-a

    # Install Docker and start services
    log_info "Setting up monitoring services..."
    gcloud compute ssh $MONITORING_INSTANCE --zone=${REGION}-a --command="
        # Install Docker if not present
        if ! command -v docker &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y docker.io docker-compose
            sudo usermod -aG docker \$USER
        fi

        # Start monitoring stack
        cd ~/monitoring
        sudo docker-compose down
        sudo docker-compose up -d prometheus grafana alertmanager

        # Wait for services to start
        sleep 10

        # Check service status
        sudo docker-compose ps
    "

    # Get instance external IP
    MONITORING_IP=$(gcloud compute instances describe $MONITORING_INSTANCE \
        --zone=${REGION}-a \
        --format='value(networkInterfaces[0].accessConfigs[0].natIP)')

    log_success "Monitoring stack deployed"
    log_info "Prometheus: http://${MONITORING_IP}:9090"
    log_info "Grafana: http://${MONITORING_IP}:3000 (admin/admin)"
    log_info "Alertmanager: http://${MONITORING_IP}:9093"
}

# Run integration tests
run_integration_tests() {
    log_info "Running integration tests on staging..."

    # Get backend URL
    SERVICE_URL=$(gcloud run services describe bayit-backend-${ENVIRONMENT} \
        --region=$REGION \
        --format='value(status.url)')

    cd backend

    # Set test environment
    export API_BASE_URL="$SERVICE_URL"
    export TEST_ENV="staging"

    # Run integration tests
    log_info "Running Beta 500 API tests..."
    PYTHONPATH=. poetry run pytest test/integration/test_beta_500_api.py -v || {
        log_error "Integration tests failed"
        exit 1
    }

    log_info "Running Beta AI API tests..."
    PYTHONPATH=. poetry run pytest test/integration/test_beta_ai_api.py -v || {
        log_error "AI API integration tests failed"
        exit 1
    }

    cd ..

    log_success "Integration tests passed"
}

# Main deployment flow
main() {
    log_info "Starting Beta 500 staging deployment..."
    log_info "Component: $COMPONENT"
    log_info "Environment: $ENVIRONMENT"
    log_info "Region: $REGION"
    echo ""

    check_prerequisites
    echo ""

    case $COMPONENT in
        backend)
            deploy_backend
            ;;
        frontend)
            deploy_frontend
            ;;
        monitoring)
            deploy_monitoring
            ;;
        all)
            deploy_backend
            echo ""
            deploy_frontend
            echo ""
            deploy_monitoring
            echo ""
            run_integration_tests
            ;;
        *)
            log_error "Invalid component: $COMPONENT"
            log_info "Valid components: all|backend|frontend|monitoring"
            exit 1
            ;;
    esac

    echo ""
    log_success "╔════════════════════════════════════════════════════════════╗"
    log_success "║   Beta 500 Staging Deployment Complete!                   ║"
    log_success "╚════════════════════════════════════════════════════════════╝"
    echo ""

    # Print deployment summary
    if [ "$COMPONENT" == "all" ] || [ "$COMPONENT" == "backend" ]; then
        SERVICE_URL=$(gcloud run services describe bayit-backend-${ENVIRONMENT} \
            --region=$REGION \
            --format='value(status.url)' 2>/dev/null || echo "N/A")
        log_info "Backend API: $SERVICE_URL"
    fi

    if [ "$COMPONENT" == "all" ] || [ "$COMPONENT" == "frontend" ]; then
        log_info "Web App: https://${ENVIRONMENT}.bayit.plus"
    fi

    if [ "$COMPONENT" == "all" ] || [ "$COMPONENT" == "monitoring" ]; then
        MONITORING_IP=$(gcloud compute instances describe $MONITORING_INSTANCE \
            --zone=${REGION}-a \
            --format='value(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "N/A")
        log_info "Grafana: http://${MONITORING_IP}:3000"
    fi

    echo ""
    log_info "Next steps:"
    log_info "1. Open Grafana and verify metrics flowing"
    log_info "2. Run load tests: cd backend/tests/load/beta && locust"
    log_info "3. Manual feature validation"
    log_info "4. Review deployment logs and alerts"
    echo ""
}

# Run main function
main
