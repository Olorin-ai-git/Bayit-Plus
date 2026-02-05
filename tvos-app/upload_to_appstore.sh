#!/bin/bash
#
# Upload Bayit+ tvOS Build to App Store Connect
#
# Usage: ./upload_to_appstore.sh
#

set -e

echo "📦 Uploading Bayit+ tvOS to App Store Connect..."
echo ""

IPA_PATH="Export/BayitPlusTVOS.ipa"

if [ ! -f "$IPA_PATH" ]; then
    echo "❌ Error: IPA file not found at $IPA_PATH"
    exit 1
fi

echo "✅ Found IPA: $IPA_PATH"
echo "📊 Size: $(du -h "$IPA_PATH" | cut -f1)"
echo ""

# Check if logged in to App Store Connect
echo "🔐 Checking Apple ID authentication..."
xcrun altool --list-apps -u "APPLE_ID_HERE" -p "@keychain:APP_SPECIFIC_PASSWORD" 2>&1 | head -5 || true

echo ""
echo "⚠️  INSTRUCTIONS:"
echo ""
echo "To upload, run this command (replace with your Apple ID):"
echo ""
echo "xcrun altool --upload-app --type appletvos --file \"$IPA_PATH\" \\"
echo "  --apiKey YOUR_API_KEY \\"
echo "  --apiIssuer YOUR_API_ISSUER"
echo ""
echo "OR use Transporter app (easier):"
echo "open -a Transporter"
echo ""
