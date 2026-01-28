#!/bin/bash
# Check for connected Apple TV devices

echo "🔍 Checking for Apple TV devices..."
echo ""

echo "📱 Available Simulators:"
xcrun simctl list devices available | grep "Apple TV" | sed 's/^/  /'
echo ""

echo "🖥️  Physical Devices:"
DEVICES=$(xcrun xctrace list devices 2>&1 | grep -v "Simulator" | grep -i "Apple TV")
if [ -z "$DEVICES" ]; then
    echo "  ⚠️  No physical Apple TV devices connected"
    echo ""
    echo "To connect your Apple TV:"
    echo "  1. Open Xcode → Window → Devices and Simulators (⌘⇧2)"
    echo "  2. On your Apple TV: Settings → Remotes and Devices → Remote App"
    echo "  3. Enable pairing on both devices"
    echo "  4. Make sure both are on the same Wi-Fi network"
else
    echo "$DEVICES" | sed 's/^/  ✅ /'
fi
echo ""

echo "🔐 Code Signing Certificates:"
security find-identity -v -p codesigning | grep -E "Development|Distribution" | sed 's/^/  /'
