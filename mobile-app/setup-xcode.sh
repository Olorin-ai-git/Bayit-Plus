#!/bin/bash

# Bayit+ iOS Xcode Project Setup Script
# This script initializes the Xcode project structure

set -e  # Exit on error

echo "🚀 Setting up Bayit+ iOS Xcode Project..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from /mobile-app/ directory"
    exit 1
fi

# Step 1: Install npm dependencies
echo "📦 Step 1: Installing npm dependencies..."
npm install

# Step 2: Check if React Native CLI is available
echo "🔧 Step 2: Checking React Native CLI..."
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js"
    exit 1
fi

# Step 3: Create temporary RN project to get iOS structure
echo "📱 Step 3: Creating iOS project structure..."
if [ ! -d "ios/BayitPlus.xcodeproj" ]; then
    # Create temp project
    echo "   Creating temporary React Native project..."
    npx @react-native-community/cli@latest init BayitPlusTemp --skip-install --version 0.83.1

    # Backup our custom files
    echo "   Backing up custom files..."
    mkdir -p .ios-backup
    cp -r ios/BayitPlus .ios-backup/ 2>/dev/null || true
    cp -r ios/BayitPlusWidgets .ios-backup/ 2>/dev/null || true
    cp -r ios/SiriIntents .ios-backup/ 2>/dev/null || true

    # Copy iOS structure from temp
    echo "   Copying iOS project structure..."
    rm -rf ios
    cp -r BayitPlusTemp/ios ios/

    # Restore our custom files
    echo "   Restoring custom files..."
    cp -r .ios-backup/* ios/ 2>/dev/null || true
    rm -rf .ios-backup

    # Cleanup
    echo "   Cleaning up..."
    rm -rf BayitPlusTemp

    echo "   ✅ iOS project structure created"
else
    echo "   ⏭️  Xcode project already exists, skipping..."
fi

# Step 4: Install CocoaPods
echo "☕ Step 4: Installing CocoaPods dependencies..."
cd ios

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo "   📥 Installing CocoaPods..."
    sudo gem install cocoapods
fi

# Install pods
echo "   Installing pods..."
pod install

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📂 Xcode project location:"
echo "   /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/mobile-app/ios/BayitPlus.xcworkspace"
echo ""
echo "🔓 Next steps:"
echo "   1. Open the workspace in Xcode:"
echo "      open ios/BayitPlus.xcworkspace"
echo ""
echo "   2. Configure signing:"
echo "      - Select BayitPlus target"
echo "      - Go to Signing & Capabilities"
echo "      - Select your Team"
echo ""
echo "   3. Add custom Swift files to Xcode project:"
echo "      - Drag Swift files from Finder into Xcode"
echo "      - Make sure 'Copy items if needed' is checked"
echo "      - Verify BayitPlus target is selected"
echo ""
echo "   4. Build the project:"
echo "      - Press Cmd+B"
echo ""
echo "Happy coding! 🎉"
