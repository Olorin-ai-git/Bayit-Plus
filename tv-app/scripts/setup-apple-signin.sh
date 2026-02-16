#!/bin/bash
set -e

# Apple Sign-In Setup Script for tvOS
# This script configures the Xcode project for Apple Sign-In

PROJECT_DIR="/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/tv-app"
XCODE_PROJECT="$PROJECT_DIR/ios/BayitPlusTV.xcodeproj"
PBXPROJ="$XCODE_PROJECT/project.pbxproj"

echo "🍎 Setting up Apple Sign-In for tvOS..."
echo ""

# Check if files exist
if [ ! -f "$PROJECT_DIR/ios/BayitPlusTV/AppleAuthModule.swift" ]; then
    echo "❌ Error: AppleAuthModule.swift not found"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/ios/BayitPlusTV/AppleAuthModule.m" ]; then
    echo "❌ Error: AppleAuthModule.m not found"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/ios/BayitPlusTV/BayitPlusTV.entitlements" ]; then
    echo "❌ Error: BayitPlusTV.entitlements not found"
    exit 1
fi

echo "✅ All required files exist"
echo ""

# Manual steps required
echo "⚠️  MANUAL STEPS REQUIRED IN XCODE:"
echo ""
echo "1. Open the Xcode project:"
echo "   open '$XCODE_PROJECT'"
echo ""
echo "2. Add Native Module Files:"
echo "   • Right-click on 'BayitPlusTV' folder in Project Navigator"
echo "   • Select 'Add Files to BayitPlusTV...'"
echo "   • Navigate to: ios/BayitPlusTV/"
echo "   • Select both:"
echo "     - AppleAuthModule.swift"
echo "     - AppleAuthModule.m"
echo "   • ✅ Check 'Copy items if needed'"
echo "   • ✅ Ensure 'BayitPlusTV' target is selected"
echo "   • Click 'Add'"
echo ""
echo "3. Configure Bridging Header:"
echo "   • Select 'BayitPlusTV' target"
echo "   • Go to 'Build Settings' tab"
echo "   • Search for 'Objective-C Bridging Header'"
echo "   • Set value to: BayitPlusTV/BayitPlusTV-Bridging-Header.h"
echo ""
echo "4. Add Sign In with Apple Capability:"
echo "   • Select 'BayitPlusTV' target"
echo "   • Go to 'Signing & Capabilities' tab"
echo "   • Click '+ Capability' button"
echo "   • Search for 'Sign In with Apple'"
echo "   • Add it to the project"
echo ""
echo "5. Add Entitlements File:"
echo "   • Still in 'Signing & Capabilities' tab"
echo "   • Under 'Signing', find 'Code Signing Entitlements'"
echo "   • Set value to: BayitPlusTV/BayitPlusTV.entitlements"
echo ""
echo "6. Build and Test:"
echo "   • Clean build folder (Cmd+Shift+K)"
echo "   • Build project (Cmd+B)"
echo "   • Run on simulator or device"
echo ""
echo "📱 After completing these steps, Apple Sign-In will be ready to test!"
echo ""

# Attempt to open Xcode
if command -v open &> /dev/null; then
    read -p "Would you like to open Xcode now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "$XCODE_PROJECT"
    fi
fi
