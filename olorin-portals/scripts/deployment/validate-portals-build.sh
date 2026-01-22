#!/bin/bash
set -e

echo "Validating Olorin Portals build..."

# Navigate to portals directory
cd "$(dirname "$0")/../../olorin-portals"

# Check shared package built correctly
if [ ! -d "packages/shared/dist" ]; then
  echo "ERROR: Shared package not built"
  exit 1
fi

echo "✅ Shared package dist directory exists"

# Check locale assets copied
if [ ! -f "packages/shared/dist/i18n/locales/en.json" ]; then
  echo "ERROR: Locale assets not copied"
  exit 1
fi

echo "✅ Locale assets copied correctly"

if [ ! -f "packages/shared/dist/i18n/locales/he.json" ]; then
  echo "ERROR: Hebrew locale not copied"
  exit 1
fi

echo "✅ Hebrew locale copied correctly"

# Check TypeScript declarations
if [ ! -f "packages/shared/dist/index.d.ts" ]; then
  echo "ERROR: TypeScript declarations not generated"
  exit 1
fi

echo "✅ TypeScript declarations generated"

# Check portal-streaming build
if [ ! -d "packages/portal-streaming/build" ]; then
  echo "ERROR: Portal-streaming not built"
  exit 1
fi

echo "✅ Portal-streaming build directory exists"

# Check portal-streaming has static assets
if [ ! -d "packages/portal-streaming/build/static" ]; then
  echo "ERROR: Portal-streaming static assets missing"
  exit 1
fi

echo "✅ Portal-streaming static assets present"

# Verify peer dependencies aligned
echo "Checking peer dependency versions..."

SHARED_I18NEXT=$(grep -A 1 '"i18next"' packages/shared/package.json | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
PORTAL_I18NEXT=$(grep -A 1 '"i18next"' packages/portal-streaming/package.json | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)

if [ "$SHARED_I18NEXT" != "$PORTAL_I18NEXT" ]; then
  echo "WARNING: i18next version mismatch - Shared: $SHARED_I18NEXT, Portal: $PORTAL_I18NEXT"
else
  echo "✅ i18next versions aligned: $SHARED_I18NEXT"
fi

echo ""
echo "✅ Build validation passed"
echo "All build artifacts are present and valid"
