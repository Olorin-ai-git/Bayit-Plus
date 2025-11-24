#!/bin/bash

# Smart Deploy - Simple wrapper for the Intelligent Firebase Deployment System
# This integrates with existing deployment scripts while providing enhanced functionality

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

show_usage() {
    echo -e "${BLUE}Smart Deploy - Intelligent Firebase Deployment${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Standard Deployment Modes:"
    echo "  -h, --help          Show this help message"
    echo "  -f, --full          Run full intelligent deployment (default)"
    echo "  -q, --quick         Quick deployment (skip some validations)"
    echo "  -t, --test          Test mode (validate only, no deployment)"
    echo "  -b, --batch-only    Deploy functions in batches only"
    echo "  -r, --report        Generate report only (requires previous deployment log)"
    echo ""
    echo "Production Deployment Modes:"
    echo "  -p, --production    Production deployment with enhanced validation"
    echo "  --blue-green        Blue-green production deployment (zero downtime)"
    echo "  --rollback [version] Rollback to specified version"
    echo "  --health-check-only  Production health check only"
    echo ""
    echo "Deployment Options:"
    echo "  --skip-validation   Skip pre-deployment validation"
    echo "  --skip-health       Skip health checks"
    echo "  --force             Force deployment even with warnings"
    echo "  --environment [env] Target environment (development|staging|production)"
    echo ""
    echo "Examples:"
    echo "  $0                  # Full intelligent deployment"
    echo "  $0 --quick          # Quick deployment with minimal validation"
    echo "  $0 --test           # Test and validate without deploying"
    echo "  $0 --production     # Production deployment with full validation"
    echo "  $0 --blue-green     # Zero-downtime blue-green deployment"
    echo "  $0 --rollback v1.2.3 # Rollback to version 1.2.3"
}

# Parse command line arguments
DEPLOYMENT_MODE="full"
SKIP_VALIDATION=false
SKIP_HEALTH=false
FORCE_DEPLOY=false
PRODUCTION_MODE=false
BLUE_GREEN_MODE=false
ROLLBACK_VERSION=""
TARGET_ENVIRONMENT="development"
HEALTH_CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -f|--full)
            DEPLOYMENT_MODE="full"
            shift
            ;;
        -q|--quick)
            DEPLOYMENT_MODE="quick"
            shift
            ;;
        -t|--test)
            DEPLOYMENT_MODE="test"
            shift
            ;;
        -b|--batch-only)
            DEPLOYMENT_MODE="batch-only"
            shift
            ;;
        -r|--report)
            DEPLOYMENT_MODE="report-only"
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --skip-health)
            SKIP_HEALTH=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        -p|--production)
            PRODUCTION_MODE=true
            TARGET_ENVIRONMENT="production"
            shift
            ;;
        --blue-green)
            BLUE_GREEN_MODE=true
            PRODUCTION_MODE=true
            TARGET_ENVIRONMENT="production"
            shift
            ;;
        --rollback)
            if [[ -n "$2" && "$2" != --* ]]; then
                ROLLBACK_VERSION="$2"
                DEPLOYMENT_MODE="rollback"
                PRODUCTION_MODE=true
                TARGET_ENVIRONMENT="production"
                shift 2
            else
                echo "Error: --rollback requires a version number"
                exit 1
            fi
            ;;
        --health-check-only)
            HEALTH_CHECK_ONLY=true
            DEPLOYMENT_MODE="health-check-only"
            shift
            ;;
        --environment)
            if [[ -n "$2" && "$2" != --* ]]; then
                TARGET_ENVIRONMENT="$2"
                shift 2
            else
                echo "Error: --environment requires a value (development|staging|production)"
                exit 1
            fi
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main deployment logic
main() {
    echo -e "${BLUE}🚀 Smart Deploy - Olorin AI Fraud Detection Platform${NC}"
    echo -e "Mode: ${YELLOW}$DEPLOYMENT_MODE${NC}"
    echo -e "Project: $PROJECT_ROOT"
    echo ""
    
    # Show production mode warning
    if [[ "$PRODUCTION_MODE" == true ]]; then
        echo -e "${YELLOW}⚠️  PRODUCTION DEPLOYMENT MODE ACTIVE${NC}"
        echo -e "Environment: ${YELLOW}$TARGET_ENVIRONMENT${NC}"
        if [[ "$BLUE_GREEN_MODE" == true ]]; then
            echo -e "Strategy: ${YELLOW}Blue-Green Deployment${NC}"
        fi
        echo ""
    fi
    
    case $DEPLOYMENT_MODE in
        "full")
            if [[ "$PRODUCTION_MODE" == true ]]; then
                run_production_deployment
            else
                run_full_deployment
            fi
            ;;
        "quick")
            if [[ "$PRODUCTION_MODE" == true ]]; then
                echo "❌ Quick mode not allowed for production deployments"
                exit 1
            fi
            run_quick_deployment
            ;;
        "test")
            run_test_mode
            ;;
        "batch-only")
            run_batch_only_deployment
            ;;
        "report-only")
            run_report_only
            ;;
        "rollback")
            run_production_rollback
            ;;
        "health-check-only")
            run_health_check_only
            ;;
        *)
            echo "Invalid deployment mode: $DEPLOYMENT_MODE"
            exit 1
            ;;
    esac
}

run_full_deployment() {
    echo -e "${GREEN}Running full intelligent deployment...${NC}"
    
    # Check if intelligent deploy script exists
    if [[ -f "$SCRIPT_DIR/intelligent-deploy.sh" ]]; then
        exec "$SCRIPT_DIR/intelligent-deploy.sh"
    else
        echo "⚠️  Intelligent deploy script not found, falling back to existing deployment"
        fallback_to_existing_deployment
    fi
}

run_quick_deployment() {
    echo -e "${GREEN}Running quick Olorin deployment...${NC}"
    
    # Quick mode: basic validation and fast deployment
    if [[ $SKIP_VALIDATION == false ]]; then
        echo "🔍 Running basic validation..."
        
        # Check if firebase.json exists
        if [[ ! -f "$PROJECT_ROOT/firebase.json" ]]; then
            echo "❌ firebase.json not found"
            exit 1
        fi
        
        # Check if frontend directory exists
        if [[ ! -d "$PROJECT_ROOT/olorin-front" ]]; then
            echo "❌ Frontend directory not found: olorin-front"
            exit 1
        fi
        
        # Check if we're logged into Firebase
        if ! firebase login:list &> /dev/null; then
            echo "❌ Not logged into Firebase"
            echo "Login with: firebase login"
            exit 1
        fi
        
        echo "✅ Basic validation passed"
    fi
    
    # Use the fallback deployment function for quick mode
    fallback_to_existing_deployment
}

run_test_mode() {
    echo -e "${GREEN}Running test mode (validation only)...${NC}"
    
    echo "🔍 Pre-deployment validation..."
    node "$SCRIPT_DIR/modules/pre-deployment-validator.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config"
    
    echo "📊 Quota analysis..."
    node "$SCRIPT_DIR/modules/quota-manager.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config"
    
    echo -e "${GREEN}✅ Test mode completed - no deployment performed${NC}"
}

run_batch_only_deployment() {
    echo -e "${GREEN}Running batch-only function deployment...${NC}"
    
    # Quick validation
    echo "🔍 Basic validation..."
    node "$SCRIPT_DIR/modules/pre-deployment-validator.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config" || {
        echo "❌ Validation failed"
        exit 1
    }
    
    # Deploy only functions using existing batch script if available
    if [[ -f "$SCRIPT_DIR/deploy-batch.sh" ]]; then
        echo "📦 Using existing batch deployment..."
        exec "$SCRIPT_DIR/deploy-batch.sh"
    else
        echo "📦 Using intelligent batch deployment..."
        node "$SCRIPT_DIR/modules/deployment-engine.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config"
    fi
}

run_report_only() {
    echo -e "${GREEN}Generating deployment report only...${NC}"
    
    # Find the most recent log file
    LOGS_DIR="$PROJECT_ROOT/logs/deployment"
    
    if [[ -d "$LOGS_DIR" ]]; then
        LATEST_LOG=$(find "$LOGS_DIR" -name "intelligent-deploy-*.log" -type f -exec ls -t {} + | head -n1)
        
        if [[ -n "$LATEST_LOG" ]]; then
            REPORT_FILE="$LOGS_DIR/deployment-report-$(date +%Y%m%d-%H%M%S).json"
            echo "📊 Generating report from: $LATEST_LOG"
            
            node "$SCRIPT_DIR/modules/deployment-reporter.js" "$PROJECT_ROOT" "$LATEST_LOG" "$REPORT_FILE"
            
            echo -e "${GREEN}✅ Report generated: $REPORT_FILE${NC}"
        else
            echo "❌ No deployment log files found in $LOGS_DIR"
            exit 1
        fi
    else
        echo "❌ Logs directory not found: $LOGS_DIR"
        exit 1
    fi
}

fallback_to_existing_deployment() {
    echo -e "${YELLOW}📦 Using Olorin deployment fallback...${NC}"
    
    # Look for existing deployment scripts in order of preference
    local existing_scripts=(
<<<<<<< HEAD
        "$PROJECT_ROOT/deploy-backend.sh"
        "$PROJECT_ROOT/deploy-cloudrun-direct.sh"
=======
        "$PROJECT_ROOT/scripts/deployment/deploy-backend.sh"
        "$PROJECT_ROOT/scripts/deployment/deploy-cloudrun-direct.sh"
>>>>>>> 001-modify-analyzer-method
    )
    
    for script in "${existing_scripts[@]}"; do
        if [[ -f "$script" && -x "$script" ]]; then
            echo "🔄 Executing: $script"
            exec "$script"
        fi
    done
    
    # Olorin-specific deployment fallback
    echo "🔄 Falling back to Olorin Firebase deployment..."
    cd "$PROJECT_ROOT"
    
    # Configure Firebase hosting target if not already done
    if ! firebase target:list | grep -q "olorin-frontend"; then
        echo "⚙️  Configuring Firebase hosting target..."
        firebase target:apply hosting olorin-frontend olorin-ai
    fi
    
    # Build frontend (olorin-front)
    echo "🔨 Building Olorin frontend..."
    if [[ -d "$PROJECT_ROOT/olorin-front" ]]; then
        cd "$PROJECT_ROOT/olorin-front" && npm run build
    else
        echo "❌ Frontend directory not found: $PROJECT_ROOT/olorin-front"
        exit 1
    fi
    
    # Deploy frontend
    echo "🚀 Deploying frontend to Firebase hosting..."
    cd "$PROJECT_ROOT"
    firebase deploy --only hosting
    
    # Deploy backend if App Hosting configuration exists
    echo "🔧 Checking backend deployment..."
    if firebase apphosting:backends:list | grep -q "olorin-backend"; then
        echo "📡 Backend exists, checking for updates..."
        # Note: App Hosting deployments typically happen automatically via git
        echo "ℹ️  Backend updates deploy automatically via git commits"
    else
        echo "⚠️  Backend not found in App Hosting, may need manual setup"
    fi
    
    echo -e "${GREEN}✅ Olorin deployment completed${NC}"
    echo -e "Frontend URL: ${BLUE}https://olorin-ai.web.app${NC}"
    echo -e "Backend URL: ${BLUE}https://olorin-backend--olorin-ai.us-central1.hosted.app${NC}"
}

run_production_deployment() {
    echo -e "${GREEN}🚀 Running production deployment with enhanced validation...${NC}"
    
    # Export production environment variables for modules
    export DEPLOYMENT_MODE="production"
    export TARGET_ENVIRONMENT="$TARGET_ENVIRONMENT"
    export PRODUCTION_MODE="$PRODUCTION_MODE"
    export BLUE_GREEN_MODE="$BLUE_GREEN_MODE"
    export SKIP_VALIDATION="$SKIP_VALIDATION"
    export SKIP_HEALTH="$SKIP_HEALTH"
    export FORCE_DEPLOY="$FORCE_DEPLOY"
    
    # Check if production manager module exists
    if [[ -f "$SCRIPT_DIR/modules/production-manager.js" ]]; then
        echo "🎯 Using production manager module..."
        node "$SCRIPT_DIR/modules/production-manager.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config"
    elif [[ -f "$SCRIPT_DIR/intelligent-deploy.sh" ]]; then
        echo "📊 Using intelligent deploy with production settings..."
        DEPLOYMENT_MODE="production" exec "$SCRIPT_DIR/intelligent-deploy.sh"
    else
        echo "⚠️  Production deployment scripts not found, using enhanced validation..."
        run_enhanced_production_fallback
    fi
}

run_production_rollback() {
    echo -e "${GREEN}⏪ Running production rollback to version: ${YELLOW}$ROLLBACK_VERSION${NC}"
    
    # Export rollback environment variables
    export DEPLOYMENT_MODE="rollback"
    export TARGET_ENVIRONMENT="production"
    export ROLLBACK_VERSION="$ROLLBACK_VERSION"
    export PRODUCTION_MODE="true"
    
    # Check if production manager exists
    if [[ -f "$SCRIPT_DIR/modules/production-manager.js" ]]; then
        echo "🎯 Using production manager for rollback..."
        node "$SCRIPT_DIR/modules/production-manager.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config"
    else
        echo "❌ Production manager not found. Rollback functionality requires production-manager.js module"
        echo "Please run: npm install && npm run setup-production-tools"
        exit 1
    fi
}

run_health_check_only() {
    echo -e "${GREEN}🏥 Running production health checks only...${NC}"
    
    # Check if health checker module exists
    if [[ -f "$SCRIPT_DIR/modules/health-checker.js" ]]; then
        echo "📊 Running comprehensive health checks..."
        export HEALTH_CHECK_MODE="production"
        export TARGET_ENVIRONMENT="$TARGET_ENVIRONMENT"
        
        node "$SCRIPT_DIR/modules/health-checker.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config"
    else
        echo "❌ Health checker module not found: $SCRIPT_DIR/modules/health-checker.js"
        exit 1
    fi
}

run_enhanced_production_fallback() {
    echo -e "${YELLOW}📦 Running enhanced production fallback deployment...${NC}"
    
    # Enhanced production validation
    echo "🔍 Running production validation..."
    
    # Check if pre-deployment validator exists
    if [[ -f "$SCRIPT_DIR/modules/pre-deployment-validator.js" ]]; then
        export VALIDATION_MODE="production"
        export TARGET_ENVIRONMENT="production"
        
        echo "✅ Running production pre-deployment validation..."
        if ! node "$SCRIPT_DIR/modules/pre-deployment-validator.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config"; then
            echo "❌ Production validation failed"
            if [[ "$FORCE_DEPLOY" != true ]]; then
                exit 1
            else
                echo "⚠️  Forcing deployment despite validation failures"
            fi
        fi
    fi
    
    # Build with production settings
    echo "🔨 Building Olorin frontend for production..."
    cd "$PROJECT_ROOT/olorin-front" && NODE_ENV=production npm run build
    
    echo "⚡ Checking Olorin backend (Python FastAPI)..."
    if [[ -d "$PROJECT_ROOT/olorin-server" ]]; then
        echo "✅ Backend directory found: olorin-server"
        # Python backend doesn't need npm build, but we can check dependencies
        cd "$PROJECT_ROOT/olorin-server"
        if command -v poetry &> /dev/null; then
            echo "📦 Checking Python dependencies with Poetry..."
            poetry check
        else
            echo "⚠️  Poetry not found, skipping dependency check"
        fi
    else
        echo "❌ Backend directory not found: olorin-server"
    fi
    
    # Deploy with production settings
    echo "🚀 Deploying to production Firebase..."
    cd "$PROJECT_ROOT"
    
    # Use production Firebase project if configured
    if firebase use --project olorin-ai-production &> /dev/null; then
        echo "✅ Using olorin-ai-production Firebase project"
    elif firebase use --project olorin-ai &> /dev/null; then
        echo "✅ Using olorin-ai Firebase project"
    else
        echo "⚠️  No production project configured, using current project"
    fi
    
    firebase deploy --force
    
    # Run post-deployment health checks
    if [[ -f "$SCRIPT_DIR/modules/health-checker.js" ]] && [[ "$SKIP_HEALTH" != true ]]; then
        echo "🏥 Running post-deployment health checks..."
        export HEALTH_CHECK_MODE="post-deployment"
        export TARGET_ENVIRONMENT="production"
        
        if ! node "$SCRIPT_DIR/modules/health-checker.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config"; then
            echo "❌ Post-deployment health checks failed"
            echo "🔄 Consider running: $0 --rollback [previous-version]"
            if [[ "$FORCE_DEPLOY" != true ]]; then
                exit 1
            fi
        fi
    fi
    
    echo -e "${GREEN}✅ Enhanced production deployment completed${NC}"
}

# Check prerequisites
check_prerequisites() {
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required but not found"
        exit 1
    fi
    
    # Check if Firebase CLI is available
    if ! command -v firebase &> /dev/null; then
        echo "❌ Firebase CLI is required but not found"
        echo "Install with: npm install -g firebase-tools"
        exit 1
    fi
    
    # Check if we're in a Firebase project
    if [[ ! -f "$PROJECT_ROOT/firebase.json" ]]; then
        echo "❌ Not a Firebase project (firebase.json not found)"
        exit 1
    fi
    
    # Make sure we're logged into Firebase
    if ! firebase login:list &> /dev/null; then
        echo "❌ Not logged into Firebase"
        echo "Login with: firebase login"
        exit 1
    fi
}

# Run prerequisites check
check_prerequisites

# Execute main function
main