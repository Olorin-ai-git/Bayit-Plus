#!/bin/bash
# Sync @olorin/shared-i18n from olorin-core to bayit-plus
#
# This script ensures that the local mirror of @olorin/shared-i18n
# stays in sync with the primary source in olorin-core.
#
# Usage: ./scripts/sync-i18n-from-olorin-core.sh

set -e

OLORIN_CORE="../../olorin-core/packages/shared-i18n"
BAYIT_OLORIN="packages/ui/shared-i18n"

echo "=== Syncing @olorin/shared-i18n from olorin-core ==="
echo ""

# Check if olorin-core exists
if [ ! -d "$OLORIN_CORE" ]; then
  echo "❌ Error: olorin-core not found at: $OLORIN_CORE"
  echo ""
  echo "Expected structure:"
  echo "  olorin/"
  echo "  ├── olorin-core/packages/shared-i18n/  (PRIMARY SOURCE)"
  echo "  └── olorin-media/bayit-plus/packages/ui/shared-i18n/  (LOCAL MIRROR)"
  echo ""
  exit 1
fi

echo "Source: $OLORIN_CORE"
echo "Target: $BAYIT_OLORIN"
echo ""

# Sync locales (delete removed files)
echo "Syncing locales..."
rsync -av --delete "$OLORIN_CORE/locales/" "$BAYIT_OLORIN/locales/"

# Sync TypeScript source files
echo "Syncing TypeScript sources..."
rsync -av \
  "$OLORIN_CORE/index.ts" \
  "$OLORIN_CORE/web.ts" \
  "$OLORIN_CORE/native.ts" \
  "$OLORIN_CORE/types.ts" \
  "$OLORIN_CORE/protocols.ts" \
  "$BAYIT_OLORIN/"

# Sync build configuration
echo "Syncing build config..."
rsync -av \
  "$OLORIN_CORE/tsconfig.json" \
  "$OLORIN_CORE/tsup.config.ts" \
  "$BAYIT_OLORIN/"

# Update package.json version if needed
echo "Checking version..."
OLORIN_VERSION=$(jq -r '.version' "$OLORIN_CORE/package.json")
BAYIT_VERSION=$(jq -r '.version' "$BAYIT_OLORIN/package.json")

if [ "$OLORIN_VERSION" != "$BAYIT_VERSION" ]; then
  echo "Updating version: $BAYIT_VERSION → $OLORIN_VERSION"
  jq ".version = \"$OLORIN_VERSION\"" "$BAYIT_OLORIN/package.json" > "$BAYIT_OLORIN/package.json.tmp"
  mv "$BAYIT_OLORIN/package.json.tmp" "$BAYIT_OLORIN/package.json"
else
  echo "Version already synchronized: $OLORIN_VERSION"
fi

echo ""
echo "Rebuilding @olorin/shared-i18n..."
cd "$BAYIT_OLORIN"
npm run build

echo ""
echo "✅ Sync complete!"
echo ""
echo "Summary:"
echo "  Version: $OLORIN_VERSION"
echo "  Locales: $(ls locales/*.json | wc -l) languages"
echo "  Keys: $(jq 'keys | length' locales/en.json) namespaces"
echo ""
echo "Next steps:"
echo "  1. Test web app: cd web && npm start"
echo "  2. Test mobile app: cd mobile-app && npm run ios"
echo "  3. Test tvOS app: cd tvos-app && npm run ios"
