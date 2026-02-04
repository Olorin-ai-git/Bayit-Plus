#!/bin/bash
# Extract 8 Bayit+-specific keys from @olorin/shared-i18n to @bayit/i18n

set -e

SOURCE="packages/ui/shared-i18n/locales"
DEST="packages/ui/bayit-i18n/locales"

# 8 Bayit+-specific keys
KEYS='["auth", "channelChat", "email", "greeting", "location", "payment", "portal", "uploads"]'

echo "Extracting Bayit+-specific keys..."

for locale in en he es zh fr it hi ta bn ja; do
  echo "Processing ${locale}.json..."

  # Extract to new @bayit/i18n package
  jq --argjson keys "$KEYS" 'with_entries(select(.key as $k | $keys | index($k)))' \
    "$SOURCE/${locale}.json" > "$DEST/${locale}.json"

  echo "  ✓ Extracted $(jq 'keys | length' "$DEST/${locale}.json") keys to @bayit/i18n"

  # Remove from @olorin/shared-i18n (keep backup)
  cp "$SOURCE/${locale}.json" "$SOURCE/${locale}.backup.json"
  jq --argjson keys "$KEYS" 'with_entries(select(.key as $k | $keys | index($k) | not))' \
    "$SOURCE/${locale}.json" > "$SOURCE/${locale}.tmp.json"
  mv "$SOURCE/${locale}.tmp.json" "$SOURCE/${locale}.json"

  echo "  ✓ Removed from @olorin/shared-i18n ($(jq 'keys | length' "$SOURCE/${locale}.json") keys remaining)"
done

echo ""
echo "✅ Key extraction complete!"
echo ""
echo "Summary:"
echo "  @bayit/i18n: 8 keys × 10 languages = 80 entries"
echo "  @olorin/shared-i18n: 74 keys × 10 languages = 740 entries"
echo ""
echo "Backups saved to: $SOURCE/*.backup.json"
