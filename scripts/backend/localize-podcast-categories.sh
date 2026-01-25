#!/bin/bash
# Migrate podcast categories to support all 10 languages
# This script populates category translations for existing podcasts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../../backend"

echo "🌍 Podcast Category Localization Migration"
echo "=========================================="
echo ""
echo "This script will add translations for podcast categories in all 10 languages:"
echo "  - Hebrew (he) - Default"
echo "  - English (en)"
echo "  - Spanish (es)"
echo "  - French (fr)"
echo "  - Italian (it)"
echo "  - Hindi (hi)"
echo "  - Tamil (ta)"
echo "  - Bengali (bn)"
echo "  - Japanese (ja)"
echo "  - Chinese (zh)"
echo ""
echo "Starting migration..."
echo ""

cd "$BACKEND_DIR"

# Run the migration script
poetry run python scripts/localize_podcast_categories.py

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "  1. Restart the backend server to use updated data"
echo "  2. Test podcast categories in different languages"
echo "  3. Verify category translations in frontend"
echo ""
echo "See backend/scripts/PODCAST_LOCALIZATION_README.md for details"
