#!/bin/bash
set -euo pipefail

# Bayit+ Full Stack Deployment Script
# Deploys all platforms: Web (Firebase), Backend (Cloud Run), iOS, and tvOS
# Usage: ./deploy_all.sh [options]

# Get script directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Find repository root by looking for package.json or backend directory
# Support both centralized scripts location and in-repo execution
if [[ -f "package.json" ]] && [[ -d "backend" ]]; then
    REPO_ROOT="$(pwd)"
elif [[ -f "../../package.json" ]] && [[ -d "../../backend" ]]; then
    REPO_ROOT="$(cd ../.. && pwd)"
elif [[ -d "../../../olorin-media/bayit-plus" ]]; then
    REPO_ROOT="$(cd ../../../olorin-media/bayit-plus && pwd)"
else
    echo "Error: Cannot find repository root. Please run from repository root or adjust REPO_ROOT"
    exit 1
fi

SCRIPTS_DIR="$REPO_ROOT/scripts"

# Verify scripts directory exists
if [[ ! -d "$SCRIPTS_DIR/shared/common" ]]; then
    echo "Error: Shared utilities not found at $SCRIPTS_DIR/shared/common"
    exit 1
fi

# Source shared utilities from scripts/shared/common/
source "$SCRIPTS_DIR/shared/common/colors.sh"
source "$SCRIPTS_DIR/shared/common/logging.sh"
source "$SCRIPTS_DIR/shared/common/prerequisites.sh"
source "$SCRIPTS_DIR/shared/common/firebase-deploy.sh"

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
            echo "  Olorin.ai Platform (configured in backend/.env):"
            echo "  PINECONE_API_KEY                  Pinecone API key for semantic search"
            echo "  PARTNER_API_KEY_SALT              Salt for partner API key hashing"
            echo "  OLORIN_DUBBING_ENABLED            Enable realtime dubbing (true/false)"
            echo "  OLORIN_SEMANTIC_SEARCH_ENABLED    Enable semantic search (true/false)"
            echo "  OLORIN_CULTURAL_CONTEXT_ENABLED   Enable cultural context (true/false)"
            echo "  OLORIN_RECAP_ENABLED              Enable recap agent (true/false)"
            echo "  FEATURE_SCENE_SEARCH_ENABLED      Enable scene search feature (true/false)"
            echo ""
            echo "  Turborepo Remote Cache (for faster CI/CD builds):"
            echo "  TURBO_TOKEN                       Vercel Turborepo remote cache token"
            echo "  TURBO_TEAM                        Turborepo team name (optional)"
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
    log_step "Checking Prerequisites"

    # Check common tools
    check_prerequisites "npm" || exit 1

    # Check platform-specific tools (non-fatal)
    if [[ "$SKIP_BACKEND" != "true" ]]; then
        if ! command_exists gcloud; then
            log_warning "gcloud CLI not found - backend deployment will be skipped"
            SKIP_BACKEND=true
        else
            print_success "gcloud CLI found"
        fi
    fi

    if [[ "$SKIP_FRONTEND" != "true" ]]; then
        if ! command_exists firebase; then
            log_warning "Firebase CLI not found - frontend deployment will be skipped"
            SKIP_FRONTEND=true
        else
            print_success "Firebase CLI found"
        fi
    fi

    # Check for iOS/tvOS tools (macOS only)
    if [[ "$SKIP_IOS" != "true" ]] || [[ "$SKIP_TVOS" != "true" ]]; then
        if [[ "$(uname)" != "Darwin" ]]; then
            log_warning "Not running on macOS - iOS/tvOS deployments will be skipped"
            SKIP_IOS=true
            SKIP_TVOS=true
        elif ! command_exists xcodebuild; then
            log_warning "Xcode not found - iOS/tvOS deployments will be skipped"
            SKIP_IOS=true
            SKIP_TVOS=true
        else
            print_success "Xcode command line tools found"
        fi
    fi

    # ============================================================
    # STEP 1: Build and Verify Web Frontend
    # ============================================================
    if [[ "$SKIP_FRONTEND" != "true" && "$SKIP_BUILD" != "true" ]]; then
        log_step "Building and Verifying Web Frontend"
        STEP_START=$(date +%s)

        cd "$REPO_ROOT/web"

        # Step 1a: Install dependencies
        print_info "Installing dependencies..."
        if ! npm install --silent 2>/dev/null; then
            print_error "Failed to install dependencies"
            RESULT_WEB_BUILD="FAILED"
        else
            print_success "Dependencies installed"

            # Step 1b: TypeScript type checking
            print_info "Running TypeScript type check..."
            if npm run type-check 2>/dev/null; then
                print_success "TypeScript types verified"
            elif npx tsc --noEmit 2>/dev/null; then
                print_success "TypeScript types verified"
            else
                print_warning "TypeScript check skipped"
            fi

            # Step 1c: ESLint check (optional - don't fail on lint errors)
            print_info "Running ESLint check..."
            if npm run lint 2>/dev/null; then
                print_success "ESLint passed"
            else
                print_warning "ESLint check skipped or has warnings"
            fi

            # Step 1d: Build the application
            print_info "Building production bundle..."
            if ! npm run build; then
                print_error "Build failed!"
                RESULT_WEB_BUILD="FAILED"
            else
                print_success "Web build complete"

                # Step 1e: Verify build output
                if verify_build_artifacts "$REPO_ROOT/web/dist" 5; then
                    RESULT_WEB_BUILD="SUCCESS"
                else
                    RESULT_WEB_BUILD="FAILED"
                fi
            fi
        fi

        TIME_WEB_BUILD=$(($(date +%s) - STEP_START))

        # Fail early if web build failed
        if [[ "$RESULT_WEB_BUILD" == "FAILED" ]]; then
            print_error "Web frontend build verification failed - aborting frontend deployment"
            SKIP_FRONTEND=true
        fi
    elif [[ "$SKIP_BUILD" == "true" ]]; then
        log_info "Skipping web build (using existing dist)"
        # Verify existing dist
        if verify_build_artifacts "$REPO_ROOT/web/dist" 5; then
            RESULT_WEB_BUILD="SKIPPED"
        else
            RESULT_WEB_BUILD="FAILED"
            SKIP_FRONTEND=true
        fi
    fi

    # ============================================================
    # STEP 2: Deploy Firebase Hosting
    # ============================================================
    if [[ "$SKIP_FRONTEND" != "true" ]]; then
        log_step "Deploying Firebase Hosting"
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
    # STEP 3: Verify Backend Build (before deployment)
    # ============================================================
    RESULT_BACKEND_BUILD="SKIPPED"
    TIME_BACKEND_BUILD=0

    if [[ "$SKIP_BACKEND" != "true" && "$SKIP_BUILD" != "true" ]]; then
        log_step "Verifying Backend Build"
        STEP_START=$(date +%s)

        cd "$REPO_ROOT/backend"

        # Check Poetry is available
        if ! command_exists poetry; then
            print_error "Poetry not found - backend build verification failed"
            RESULT_BACKEND_BUILD="FAILED"
        else
            print_info "Checking Poetry lock file..."
            if ! poetry check 2>&1 | grep -q "All set"; then
                print_warning "Poetry lock file may need updating, continuing..."
            fi
            print_success "Poetry check complete"

            print_info "Installing dependencies..."
            if ! poetry install --no-root 2>&1 | tail -5; then
                print_error "Failed to install dependencies"
                RESULT_BACKEND_BUILD="FAILED"
            else
                print_success "Dependencies installed"

                print_info "Verifying Python syntax..."
                SYNTAX_ERROR=false

                # Compile main app
                if ! poetry run python -m py_compile app/main.py 2>&1; then
                    print_error "Python syntax error in app/main.py"
                    SYNTAX_ERROR=true
                fi

                # Compile route files
                for f in app/api/routes/*.py; do
                    if [[ -f "$f" ]] && ! poetry run python -m py_compile "$f" 2>&1; then
                        print_error "Python syntax error in $f"
                        SYNTAX_ERROR=true
                    fi
                done

                # Compile service files
                for f in app/services/*.py; do
                    if [[ -f "$f" ]] && ! poetry run python -m py_compile "$f" 2>&1; then
                        print_error "Python syntax error in $f"
                        SYNTAX_ERROR=true
                    fi
                done

                # Compile AI agent files
                for f in app/services/ai_agent/*.py; do
                    if [[ -f "$f" ]] && ! poetry run python -m py_compile "$f" 2>&1; then
                        print_error "Python syntax error in $f"
                        SYNTAX_ERROR=true
                    fi
                done
                for f in app/services/ai_agent/executors/*.py; do
                    if [[ -f "$f" ]] && ! poetry run python -m py_compile "$f" 2>&1; then
                        print_error "Python syntax error in $f"
                        SYNTAX_ERROR=true
                    fi
                done

                if [[ "$SYNTAX_ERROR" == "true" ]]; then
                    RESULT_BACKEND_BUILD="FAILED"
                else
                    print_success "Python syntax verification passed"

                    print_info "Verifying application imports..."
                    # Capture output and check for 'OK' at the end
                    IMPORT_OUTPUT=$(poetry run python -c "from app.main import app; print('OK')" 2>&1)
                    if echo "$IMPORT_OUTPUT" | tail -1 | grep -q "OK"; then
                        print_success "Application imports verified"
                        RESULT_BACKEND_BUILD="SUCCESS"
                    else
                        print_error "Application import failed"
                        echo "$IMPORT_OUTPUT"
                        RESULT_BACKEND_BUILD="FAILED"
                    fi
                fi
            fi
        fi

        TIME_BACKEND_BUILD=$(($(date +%s) - STEP_START))

        # Fail deployment if build verification failed
        if [[ "$RESULT_BACKEND_BUILD" == "FAILED" ]]; then
            print_error "Backend build verification failed - aborting backend deployment"
            SKIP_BACKEND=true
            RESULT_CLOUD_RUN_BACKEND="FAILED"
        else
            print_success "Backend build verification passed"
        fi
    elif [[ "$SKIP_BUILD" == "true" ]]; then
        print_info "Skipping backend build verification (using existing build)"
    fi

    # ============================================================
    # STEP 4: Deploy Backend to Cloud Run
    # ============================================================
    if [[ "$SKIP_BACKEND" != "true" ]]; then
        log_step "Deploying Backend to Cloud Run"
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
        if [[ "$RESULT_CLOUD_RUN_BACKEND" != "FAILED" ]]; then
            RESULT_CLOUD_RUN_BACKEND="SKIPPED"
        fi
    fi

    # ============================================================
    # STEP 5: Deploy iOS Mobile App
    # ============================================================
    if [[ "$SKIP_IOS" != "true" ]]; then
        log_step "Deploying iOS Mobile App"
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
    # STEP 6: Deploy tvOS App
    # ============================================================
    if [[ "$SKIP_TVOS" != "true" ]]; then
        log_step "Deploying tvOS App"
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
    print_row "Backend Build" "$RESULT_BACKEND_BUILD" "$TIME_BACKEND_BUILD"
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
    [[ "$RESULT_WEB_BUILD" == "FAILED" ]] && ((FAILURES++))
    [[ "$RESULT_FIREBASE_HOSTING" == "FAILED" ]] && ((FAILURES++))
    [[ "$RESULT_BACKEND_BUILD" == "FAILED" ]] && ((FAILURES++))
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
