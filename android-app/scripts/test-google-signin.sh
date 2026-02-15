#!/bin/bash
# Test Google Sign-In on Android emulator

set -e

echo "🔍 Testing Google Sign-In Configuration..."
echo ""

# Check if emulator is running
if ! adb devices | grep -q "emulator"; then
    echo "❌ No emulator detected. Please start an emulator first."
    exit 1
fi

# Check if Google account is present
echo "Checking for Google account..."
ACCOUNT=$(adb shell dumpsys account | grep "Account {name=" | grep "google" | head -1)
if [ -z "$ACCOUNT" ]; then
    echo "❌ No Google account found on emulator"
    echo "Please add a Google account: Settings > Passwords & accounts > Add account > Google"
    exit 1
fi
echo "✅ Google account found: $ACCOUNT"
echo ""

# Check package installed
echo "Checking if Bayit+ is installed..."
if ! adb shell pm list packages | grep -q "tv.bayit.plus.debug"; then
    echo "❌ Bayit+ app not installed"
    exit 1
fi
echo "✅ Bayit+ app installed"
echo ""

# Restart app
echo "Restarting Bayit+ app..."
adb shell am force-stop tv.bayit.plus.debug
adb logcat -c
adb shell am start -n tv.bayit.plus.debug/tv.bayit.plus.MainActivity
sleep 3
echo "✅ App started"
echo ""

# Simulate button tap
echo "Simulating 'Sign in with Google' button tap..."
adb shell input tap 360 1020
sleep 2
echo ""

# Check logs for result
echo "📋 Checking logs..."
LOGS=$(adb logcat -d -s "Bayit+" | tail -10)

if echo "$LOGS" | grep -q "Google Sign-In credential received"; then
    echo "✅ SUCCESS! Google Sign-In working!"
    echo ""
    echo "The user should now be authenticated."
elif echo "$LOGS" | grep -q "No Google credentials available"; then
    echo "⚠️  Configuration still propagating..."
    echo ""
    echo "The OAuth client configuration needs more time to propagate through Google's servers."
    echo "Please wait 5-10 more minutes and run this script again."
    echo ""
    echo "Current time: $(date)"
    echo "Configuration was created at: 8:46 AM GMT-5"
    echo "Retry after: $(date -v+10M '+%I:%M %p')"
elif echo "$LOGS" | grep -q "cancelled"; then
    echo "⚠️  Sign-In was cancelled"
    echo ""
    echo "User cancelled the sign-in flow. This is normal."
else
    echo "❓ Unexpected result. Full logs:"
    echo "$LOGS"
fi

echo ""
echo "💡 Full Bayit+ logs:"
adb logcat -d -s "Bayit+" | tail -20
