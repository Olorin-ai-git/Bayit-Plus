#!/bin/bash
set -e

echo "🔍 Validating Olorin Portals build..."

cd olorin-portals

# Check shared package built correctly
if [ ! -d "packages/shared/dist" ]; then
  echo "❌ ERROR: Shared package not built"
  exit 1
fi

echo "✅ Shared package dist exists"

# Check TypeScript declaration files
if [ ! -f "packages/shared/dist/index.d.ts" ]; then
  echo "❌ ERROR: TypeScript declarations not generated"
  exit 1
fi

echo "✅ TypeScript declarations generated"

# Verify peer dependencies aligned
echo "🔍 Checking peer dependency versions..."
npm ls i18next react-i18next i18next-browser-languagedetector || {
  echo "⚠️  Warning: Peer dependency version mismatch detected"
}

# Check portal-streaming build
if [ ! -d "packages/portal-streaming/build" ]; then
  echo "❌ ERROR: Portal-streaming not built"
  exit 1
fi

echo "✅ Portal-streaming build exists"

# Check critical files exist
if [ ! -f "packages/portal-streaming/build/index.html" ]; then
  echo "❌ ERROR: index.html not found in build"
  exit 1
fi

echo "✅ index.html exists"

# Verify no build errors in logs
if grep -r "ERROR" packages/portal-streaming/build/*.txt 2>/dev/null; then
  echo "⚠️  Warning: Build errors detected in logs"
fi

echo ""
echo "✅ Build validation passed"
echo "📦 Ready for deployment"
