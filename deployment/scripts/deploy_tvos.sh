#!/bin/bash
set -e

# Bayit+ tvOS App Deployment Script
# Builds and uploads tvOS app to App Store Connect (TestFlight)
# Usage: ./deploy_tvos.sh [--skip-build] [--skip-upload]

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

# Get script directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TVOS_APP_DIR="$REPO_ROOT/tvos-app"
TVOS_DIR="$TVOS_APP_DIR/tvos"

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
    print_header "Checking Prerequisites"

    if [[ "$(uname)" != "Darwin" ]]; then
        print_error "This script must be run on macOS"
        exit 1
    fi
    print_success "Running on macOS"

    if ! command_exists xcodebuild; then
        print_error "Xcode command line tools not found. Please install Xcode."
        exit 1
    fi
    print_success "Xcode command line tools found"

    if ! command_exists npm; then
        print_error "npm not found. Please install Node.js"
        exit 1
    fi
    print_success "npm found"

    # Check for App Store Connect credentials (only if uploading)
    if [[ "$SKIP_UPLOAD" != "true" ]]; then
        if [[ -z "$APP_STORE_CONNECT_API_KEY_ID" ]] || [[ -z "$APP_STORE_CONNECT_ISSUER_ID" ]] || [[ -z "$APP_STORE_CONNECT_API_KEY_PATH" ]]; then
            print_warning "App Store Connect API credentials not set. Upload will be skipped."
            print_info "Set APP_STORE_CONNECT_API_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, and APP_STORE_CONNECT_API_KEY_PATH"
            SKIP_UPLOAD=true
        else
            if [[ ! -f "$APP_STORE_CONNECT_API_KEY_PATH" ]]; then
                print_error "API key file not found: $APP_STORE_CONNECT_API_KEY_PATH"
                exit 1
            fi
            print_success "App Store Connect credentials configured"
        fi
    fi

    # Display configuration
    echo ""
    print_info "Configuration:"
    echo "  Scheme: $TVOS_SCHEME"
    echo "  Bundle ID: $TVOS_BUNDLE_ID"
    echo "  Configuration: $BUILD_CONFIGURATION"
    echo "  Workspace: $TVOS_WORKSPACE"
    echo "  Skip Build: $SKIP_BUILD"
    echo "  Skip Upload: $SKIP_UPLOAD"
    echo ""

    # Step 1: Install dependencies
    if [[ "$SKIP_BUILD" != "true" ]]; then
        print_header "Step 1: Installing Dependencies"

        cd "$TVOS_APP_DIR"

        print_info "Installing npm dependencies..."
        npm install
        print_success "npm dependencies installed"

        print_info "Installing CocoaPods dependencies..."
        cd "$TVOS_DIR"
        pod install
        print_success "CocoaPods dependencies installed"
    fi

    # Step 2: Build archive
    if [[ "$SKIP_BUILD" != "true" ]]; then
        print_header "Step 2: Building tvOS Archive"

        cd "$TVOS_DIR"

        # Clean build directory
        rm -rf build
        mkdir -p build

        print_info "Building archive..."
        xcodebuild archive \
            -workspace "$TVOS_WORKSPACE" \
            -scheme "$TVOS_SCHEME" \
            -configuration "$BUILD_CONFIGURATION" \
            -archivePath "$ARCHIVE_PATH" \
            -destination "generic/platform=tvOS" \
            -allowProvisioningUpdates \
            CODE_SIGN_STYLE=Automatic \
            | tee build/archive.log

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
        print_info "Using existing archive: $ARCHIVE_PATH"
    fi

    # Step 3: Create ExportOptions.plist if not exists
    print_header "Step 3: Preparing Export Options"

    if [[ ! -f "$EXPORT_OPTIONS_PLIST" ]]; then
        print_info "Creating ExportOptions-tvOS.plist..."
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
    print_header "Step 4: Exporting tvOS App"

    rm -rf "$EXPORT_PATH"
    mkdir -p "$EXPORT_PATH"

    print_info "Exporting app..."
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
        print_header "Step 5: Uploading to App Store Connect"

        print_info "Uploading to TestFlight..."
        xcrun altool --upload-app \
            --type appletvos \
            --file "$IPA_FILE" \
            --apiKey "$APP_STORE_CONNECT_API_KEY_ID" \
            --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID" \
            2>&1 | tee "$TVOS_DIR/build/upload.log"

        print_success "Upload complete! Check App Store Connect for processing status."
    else
        print_info "Skipping upload to App Store Connect"
        print_info "App available at: $IPA_FILE"
    fi

    # Calculate elapsed time
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    MINUTES=$((ELAPSED / 60))
    SECONDS=$((ELAPSED % 60))

    # Summary
    print_header "tvOS Deployment Summary"

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

    print_success "tvOS deployment complete!"
}

# Run main function
main "$@"
