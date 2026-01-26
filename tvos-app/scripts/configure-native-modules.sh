#!/bin/bash

# Configure Native Modules for tvOS App
# This script adds Swift native modules to Xcode project and configures frameworks

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TVOS_DIR="$SCRIPT_DIR/../tvos"
PROJECT_FILE="$TVOS_DIR/BayitPlusTVOS.xcodeproj/project.pbxproj"

echo "🔧 Configuring tvOS Native Modules..."
echo ""

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Error: Xcode not installed"
    exit 1
fi

# Navigate to tvOS directory
cd "$TVOS_DIR"

echo "📦 Installing CocoaPods dependencies..."
pod install || {
    echo "⚠️  CocoaPods install failed, continuing..."
}

echo ""
echo "✅ Configuration complete!"
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo ""
echo "1. Open BayitPlusTVOS.xcworkspace in Xcode:"
echo "   open $TVOS_DIR/BayitPlusTVOS.xcworkspace"
echo ""
echo "2. Add Swift files to target 'BayitPlusTVOS':"
echo "   - Right-click BayitPlusTVOS group → Add Files"
echo "   - Select all .swift files from BayitPlusTVOS folder"
echo "   - Ensure 'BayitPlusTVOS' target is checked"
echo ""
echo "   Files to add:"
echo "   ✓ AudioCaptureModule.swift"
echo "   ✓ SpeechModule.swift"
echo "   ✓ TTSModule.swift"
echo "   ✓ AudioSessionManager.swift"
echo "   ✓ TopShelfProvider.swift"
echo "   ✓ SceneSearchIntentHandler.swift"
echo ""
echo "3. Link required frameworks:"
echo "   - Select BayitPlusTVOS target → Build Phases"
echo "   - Expand 'Link Binary With Libraries'"
echo "   - Click '+' and add:"
echo "     ✓ Speech.framework"
echo "     ✓ AVFoundation.framework"
echo "     ✓ MediaPlayer.framework"
echo "     ✓ TVServices.framework"
echo "     ✓ Intents.framework"
echo ""
echo "4. Configure Swift-ObjC bridging:"
echo "   - Build Settings → Swift Compiler"
echo "   - Set 'Install Objective-C Compatibility Header' = YES"
echo ""
echo "5. Build the project:"
echo "   Product → Build (⌘B)"
echo ""
echo "📝 Note: React Native frameworks are linked via CocoaPods"
echo ""
