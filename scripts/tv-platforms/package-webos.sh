#!/bin/bash
set -e

echo "📦 Packaging Bayit+ for webOS..."

# Verify dist exists
if [ ! -d "dist" ]; then
  echo "❌ Error: dist directory not found"
  echo "Run 'npm run build:webos' from the web directory first"
  exit 1
fi

# Verify required files
for file in icon.png largeIcon.png splash.png appinfo.json; do
  if [ ! -f "$file" ]; then
    echo "❌ Error: Missing required file: $file"
    exit 1
  fi
done

# Copy manifest and icons to dist folder (required by ares-package)
echo "📋 Preparing package contents..."
cp appinfo.json dist/
cp icon.png dist/
cp largeIcon.png dist/
cp splash.png dist/

# Package the app (--no-minify because webpack already minified)
echo "📦 Creating IPK package..."
ares-package dist -o . --no-minify

PACKAGE_NAME=$(ls -t *.ipk 2>/dev/null | head -1)

if [ -z "$PACKAGE_NAME" ]; then
  echo "❌ Error: Failed to create IPK package"
  exit 1
fi

echo "✅ Package created: ${PACKAGE_NAME}"
echo ""
echo "Next steps:"
echo "1. Install: ares-install -d lg-tv ${PACKAGE_NAME}"
echo "2. Launch: ares-launch -d lg-tv com.bayitplus.app"
echo "3. Debug: ares-inspect -d lg-tv com.bayitplus.app"
