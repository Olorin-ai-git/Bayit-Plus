#!/bin/bash
# Open Xcode workspace and show devices window

echo "🚀 Opening Bayit+ tvOS for device testing..."
echo ""

# Open Xcode workspace
open /Users/olorin/Documents/olorin/olorin-media/bayit-plus/tvos-app/tvos/BayitPlusTVOS.xcworkspace

# Wait for Xcode to launch
sleep 3

# Open Devices and Simulators window
osascript -e 'tell application "Xcode" to activate'
osascript -e 'tell application "System Events" to keystroke "2" using {command down, shift down}'

echo "✅ Xcode opened with Devices window"
echo ""
echo "Next steps:"
echo "  1. In Devices window, pair your Apple TV if not already paired"
echo "  2. In Xcode toolbar, select your Apple TV as destination"
echo "  3. Press ⌘R to build and run"
echo ""
echo "💡 First build may take 2-3 minutes"
