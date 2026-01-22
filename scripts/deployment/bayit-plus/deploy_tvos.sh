#!/bin/bash
set -euo pipefail

# Bayit+ tvOS App Deployment Script
# Builds and uploads tvOS app to App Store Connect (TestFlight)
# Usage: ./deploy_tvos.sh [--skip-build] [--skip-upload]

# Get script directory and repository root (centralized deployment script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OLORIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REPO_ROOT="$OLORIN_ROOT/olorin-media/bayit-plus"
TVOS_APP_DIR="$REPO_ROOT/tvos-app"
TVOS_DIR="$TVOS_APP_DIR/tvos"

# Source shared utilities
source "$OLORIN_ROOT/scripts/common/colors.sh"
source "$OLORIN_ROOT/scripts/common/logging.sh"
source "$OLORIN_ROOT/scripts/common/prerequisites.sh"

# Parse arguments
SKIP_BUILD=false
SKIP_UPLOAD=false
BUILD_CONFIGURATION="Release"

for arg in "$@"; do
    case $arg in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-upload)
            SKIP_UPLOAD=true
            shift
            ;;
        --debug)
            BUILD_CONFIGURATION="Debug"
            shift
            ;;
        --help|-h)
            echo "Bayit+ tvOS Deployment Script"
            echo ""
            echo "Usage: ./deploy_tvos.sh [options]"
            echo ""
            echo "Options:"
            echo "  --skip-build     Skip build step (use existing archive)"
            echo "  --skip-upload    Skip upload to App Store Connect"
            echo "  --debug          Build debug configuration instead of release"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "Required Environment Variables:"
            echo "  APP_STORE_CONNECT_API_KEY_ID      App Store Connect API Key ID"
            echo "  APP_STORE_CONNECT_ISSUER_ID       App Store Connect Issuer ID"
            echo "  APP_STORE_CONNECT_API_KEY_PATH    Path to .p8 API key file"
            echo ""
            echo "Optional Environment Variables:"
            echo "  TVOS_TEAM_ID                      Apple Developer Team ID"
            echo "  TVOS_BUNDLE_ID                    Bundle identifier (default: com.bayit.plus.tvos)"
            echo "  TVOS_SCHEME                       Xcode scheme (default: BayitPlusTVOS)"
            exit 0
            ;;
    esac
done

# Configuration
TVOS_SCHEME="${TVOS_SCHEME:-BayitPlusTVOS}"
TVOS_BUNDLE_ID="${TVOS_BUNDLE_ID:-com.bayit.plus.tvos}"
TVOS_WORKSPACE="$TVOS_DIR/BayitPlusTVOS.xcworkspace"
ARCHIVE_PATH="$TVOS_DIR/build/BayitPlusTVOS.xcarchive"
EXPORT_PATH="$TVOS_DIR/build/export"
EXPORT_OPTIONS_PLIST="$SCRIPT_DIR/ExportOptions-tvOS.plist"

# Main deployment
main() {
    print_header "Bayit+ tvOS App Deployment"

    # Track start time
    START_TIME=$(date +%s)

    # Check prerequisites
    log_step "Checking Prerequisites"

    if [[ "$(uname)" != "Darwin" ]]; then
        print_error "This script must be run on macOS"
        exit 1
    fi
    print_success "Running on macOS"

    # Check for required tools
    check_prerequisites "xcodebuild" "npm" || exit 1

    # Check for App Store Connect credentials (required for cloud-managed signing)
    CLOUD_SIGNING_AVAILABLE=false
    if [[ -n "$APP_STORE_CONNECT_API_KEY_ID" ]] && [[ -n "$APP_STORE_CONNECT_ISSUER_ID" ]] && [[ -n "$APP_STORE_CONNECT_API_KEY_PATH" ]]; then
        if [[ -f "$APP_STORE_CONNECT_API_KEY_PATH" ]]; then
            print_success "App Store Connect credentials configured (cloud-managed signing available)"
            CLOUD_SIGNING_AVAILABLE=true
        else
            log_warning "API key file not found: $APP_STORE_CONNECT_API_KEY_PATH"
        fi
    else
        log_warning "App Store Connect API credentials not set."
        log_info "For cloud-managed signing (no device required), set:"
        log_info "  APP_STORE_CONNECT_API_KEY_ID"
        log_info "  APP_STORE_CONNECT_ISSUER_ID"
        log_info "  APP_STORE_CONNECT_API_KEY_PATH"
        log_info "Without these, automatic signing requires registered Apple TV devices."
    fi

    # Skip upload if no credentials
    if [[ "$SKIP_UPLOAD" != "true" ]] && [[ "$CLOUD_SIGNING_AVAILABLE" != "true" ]]; then
        log_warning "Upload will be skipped (no API credentials)."
        SKIP_UPLOAD=true
    fi

    # Display configuration
    echo ""
    log_info "Configuration:"
    echo "  Scheme: $TVOS_SCHEME"
    echo "  Bundle ID: $TVOS_BUNDLE_ID"
    echo "  Configuration: $BUILD_CONFIGURATION"
    echo "  Workspace: $TVOS_WORKSPACE"
    echo "  Skip Build: $SKIP_BUILD"
    echo "  Skip Upload: $SKIP_UPLOAD"
    echo ""

    # Step 1: Install dependencies
    if [[ "$SKIP_BUILD" != "true" ]]; then
        log_step "Installing Dependencies"

        cd "$TVOS_APP_DIR"

        log_substep "Installing npm dependencies..."
        npm install --legacy-peer-deps
        print_success "npm dependencies installed"

        log_substep "Running React Native codegen..."
        npx react-native codegen
        print_success "Codegen completed"

        log_substep "Installing CocoaPods dependencies..."
        cd "$TVOS_DIR"
        pod install
        print_success "CocoaPods dependencies installed"
    fi

    # Step 2: Build archive
    if [[ "$SKIP_BUILD" != "true" ]]; then
        log_step "Building tvOS Archive"

        cd "$TVOS_DIR"

        # Clean build directory
        rm -rf build
        mkdir -p build

        log_building "tvOS archive..."

        # Build with API key authentication if available (enables cloud-managed signing)
        ARCHIVE_CMD="xcodebuild archive \
            -workspace \"$TVOS_WORKSPACE\" \
            -scheme \"$TVOS_SCHEME\" \
            -configuration \"$BUILD_CONFIGURATION\" \
            -archivePath \"$ARCHIVE_PATH\" \
            -destination \"generic/platform=tvOS\" \
            -allowProvisioningUpdates \
            CODE_SIGN_STYLE=Automatic"

        # Add API key authentication for cloud-managed signing
        if [[ -n "$APP_STORE_CONNECT_API_KEY_PATH" ]] && [[ -f "$APP_STORE_CONNECT_API_KEY_PATH" ]]; then
            log_info "Using App Store Connect API key for cloud-managed signing..."
            ARCHIVE_CMD="$ARCHIVE_CMD \
                -authenticationKeyPath \"$APP_STORE_CONNECT_API_KEY_PATH\" \
                -authenticationKeyID \"$APP_STORE_CONNECT_API_KEY_ID\" \
                -authenticationKeyIssuerID \"$APP_STORE_CONNECT_ISSUER_ID\""
        fi

        eval "$ARCHIVE_CMD" | tee build/archive.log

        if [[ ! -d "$ARCHIVE_PATH" ]]; then
            print_error "Archive failed - archive not found at $ARCHIVE_PATH"
            exit 1
        fi
        print_success "Archive created: $ARCHIVE_PATH"
    else
        if [[ ! -d "$ARCHIVE_PATH" ]]; then
            print_error "No existing archive found at $ARCHIVE_PATH"
            exit 1
        fi
        log_info "Using existing archive: $ARCHIVE_PATH"
    fi

    # Step 3: Create ExportOptions.plist if not exists
    log_step "Preparing Export Options"

    if [[ ! -f "$EXPORT_OPTIONS_PLIST" ]]; then
        log_substep "Creating ExportOptions-tvOS.plist..."
        cat > "$EXPORT_OPTIONS_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>destination</key>
    <string>upload</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>uploadSymbols</key>
    <true/>
    <key>manageAppVersionAndBuildNumber</key>
    <true/>
</dict>
</plist>
EOF
        print_success "ExportOptions-tvOS.plist created"
    else
        print_success "ExportOptions-tvOS.plist exists"
    fi

    # Step 4: Export IPA
    log_step "Exporting tvOS App"

    rm -rf "$EXPORT_PATH"
    mkdir -p "$EXPORT_PATH"

    log_substep "Exporting app..."
    xcodebuild -exportArchive \
        -archivePath "$ARCHIVE_PATH" \
        -exportPath "$EXPORT_PATH" \
        -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
        -allowProvisioningUpdates \
        | tee "$TVOS_DIR/build/export.log"

    IPA_FILE=$(find "$EXPORT_PATH" -name "*.ipa" | head -1)
    if [[ -z "$IPA_FILE" ]]; then
        print_error "Export failed - no IPA file found"
        exit 1
    fi
    print_success "App exported: $IPA_FILE"

    # Step 5: Upload to App Store Connect
    if [[ "$SKIP_UPLOAD" != "true" ]]; then
        log_step "Uploading to App Store Connect"

        log_deploying "TestFlight upload..."
        xcrun altool --upload-app \
            --type appletvos \
            --file "$IPA_FILE" \
            --apiKey "$APP_STORE_CONNECT_API_KEY_ID" \
            --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID" \
            2>&1 | tee "$TVOS_DIR/build/upload.log"

        print_success "Upload complete! Check App Store Connect for processing status."
    else
        log_info "Skipping upload to App Store Connect"
        log_info "App available at: $IPA_FILE"
    fi

    # Calculate elapsed time
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    MINUTES=$((ELAPSED / 60))
    SECONDS=$((ELAPSED % 60))

    # Summary
    log_step "tvOS Deployment Summary"

    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  ${GREEN}tvOS Deployment Complete!${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Build Artifacts:"
    echo "  Archive: $ARCHIVE_PATH"
    echo "  App: $IPA_FILE"
    echo ""
    echo "Deployment Time: ${MINUTES}m ${SECONDS}s"
    echo ""

    if [[ "$SKIP_UPLOAD" != "true" ]]; then
        echo "Next Steps:"
        echo "  1. Check App Store Connect for build processing status"
        echo "  2. Submit for TestFlight review (if required)"
        echo "  3. Enable build for external testing"
        echo ""
    fi

    print_deployment_complete
}

# Run main function
main "$@"
