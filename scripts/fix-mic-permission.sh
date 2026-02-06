#!/bin/bash
# Fix Microphone Permission for Chrome
# This script helps diagnose and fix microphone permission issues

set -e

echo "🎤 Bayit+ Microphone Permission Fixer"
echo "======================================"
echo ""

# Check if microphone hardware exists
echo "1️⃣  Checking microphone hardware..."
if system_profiler SPAudioDataType | grep -q "Input Source"; then
    MIC_NAME=$(system_profiler SPAudioDataType | grep "Input Source:" | head -1 | awk -F': ' '{print $2}')
    echo "   ✅ Microphone found: $MIC_NAME"
else
    echo "   ❌ No microphone detected"
    exit 1
fi
echo ""

# Check Chrome permission in TCC database
echo "2️⃣  Checking Chrome system permission..."
CHROME_PERMISSION=$(sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
    "SELECT auth_value FROM access WHERE service = 'kTCCServiceMicrophone' AND client = 'com.google.Chrome'" 2>/dev/null || echo "")

if [ "$CHROME_PERMISSION" = "2" ]; then
    echo "   ✅ Chrome has microphone permission (ALLOWED)"
elif [ "$CHROME_PERMISSION" = "0" ]; then
    echo "   ❌ Chrome microphone permission is DENIED"
    echo "   → Need to enable in System Preferences"
elif [ -z "$CHROME_PERMISSION" ]; then
    echo "   ⚠️  Chrome has never requested microphone permission"
    echo "   → Will be prompted on first use"
else
    echo "   ⚠️  Unknown permission state: $CHROME_PERMISSION"
fi
echo ""

# Check if Chrome is running
echo "3️⃣  Checking Chrome status..."
if pgrep -x "Google Chrome" > /dev/null; then
    CHROME_PID=$(pgrep -x "Google Chrome" | head -1)
    echo "   ✅ Chrome is running (PID: $CHROME_PID)"

    # Ask to restart Chrome
    echo ""
    read -p "   Do you want to restart Chrome now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   🔄 Restarting Chrome..."
        pkill -9 "Google Chrome"
        sleep 2
        open -a "Google Chrome" "http://localhost:3000"
        echo "   ✅ Chrome restarted"
    fi
else
    echo "   ℹ️  Chrome is not running"
    echo "   Starting Chrome..."
    open -a "Google Chrome" "http://localhost:3000"
fi
echo ""

# Provide instructions
echo "4️⃣  Next Steps:"
echo ""

if [ "$CHROME_PERMISSION" != "2" ]; then
    echo "   📋 Manual steps required:"
    echo "   1. Open System Preferences:"
    echo "      → Security & Privacy → Privacy → Microphone"
    echo ""
    echo "   2. Check the box next to 'Google Chrome'"
    echo ""
    echo "   3. Restart Chrome (if not already done)"
    echo ""
    echo "   Opening System Preferences now..."
    open "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
    echo ""
    echo "   After enabling Chrome, run this script again to verify."
else
    echo "   ✅ System permission is granted!"
    echo ""
    echo "   📋 Test the microphone:"
    echo "   1. Go to http://localhost:3000"
    echo "   2. Click the wizard hat (🧙) button"
    echo "   3. Allow microphone when prompted"
    echo ""
    echo "   If still not working, check browser console for errors."
fi

echo ""
echo "======================================"
echo "Done! 🎉"
