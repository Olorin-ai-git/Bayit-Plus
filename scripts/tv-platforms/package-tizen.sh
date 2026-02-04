#!/bin/bash
set -e

TIZEN_STUDIO="$HOME/tizen-studio"
TIZEN_CLI="$TIZEN_STUDIO/tools/ide/bin/tizen"
SDB="$TIZEN_STUDIO/tools/sdb"
PROFILE_NAME="BAYITPLUS"

echo "📦 Packaging Bayit+ for Samsung Tizen TV..."

# Verify dist exists
if [ ! -d "dist" ]; then
  echo "❌ Error: dist directory not found"
  echo "Run 'npm run build:tizen' from the web directory first"
  exit 1
fi

# Verify required files
for file in icon.png config.xml; do
  if [ ! -f "$file" ]; then
    echo "❌ Error: Missing required file: $file"
    exit 1
  fi
done

# Copy manifest and icon to dist folder
echo "📋 Preparing package contents..."
cp config.xml dist/
cp icon.png dist/

# Check if tizen CLI is available
if [ -x "$TIZEN_CLI" ]; then
  echo "📦 Creating signed WGT package..."
  "$TIZEN_CLI" package -t wgt -s "$PROFILE_NAME" -- dist

  # Move package to tizen root
  mv dist/*.wgt . 2>/dev/null || true

  PACKAGE_NAME=$(ls -t *.wgt 2>/dev/null | head -1)

  if [ -z "$PACKAGE_NAME" ]; then
    echo "❌ Error: Failed to create WGT package"
    exit 1
  fi

  echo "✅ Package created: ${PACKAGE_NAME}"
  echo ""
  echo "To install on Samsung TV:"
  echo "  $SDB connect <TV_IP>:26101"
  echo "  $TIZEN_CLI install -n $(pwd)/${PACKAGE_NAME} -s <TV_IP>:26101"
  echo "  $TIZEN_CLI run -p AprZAARz4r.BayitPlus -s <TV_IP>:26101"
else
  echo "❌ Error: Tizen Studio not found at $TIZEN_STUDIO"
  echo "Install from: https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html"
  exit 1
fi
