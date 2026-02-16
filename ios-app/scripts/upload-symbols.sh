#!/bin/bash
# Upload dSYMs to Firebase Crashlytics
# Run this after archiving to upload debug symbols for crash reporting

set -e

ARCHIVE_PATH="$1"
GOOGLE_SERVICE_INFO="$2"

if [ -z "$ARCHIVE_PATH" ] || [ -z "$GOOGLE_SERVICE_INFO" ]; then
    echo "Usage: $0 <archive_path> <google_service_info_path>"
    exit 1
fi

# Find the Firebase Crashlytics upload script
UPLOAD_SYMBOLS_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "upload-symbols" 2>/dev/null | head -1)

if [ -z "$UPLOAD_SYMBOLS_PATH" ]; then
    echo "⚠️  Firebase Crashlytics upload-symbols script not found"
    echo "Symbols will need to be uploaded manually from Firebase Console"
    exit 0
fi

echo "📤 Uploading dSYMs to Firebase Crashlytics..."

"$UPLOAD_SYMBOLS_PATH" \
    -gsp "$GOOGLE_SERVICE_INFO" \
    -p ios \
    "$ARCHIVE_PATH/dSYMs"

echo "✅ dSYMs uploaded to Firebase Crashlytics"
