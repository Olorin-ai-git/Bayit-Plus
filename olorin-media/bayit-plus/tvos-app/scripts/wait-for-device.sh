#!/bin/bash
# Wait for Apple TV device to connect

echo "⏳ Waiting for Apple TV device to connect..."
echo "   (Press Ctrl+C to cancel)"
echo ""

count=0
while true; do
    DEVICES=$(xcrun xctrace list devices 2>&1 | grep -v "Simulator" | grep -i "Apple TV")

    if [ ! -z "$DEVICES" ]; then
        echo ""
        echo "✅ Apple TV connected!"
        echo ""
        echo "$DEVICES"
        echo ""
        echo "🎉 Device is ready for testing!"
        echo ""
        echo "Next steps:"
        echo "  1. Run: ./tvos-app/scripts/open-xcode-with-device.sh"
        echo "  2. Or manually: open tvos-app/tvos/BayitPlusTVOS.xcworkspace"
        echo "  3. Select your Apple TV in Xcode toolbar"
        echo "  4. Press ⌘R to build and run"
        exit 0
    fi

    # Progress indicator
    count=$((count + 1))
    printf "\r   Checking... %d seconds elapsed" $count
    sleep 1
done
