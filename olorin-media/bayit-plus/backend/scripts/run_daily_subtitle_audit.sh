#!/bin/bash
# Daily Subtitle Acquisition Script
# Run this EVERY DAY to download 20 more subtitles

set -e

cd "$(dirname "$0")/.."

echo "╔═══════════════════════════════════════════════╗"
echo "║     Daily Subtitle Acquisition Audit         ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "📅 Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "🎯 Goal: Download 20 subtitles (OpenSubtitles quota)"
echo ""

# Run focused subtitle audit
poetry run python scripts/trigger_audit.py \
    --iterations 100 \
    --budget 5.0

echo ""
echo "✅ Daily subtitle audit complete!"
echo "📊 Check results:"
echo "   poetry run python scripts/view_audit_results.py"
echo ""
echo "🔄 Run this script again tomorrow to download 20 more!"
