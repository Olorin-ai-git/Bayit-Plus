#!/bin/bash
# Sync i18n locale files from olorin-core to Android assets

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_ASSETS="$SCRIPT_DIR/../app/src/main/assets/locales"
I18N_SOURCE="/Users/olorin/Documents/Projects/olorin/olorin-core/packages/shared-i18n/locales"

echo "🌐 Syncing i18n locale files..."
echo "   Source: $I18N_SOURCE"
echo "   Target: $ANDROID_ASSETS"

# Create assets directory if it doesn't exist
mkdir -p "$ANDROID_ASSETS"

# Copy all JSON locale files
for lang in en he es zh fr it hi ta bn ja; do
  if [ -f "$I18N_SOURCE/${lang}.json" ]; then
    cp "$I18N_SOURCE/${lang}.json" "$ANDROID_ASSETS/"
    echo "   ✓ ${lang}.json"
  else
    echo "   ✗ ${lang}.json - NOT FOUND"
    exit 1
  fi
done

echo ""
echo "✅ Successfully synced 10 locale files to Android assets"
