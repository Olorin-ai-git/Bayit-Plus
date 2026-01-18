#!/bin/bash
set -e

# Bayit+ Full Stack Deployment Script
# Deploys all platforms: Web (Firebase), Backend (Cloud Run), iOS, and tvOS
# Usage: ./deploy_all.sh [options]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${MAGENTA}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║${NC} ${BLUE}$1${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════╝${NC}\n"
}

print_section() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Parse arguments
SKIP_BACKEND=false
SKIP_FRONTEND=false
SKIP_IOS=false
SKIP_TVOS=false
SKIP_BUILD=false
SKIP_UPLOAD=false

for arg in "$@"; do
    case $arg in
        --skip-backend)
            SKIP_BACKEND=true
            shift
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --skip-ios)
            SKIP_IOS=true
            shift
            ;;
        --skip-tvos)
            SKIP_TVOS=true
            shift
            ;;
        --skip-mobile)
            SKIP_IOS=true
            SKIP_TVOS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-upload)
            SKIP_UPLOAD=true
            shift
            ;;
        --web-only)
            SKIP_IOS=true
            SKIP_TVOS=true
            shift
            ;;
        --mobile-only)
            SKIP_BACKEND=true
            SKIP_FRONTEND=true
            shift
            ;;
        --help|-h)
            echo "Bayit+ Full Stack Deployment Script"
            echo ""
            echo "Usage: ./deploy_all.sh [options]"
            echo ""
            echo "Platform Options:"
            echo "  --skip-backend    Skip Cloud Run backend deployment"
            echo "  --skip-frontend   Skip Firebase web frontend deployment"
            echo "  --skip-ios        Skip iOS mobile app deployment"
            echo "  --skip-tvos       Skip tvOS app deployment"
            echo "  --skip-mobile     Skip both iOS and tvOS deployments"
            echo "  --web-only        Deploy only web frontend and backend"
            echo "  --mobile-only     Deploy only iOS and tvOS apps"
            echo ""
            echo "Build Options:"
            echo "  --skip-build      Skip build steps (use existing artifacts)"
            echo "  --skip-upload     Skip App Store Connect upload (mobile only)"
            echo ""
            echo "Other:"
            echo "  --help, -h        Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  GCP_PROJECT_ID                    Google Cloud Project ID"
            echo "  GCP_REGION                        Google Cloud Region"
            echo "  FIREBASE_PROJECT                  Firebase project ID"
            echo "  APP_STORE_CONNECT_API_KEY_ID      App Store Connect API Key ID"
            echo "  APP_STORE_CONNECT_ISSUER_ID       App Store Connect Issuer ID"
            echo "  APP_STORE_CONNECT_API_KEY_PATH    Path to .p8 API key file"
            echo ""
            echo "  Apple Push Notifications (configured in backend/.env):"
            echo "  APPLE_KEY_ID                      APNs Key ID (from Apple Developer Portal)"
            echo "  APPLE_TEAM_ID                     Apple Developer Team ID"
            echo "  APPLE_KEY_PATH                    Path to APNs .p8 key file"
            echo "  APPLE_BUNDLE_ID_IOS               iOS app bundle identifier"
            echo "  APPLE_BUNDLE_ID_TVOS              tvOS app bundle identifier"
            echo ""
            echo "Examples:"
            echo "  ./deploy_all.sh                   # Deploy everything"
            echo "  ./deploy_all.sh --web-only        # Deploy web + backend only"
            echo "  ./deploy_all.sh --skip-backend    # Deploy frontend + mobile"
            echo "  ./deploy_all.sh --mobile-only     # Deploy iOS + tvOS only"
            exit 0
            ;;
    esac
done

# Get script directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
FIREBASE_PROJECT="${FIREBASE_PROJECT:-bayit-plus}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-bayit-plus}"
GCP_REGION="${GCP_REGION:-us-east1}"

# Track deployment results (using simple variables for bash 3.x compatibility)
RESULT_WEB_BUILD="SKIPPED"
RESULT_FIREBASE_HOSTING="SKIPPED"
RESULT_CLOUD_RUN_BACKEND="SKIPPED"
RESULT_IOS_APP="SKIPPED"
RESULT_TVOS_APP="SKIPPED"

TIME_WEB_BUILD=0
TIME_FIREBASE_HOSTING=0
TIME_CLOUD_RUN_BACKEND=0
TIME_IOS_APP=0
TIME_TVOS_APP=0

# Main deployment
main() {
    print_header "Bayit+ Full Stack Deployment"

    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  Deploying Bayit+ to all platforms"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    echo -e "${CYAN}Deployment Configuration:${NC}"
    echo "  Repository Root: $REPO_ROOT"
    echo ""
    echo "  Web Platform:"
    echo "    Firebase Project: $FIREBASE_PROJECT"
    echo "    GCP Project: $GCP_PROJECT_ID"
    echo "    GCP Region: $GCP_REGION"
    echo ""
    echo "  Deployments Enabled:"
    echo "    Backend (Cloud Run): $([ "$SKIP_BACKEND" == "true" ] && echo "No" || echo "Yes")"
    echo "    Frontend (Firebase): $([ "$SKIP_FRONTEND" == "true" ] && echo "No" || echo "Yes")"
    echo "    iOS Mobile App:      $([ "$SKIP_IOS" == "true" ] && echo "No" || echo "Yes")"
    echo "    tvOS App:            $([ "$SKIP_TVOS" == "true" ] && echo "No" || echo "Yes")"
    echo ""

    # Track total start time
    TOTAL_START_TIME=$(date +%s)

    # Check prerequisites
    print_section "Checking Prerequisites"

    if ! command_exists gcloud; then
        print_warning "gcloud CLI not found - backend deployment will fail"
    else
        print_success "gcloud CLI found"
    fi

    if [[ "$SKIP_FRONTEND" != "true" ]]; then
        if ! command_exists firebase; then
            print_warning "Firebase CLI not found - frontend deployment will fail"
        else
            print_success "Firebase CLI found"
        fi
    fi

    if ! command_exists npm; then
        print_error "npm not found. Please install Node.js"
        exit 1
    fi
    print_success "npm found"

    if [[ "$SKIP_IOS" != "true" ]] || [[ "$SKIP_TVOS" != "true" ]]; then
        if [[ "$(uname)" != "Darwin" ]]; then
            print_warning "Not running on macOS - iOS/tvOS deployments will be skipped"
            SKIP_IOS=true
            SKIP_TVOS=true
        else
            if ! command_exists xcodebuild; then
                print_warning "Xcode not found - iOS/tvOS deployments will be skipped"
                SKIP_IOS=true
                SKIP_TVOS=true
            else
                print_success "Xcode command line tools found"
            fi
        fi
    fi

    # ============================================================
    # STEP 1: Build Web Frontend
    # ============================================================
    if [[ "$SKIP_FRONTEND" != "true" && "$SKIP_BUILD" != "true" ]]; then
        print_section "Building Web Frontend"
        STEP_START=$(date +%s)

        cd "$REPO_ROOT/web"

        print_info "Installing dependencies..."
        npm install
        print_success "Dependencies installed"

        print_info "Building production bundle..."
        npm run build
        print_success "Web build complete"

        # Verify build output
        if [[ ! -d "$REPO_ROOT/web/dist" ]]; then
            print_error "Build failed - dist directory not found"
            RESULT_WEB_BUILD="FAILED"
        else
            print_success "Build output verified at web/dist"
            RESULT_WEB_BUILD="SUCCESS"
        fi

        TIME_WEB_BUILD=$(($(date +%s) - STEP_START))
    elif [[ "$SKIP_BUILD" == "true" ]]; then
        print_info "Skipping web build (using existing dist)"
        RESULT_WEB_BUILD="SKIPPED"
    fi

    # ============================================================
    # STEP 2: Deploy Firebase Hosting
    # ============================================================
    if [[ "$SKIP_FRONTEND" != "true" ]]; then
        print_section "Deploying Firebase Hosting"
        STEP_START=$(date +%s)

        cd "$REPO_ROOT"

        print_info "Deploying to Firebase Hosting..."
        if firebase deploy --only hosting --project "$FIREBASE_PROJECT"; then
            print_success "Firebase Hosting deployed"
            RESULT_FIREBASE_HOSTING="SUCCESS"
        else
            print_error "Firebase Hosting deployment failed"
            RESULT_FIREBASE_HOSTING="FAILED"
        fi

        TIME_FIREBASE_HOSTING=$(($(date +%s) - STEP_START))
    else
        print_info "Skipping Firebase frontend deployment"
        RESULT_FIREBASE_HOSTING="SKIPPED"
    fi

    # ============================================================
    # STEP 3: Deploy Backend to Cloud Run
    # ============================================================
    if [[ "$SKIP_BACKEND" != "true" ]]; then
        print_section "Deploying Backend to Cloud Run"
        STEP_START=$(date +%s)

        print_info "Running backend deployment with ENABLE_APIS=true..."

        # Export environment variables for the backend script
        export ENABLE_APIS=true
        export GCP_PROJECT_ID="$GCP_PROJECT_ID"
        export GCP_REGION="$GCP_REGION"

        # Run the backend deployment script
        if [[ -x "$SCRIPT_DIR/deploy_server.sh" ]]; then
            if "$SCRIPT_DIR/deploy_server.sh"; then
                print_success "Backend deployment complete"
                RESULT_CLOUD_RUN_BACKEND="SUCCESS"
            else
                print_error "Backend deployment failed"
                RESULT_CLOUD_RUN_BACKEND="FAILED"
            fi
        else
            if bash "$SCRIPT_DIR/deploy_server.sh"; then
                print_success "Backend deployment complete"
                RESULT_CLOUD_RUN_BACKEND="SUCCESS"
            else
                print_error "Backend deployment failed"
                RESULT_CLOUD_RUN_BACKEND="FAILED"
            fi
        fi

        TIME_CLOUD_RUN_BACKEND=$(($(date +%s) - STEP_START))
    else
        print_info "Skipping Cloud Run backend deployment"
        RESULT_CLOUD_RUN_BACKEND="SKIPPED"
    fi

    # ============================================================
    # STEP 4: Deploy iOS Mobile App
    # ============================================================
    if [[ "$SKIP_IOS" != "true" ]]; then
        print_section "Deploying iOS Mobile App"
        STEP_START=$(date +%s)

        # Build iOS deployment arguments
        IOS_ARGS=""
        if [[ "$SKIP_BUILD" == "true" ]]; then
            IOS_ARGS="$IOS_ARGS --skip-build"
        fi
        if [[ "$SKIP_UPLOAD" == "true" ]]; then
            IOS_ARGS="$IOS_ARGS --skip-upload"
        fi

        # Run the iOS deployment script
        if [[ -x "$SCRIPT_DIR/deploy_ios.sh" ]]; then
            if "$SCRIPT_DIR/deploy_ios.sh" $IOS_ARGS; then
                print_success "iOS deployment complete"
                RESULT_IOS_APP="SUCCESS"
            else
                print_error "iOS deployment failed"
                RESULT_IOS_APP="FAILED"
            fi
        else
            if bash "$SCRIPT_DIR/deploy_ios.sh" $IOS_ARGS; then
                print_success "iOS deployment complete"
                RESULT_IOS_APP="SUCCESS"
            else
                print_error "iOS deployment failed"
                RESULT_IOS_APP="FAILED"
            fi
        fi

        TIME_IOS_APP=$(($(date +%s) - STEP_START))
    else
        print_info "Skipping iOS mobile app deployment"
        RESULT_IOS_APP="SKIPPED"
    fi

    # ============================================================
    # STEP 5: Deploy tvOS App
    # ============================================================
    if [[ "$SKIP_TVOS" != "true" ]]; then
        print_section "Deploying tvOS App"
        STEP_START=$(date +%s)

        # Build tvOS deployment arguments
        TVOS_ARGS=""
        if [[ "$SKIP_BUILD" == "true" ]]; then
            TVOS_ARGS="$TVOS_ARGS --skip-build"
        fi
        if [[ "$SKIP_UPLOAD" == "true" ]]; then
            TVOS_ARGS="$TVOS_ARGS --skip-upload"
        fi

        # Run the tvOS deployment script
        if [[ -x "$SCRIPT_DIR/deploy_tvos.sh" ]]; then
            if "$SCRIPT_DIR/deploy_tvos.sh" $TVOS_ARGS; then
                print_success "tvOS deployment complete"
                RESULT_TVOS_APP="SUCCESS"
            else
                print_error "tvOS deployment failed"
                RESULT_TVOS_APP="FAILED"
            fi
        else
            if bash "$SCRIPT_DIR/deploy_tvos.sh" $TVOS_ARGS; then
                print_success "tvOS deployment complete"
                RESULT_TVOS_APP="SUCCESS"
            else
                print_error "tvOS deployment failed"
                RESULT_TVOS_APP="FAILED"
            fi
        fi

        TIME_TVOS_APP=$(($(date +%s) - STEP_START))
    else
        print_info "Skipping tvOS app deployment"
        RESULT_TVOS_APP="SKIPPED"
    fi

    # ============================================================
    # DEPLOYMENT SUMMARY
    # ============================================================
    TOTAL_END_TIME=$(date +%s)
    TOTAL_ELAPSED=$((TOTAL_END_TIME - TOTAL_START_TIME))
    TOTAL_MINUTES=$((TOTAL_ELAPSED / 60))
    TOTAL_SECONDS=$((TOTAL_ELAPSED % 60))

    print_header "Deployment Summary"

    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  ${GREEN}Full Stack Deployment Complete!${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    echo "Platform Results:"
    echo "┌─────────────────────────┬──────────┬──────────┐"
    echo "│ Platform                │ Status   │ Time     │"
    echo "├─────────────────────────┼──────────┼──────────┤"

    # Helper function to print a row
    print_row() {
        local platform="$1"
        local status="$2"
        local time="$3"
        local time_str="-"
        local status_colored

        if [[ "$time" -gt 0 ]]; then
            time_str="${time}s"
        fi

        case "$status" in
            SUCCESS) status_colored="${GREEN}SUCCESS${NC}" ;;
            FAILED)  status_colored="${RED}FAILED${NC}" ;;
            *)       status_colored="${YELLOW}SKIPPED${NC}" ;;
        esac

        printf "│ %-23s │ " "$platform"
        echo -e "$status_colored │ $(printf '%-8s' "$time_str") │"
    }

    print_row "Web Build" "$RESULT_WEB_BUILD" "$TIME_WEB_BUILD"
    print_row "Firebase Hosting" "$RESULT_FIREBASE_HOSTING" "$TIME_FIREBASE_HOSTING"
    print_row "Cloud Run Backend" "$RESULT_CLOUD_RUN_BACKEND" "$TIME_CLOUD_RUN_BACKEND"
    print_row "iOS App" "$RESULT_IOS_APP" "$TIME_IOS_APP"
    print_row "tvOS App" "$RESULT_TVOS_APP" "$TIME_TVOS_APP"

    echo "└─────────────────────────┴──────────┴──────────┘"
    echo ""
    echo "Total Deployment Time: ${TOTAL_MINUTES}m ${TOTAL_SECONDS}s"
    echo ""

    # Show URLs
    echo "Deployed URLs:"
    if [[ "$RESULT_FIREBASE_HOSTING" == "SUCCESS" ]]; then
        echo "  Web:     https://$FIREBASE_PROJECT.web.app"
        echo "           https://bayit.tv (if custom domain configured)"
    fi
    if [[ "$RESULT_CLOUD_RUN_BACKEND" == "SUCCESS" ]]; then
        SERVICE_URL=$(gcloud run services describe bayit-plus-backend --region "$GCP_REGION" --format 'value(status.url)' 2>/dev/null || echo "Unknown")
        echo "  API:     $SERVICE_URL"
    fi
    if [[ "$RESULT_IOS_APP" == "SUCCESS" ]]; then
        echo "  iOS:     Check App Store Connect for TestFlight build"
    fi
    if [[ "$RESULT_TVOS_APP" == "SUCCESS" ]]; then
        echo "  tvOS:    Check App Store Connect for TestFlight build"
    fi
    echo ""

    # Count failures
    FAILURES=0
    [[ "$RESULT_FIREBASE_HOSTING" == "FAILED" ]] && ((FAILURES++))
    [[ "$RESULT_CLOUD_RUN_BACKEND" == "FAILED" ]] && ((FAILURES++))
    [[ "$RESULT_IOS_APP" == "FAILED" ]] && ((FAILURES++))
    [[ "$RESULT_TVOS_APP" == "FAILED" ]] && ((FAILURES++))

    if [[ $FAILURES -gt 0 ]]; then
        print_warning "$FAILURES deployment(s) failed. Check logs above for details."
        exit 1
    else
        print_success "All deployments completed successfully!"
    fi
}

# Run main function
main "$@"
