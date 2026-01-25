#!/bin/bash

# Compare local vs production screenshots for key pages
cd web/tests/screenshots/comprehensive-parity

echo "=== Screenshot Comparison Results ==="
echo ""

# Key pages to compare
declare -a pages=("login" "register" "profiles" "search" "home" "live" "vod")

for page in "${pages[@]}"; do
    prod_file="production-${page}-en-desktop.png"
    local_file="local-${page}-en-desktop.png"

    if [ -f "$prod_file" ] && [ -f "$local_file" ]; then
        # Calculate pixel difference percentage
        diff=$(magick "$prod_file" "$local_file" -compose difference -composite -colorspace gray -format '%[fx:mean*100]' info:)

        # Determine status based on threshold
        threshold=5.0
        status="✅ PASS"
        if (( $(echo "$diff > $threshold" | bc -l) )); then
            status="⚠️  WARNING"
        fi

        printf "%-15s: %6.2f%% difference - %s\n" "$page" "$diff" "$status"
    else
        echo "$page: Missing screenshot files"
    fi
done

echo ""
echo "=== Key Fixes Verification ==="
echo ""
echo "GlassInput Icon Fix (login, register, profiles):"
echo "  Expected: < 5% difference (down from 34-36%)"
echo ""
echo "Search i18n Fix (search page):"
echo "  Expected: < 5% difference (no untranslated keys)"
echo ""
