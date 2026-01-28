#!/bin/bash

# Screenshot capture helper for tvOS App Store screenshots
# Usage: ./scripts/capture-screenshot.sh [section-name]
#
# Example: ./scripts/capture-screenshot.sh vod
#          ./scripts/capture-screenshot.sh podcasts

SIMULATOR_ID="170AAAC8-D909-493A-B7B2-542250A4F4AC"
SCREENSHOTS_DIR="fastlane/screenshots/en-US"

# Get section name from argument or prompt
if [ -z "$1" ]; then
    echo "📸 Screenshot Capture Helper"
    echo ""
    echo "Suggested sections to capture:"
    echo "  - vod (Movies & Series)"
    echo "  - radio"
    echo "  - podcasts"
    echo "  - search"
    echo "  - player"
    echo ""
    read -p "Enter section name: " SECTION
else
    SECTION="$1"
fi

# Generate filename
TIMESTAMP=$(date +%s)
FILENAME="Apple_TV_4K_04_${SECTION}.png"
FILEPATH="${SCREENSHOTS_DIR}/${FILENAME}"

# Check if simulator is running
if ! xcrun simctl list devices booted | grep -q "Apple TV"; then
    echo "❌ No Apple TV simulator is currently running"
    echo "   Please start the app in simulator first"
    exit 1
fi

echo ""
echo "📱 Ready to capture screenshot for: ${SECTION}"
echo "   1. Navigate to the ${SECTION} screen in the simulator"
echo "   2. Press ENTER when ready..."
read

# Capture screenshot
echo "📸 Capturing screenshot..."
xcrun simctl io "${SIMULATOR_ID}" screenshot "${FILEPATH}"

if [ -f "${FILEPATH}" ]; then
    # Get file size
    SIZE=$(du -h "${FILEPATH}" | cut -f1)

    echo ""
    echo "✅ Screenshot captured successfully!"
    echo "   File: ${FILENAME}"
    echo "   Size: ${SIZE}"
    echo "   Path: ${FILEPATH}"
    echo ""

    # Show total count
    TOTAL=$(ls -1 "${SCREENSHOTS_DIR}"/*.png 2>/dev/null | wc -l | tr -d ' ')
    echo "📊 Total screenshots: ${TOTAL}/10"
    echo ""

    # List all screenshots
    echo "Current screenshots:"
    ls -1 "${SCREENSHOTS_DIR}"/*.png | xargs -n1 basename
else
    echo ""
    echo "❌ Failed to capture screenshot"
    exit 1
fi
