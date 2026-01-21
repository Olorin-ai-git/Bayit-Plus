#!/bin/bash

#
# iOS Build Verification Script
#
# Automated verification of BayitPlus iOS build on physical device
# Runs comprehensive checks and generates detailed report
#
# Usage: ./scripts/verify-ios-build.sh [device-name]
# Example: ./scripts/verify-ios-build.sh "iPhone 14"
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_APP_DIR="$PROJECT_ROOT/mobile-app"
BUILD_DIR="$MOBILE_APP_DIR/build"
REPORT_FILE="$PROJECT_ROOT/iOS_BUILD_VERIFICATION_REPORT.md"
DEVICE_NAME="${1:-iPhone}"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
# iOS Build Verification Report

**Generated**: $TIMESTAMP
**Target Device**: $DEVICE_NAME
**Project Root**: $PROJECT_ROOT

---

## Verification Results

EOF
}

# Add section to report
add_report_section() {
    local section_title="$1"
    echo "" >> "$REPORT_FILE"
    echo "### $section_title" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

# Add check result to report
add_check_result() {
    local check_name="$1"
    local status="$2"
    local details="${3:-}"

    local icon=""
    if [ "$status" = "PASS" ]; then
        icon="✓"
        echo -e "${GREEN}✓${NC} $check_name"
    elif [ "$status" = "WARN" ]; then
        icon="⚠"
        echo -e "${YELLOW}⚠${NC} $check_name"
    else
        icon="✗"
        echo -e "${RED}✗${NC} $check_name"
    fi

    echo "- [$icon] **$check_name**: $status" >> "$REPORT_FILE"
    if [ -n "$details" ]; then
        echo "  - $details" >> "$REPORT_FILE"
    fi
}

# Print header
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}iOS Build Verification Suite${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}1. Checking Prerequisites...${NC}"
    add_report_section "Prerequisites"

    local passed=0
    local total=0

    # Check Xcode
    total=$((total + 1))
    if xcode-select --print-path > /dev/null 2>&1; then
        xcode_path=$(xcode-select --print-path)
        add_check_result "Xcode Installation" "PASS" "Path: $xcode_path"
        passed=$((passed + 1))
    else
        add_check_result "Xcode Installation" "FAIL" "Xcode not found"
    fi

    # Check CocoaPods
    total=$((total + 1))
    if command -v pod &> /dev/null; then
        pod_version=$(pod --version)
        add_check_result "CocoaPods Installation" "PASS" "Version: $pod_version"
        passed=$((passed + 1))
    else
        add_check_result "CocoaPods Installation" "FAIL" "CocoaPods not installed"
    fi

    # Check Node.js
    total=$((total + 1))
    if command -v node &> /dev/null; then
        node_version=$(node --version)
        add_check_result "Node.js Installation" "PASS" "Version: $node_version"
        passed=$((passed + 1))
    else
        add_check_result "Node.js Installation" "FAIL" "Node.js not installed"
    fi

    # Check npm
    total=$((total + 1))
    if command -v npm &> /dev/null; then
        npm_version=$(npm --version)
        add_check_result "npm Installation" "PASS" "Version: $npm_version"
        passed=$((passed + 1))
    else
        add_check_result "npm Installation" "FAIL" "npm not installed"
    fi

    echo -e "Result: ${GREEN}$passed/$total${NC} checks passed\n"
}

# Check project structure
check_project_structure() {
    echo -e "${BLUE}2. Checking Project Structure...${NC}"
    add_report_section "Project Structure"

    local passed=0
    local total=0

    # Check mobile-app exists
    total=$((total + 1))
    if [ -d "$MOBILE_APP_DIR" ]; then
        add_check_result "Mobile App Directory" "PASS" "$MOBILE_APP_DIR"
        passed=$((passed + 1))
    else
        add_check_result "Mobile App Directory" "FAIL" "Not found"
    fi

    # Check package.json
    total=$((total + 1))
    if [ -f "$MOBILE_APP_DIR/package.json" ]; then
        add_check_result "package.json" "PASS" "Found"
        passed=$((passed + 1))
    else
        add_check_result "package.json" "FAIL" "Not found"
    fi

    # Check iOS project
    total=$((total + 1))
    if [ -f "$MOBILE_APP_DIR/ios/BayitPlus.xcodeproj/project.pbxproj" ]; then
        add_check_result "Xcode Project" "PASS" "BayitPlus.xcodeproj"
        passed=$((passed + 1))
    else
        add_check_result "Xcode Project" "FAIL" "Not found"
    fi

    # Check Podfile
    total=$((total + 1))
    if [ -f "$MOBILE_APP_DIR/ios/Podfile" ]; then
        add_check_result "Podfile" "PASS" "Found"
        passed=$((passed + 1))
    else
        add_check_result "Podfile" "FAIL" "Not found"
    fi

    echo -e "Result: ${GREEN}$passed/$total${NC} checks passed\n"
}

# Check dependencies
check_dependencies() {
    echo -e "${BLUE}3. Checking Dependencies...${NC}"
    add_report_section "Dependencies"

    cd "$MOBILE_APP_DIR"

    local passed=0
    local total=0

    # Check node_modules
    total=$((total + 1))
    if [ -d "node_modules" ] && [ -f "node_modules/react/package.json" ]; then
        add_check_result "npm Dependencies" "PASS" "node_modules installed"
        passed=$((passed + 1))
    else
        add_check_result "npm Dependencies" "WARN" "node_modules not found or incomplete. Run: npm install"
    fi

    # Check React Native
    total=$((total + 1))
    if [ -f "node_modules/react-native/package.json" ]; then
        rn_version=$(grep '"version"' node_modules/react-native/package.json | head -1 | cut -d'"' -f4)
        add_check_result "React Native" "PASS" "Version: $rn_version"
        passed=$((passed + 1))
    else
        add_check_result "React Native" "FAIL" "Not found in node_modules"
    fi

    # Check Pods
    total=$((total + 1))
    if [ -f "ios/Pods/Podfile.lock" ]; then
        add_check_result "CocoaPods Dependencies" "PASS" "Pods installed"
        passed=$((passed + 1))
    else
        add_check_result "CocoaPods Dependencies" "WARN" "Pods not installed. Run: cd ios && pod install"
    fi

    echo -e "Result: ${GREEN}$passed/$total${NC} checks passed\n"
}

# Check configuration
check_configuration() {
    echo -e "${BLUE}4. Checking Configuration...${NC}"
    add_report_section "Configuration"

    local passed=0
    local total=0

    # Check Sentry DSN
    total=$((total + 1))
    if grep -r "SENTRY_DSN" "$MOBILE_APP_DIR/src" > /dev/null 2>&1; then
        add_check_result "Sentry Configuration" "PASS" "DSN configured"
        passed=$((passed + 1))
    else
        add_check_result "Sentry Configuration" "WARN" "Sentry DSN not found"
    fi

    # Check API Configuration
    total=$((total + 1))
    if grep -r "API_BASE_URL" "$MOBILE_APP_DIR/src/config" > /dev/null 2>&1; then
        add_check_result "API Configuration" "PASS" "Base URL configured"
        passed=$((passed + 1))
    else
        add_check_result "API Configuration" "FAIL" "API_BASE_URL not found"
    fi

    # Check Environment Variables
    total=$((total + 1))
    if [ -f "$MOBILE_APP_DIR/.env" ] || [ -f "$MOBILE_APP_DIR/.env.example" ]; then
        add_check_result "Environment Variables" "PASS" "Configuration file exists"
        passed=$((passed + 1))
    else
        add_check_result "Environment Variables" "WARN" ".env file not found"
    fi

    echo -e "Result: ${GREEN}$passed/$total${NC} checks passed\n"
}

# Check build capability
check_build_capability() {
    echo -e "${BLUE}5. Checking Build Capability...${NC}"
    add_report_section "Build Capability"

    cd "$MOBILE_APP_DIR"

    # Dry run - check if build would succeed
    echo -e "${YELLOW}Running build dry-run (this may take 2-3 minutes)...${NC}"

    if xcodebuild -workspace ios/BayitPlus.xcworkspace \
        -scheme BayitPlus \
        -configuration Debug \
        -destination generic/platform=iOS \
        -dry-run 2>&1 | grep -q "Could not build Objective-C module"; then
        add_check_result "Build Dry-Run" "FAIL" "Build configuration issues found"
    else
        add_check_result "Build Dry-Run" "PASS" "Build configuration valid"
    fi
}

# List available devices
list_devices() {
    echo -e "${BLUE}6. Available Devices...${NC}"
    add_report_section "Available Devices"

    echo "Checking for connected devices..."

    # List real devices
    xcrun xctrace list devices 2>/dev/null | grep -E "iPhone|iPad" | while read -r device; do
        echo "- $device" >> "$REPORT_FILE"
    done

    # If no devices listed, check with different method
    if ! grep -q "iPhone\|iPad" "$REPORT_FILE"; then
        echo "No connected devices found via xcrun xctrace." >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "To check manually:" >> "$REPORT_FILE"
        echo "1. Connect iPhone to Mac via USB" >> "$REPORT_FILE"
        echo "2. Unlock iPhone" >> "$REPORT_FILE"
        echo "3. Tap 'Trust' on iPhone when prompted" >> "$REPORT_FILE"
        echo "4. Run: xcrun xctrace list devices" >> "$REPORT_FILE"
    fi
}

# Final summary
generate_summary() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Verification Complete${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "Report saved to: ${GREEN}$REPORT_FILE${NC}"
    echo ""

    # Add summary section
    echo "" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "## Next Steps" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "### If All Checks Passed:" >> "$REPORT_FILE"
    echo "1. Connect iPhone to Mac via USB cable" >> "$REPORT_FILE"
    echo "2. Unlock iPhone and trust the Mac" >> "$REPORT_FILE"
    echo "3. Build and run on device:" >> "$REPORT_FILE"
    echo "   \`\`\`bash" >> "$REPORT_FILE"
    echo "   cd mobile-app" >> "$REPORT_FILE"
    echo "   npx react-native run-ios --device" >> "$REPORT_FILE"
    echo "   \`\`\`" >> "$REPORT_FILE"
    echo "4. Complete device testing using iOS_DEVICE_BUILD_GUIDE.md" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "### If Checks Failed:" >> "$REPORT_FILE"
    echo "1. Review failed check details above" >> "$REPORT_FILE"
    echo "2. Install missing dependencies: \`npm install && pod install\`" >> "$REPORT_FILE"
    echo "3. Reset build cache: \`npm run clean:all\`" >> "$REPORT_FILE"
    echo "4. Re-run this verification script" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    echo "**Report Generated**: $TIMESTAMP" >> "$REPORT_FILE"
}

# Main execution
main() {
    print_header

    init_report
    check_prerequisites
    check_project_structure
    check_dependencies
    check_configuration
    check_build_capability
    list_devices
    generate_summary

    echo -e "${GREEN}✓ Verification script complete!${NC}"
    echo ""
}

# Run main
main "$@"
