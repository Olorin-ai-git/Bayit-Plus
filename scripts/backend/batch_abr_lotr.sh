#!/usr/bin/env bash
# Batch ABR HLS conversion for LOTR extended editions
# Each movie is processed sequentially with resume support.
# If interrupted, re-run this script to continue from where it left off.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

CONTENT_IDS=(
    "69902464e8abbba4612f499d"  # Fellowship Part 1
    "699034157ef5e108eb4cc2f2"  # Fellowship Part 2
    "698faeecc369b683bfb8df88"  # Two Towers Part 2
    "699041ade73588b9b0c20736"  # Return of the King Part 1
    "69904c80fc1273c3123b21b3"  # Return of the King Part 2
)

TITLES=(
    "Fellowship of the Ring (Ext.) - Part 1"
    "Fellowship of the Ring (Ext.) - Part 2"
    "The Two Towers (Ext.) - Part 2"
    "Return of the King (Ext.) - Part 1"
    "Return of the King (Ext.) - Part 2"
)

cd "$BACKEND_DIR"

for i in "${!CONTENT_IDS[@]}"; do
    cid="${CONTENT_IDS[$i]}"
    title="${TITLES[$i]}"
    echo ""
    echo "============================================================"
    echo "[$((i+1))/${#CONTENT_IDS[@]}] $title"
    echo "Content ID: $cid"
    echo "============================================================"

    poetry run python ../scripts/backend/convert_to_hls_chunked.py "$cid"

    if [ $? -eq 0 ]; then
        echo "[OK] $title complete"
    else
        echo "[FAILED] $title failed - run this script again to resume"
        exit 1
    fi
done

echo ""
echo "============================================================"
echo "ALL 5 LOTR MOVIES CONVERTED TO ABR HLS"
echo "============================================================"
