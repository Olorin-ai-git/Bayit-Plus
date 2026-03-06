#!/bin/bash
#
# Batch HLS 720p Encoding
# Encodes all remaining movies to 720p CRF 23 stereo HLS
#
# Usage:
#   ./batch_encode_720p.sh              # Run from where we left off
#   ./batch_encode_720p.sh --status     # Show progress
#   ./batch_encode_720p.sh --skip ID    # Skip a specific content ID
#   ./batch_encode_720p.sh --retry ID   # Retry a failed content ID

set -uo pipefail
# Note: NOT using set -e — we handle errors explicitly so the batch continues

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Use Poetry's Python for pymongo access
POETRY_PYTHON="$(cd "$BACKEND_DIR" && poetry env info -e 2>/dev/null)"
BATCH_STATE_DIR="$SCRIPT_DIR/.batch_encode_state"
BATCH_LOG="$BATCH_STATE_DIR/batch.log"
DONE_FILE="$BATCH_STATE_DIR/done.txt"
FAILED_FILE="$BATCH_STATE_DIR/failed.txt"
SKIPPED_FILE="$BATCH_STATE_DIR/skipped.txt"

# Movies already encoded at 720p stereo (skip these)
ALREADY_DONE=(
    "6990a63350ef49850241311d"  # Karate Kid
    "698ff4b53fb07d3546f6fa4d"  # BTTF 1
    "699000a4bc7563d643295005"  # BTTF 2
    "699018e2a7757156ed19d492"  # BTTF 3
    "69902464e8abbba4612f499d"  # LOTR Fellowship P1
    "699034157ef5e108eb4cc2f2"  # LOTR Fellowship P2
    "698faeecc369b683bfb8df88"  # LOTR Two Towers P2
    "699041ade73588b9b0c20736"  # LOTR Return King P1
    "69904c80fc1273c3123b21b3"  # LOTR Return King P2
)

init_state() {
    mkdir -p "$BATCH_STATE_DIR"
    touch "$DONE_FILE" "$FAILED_FILE" "$SKIPPED_FILE" "$BATCH_LOG"
    # Add pre-done IDs to done list if not already there
    for id in "${ALREADY_DONE[@]}"; do
        if ! grep -q "^$id$" "$DONE_FILE" 2>/dev/null; then
            echo "$id" >> "$DONE_FILE"
        fi
    done
}

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" | tee -a "$BATCH_LOG"
}

get_all_movie_ids() {
    cd "$BACKEND_DIR" && set -a && source .env 2>/dev/null && set +a
    "$POETRY_PYTHON" -c "
from pymongo import MongoClient
import os
uri = os.environ.get('MONGODB_URI', '')
client = MongoClient(uri)
db = client['bayit_plus']
movies = list(db.content.find(
    {'content_type': 'movie', 'stream_url': {'\$exists': True, '\$ne': None, '\$ne': ''}},
    {'_id': 1}
).sort('title', 1))
for m in movies:
    print(str(m['_id']))
"
}

get_movie_title() {
    local content_id="$1"
    local title
    cd "$BACKEND_DIR" && set -a && source .env 2>/dev/null && set +a
    title=$("$POETRY_PYTHON" -c "
from pymongo import MongoClient
from bson import ObjectId
import os
uri = os.environ.get('MONGODB_URI', '')
client = MongoClient(uri)
db = client['bayit_plus']
m = db.content.find_one({'_id': ObjectId('$content_id')}, {'title': 1})
print(m['title'] if m else 'Unknown')
" 2>/dev/null) || title="Unknown"
    echo "$title"
}

show_status() {
    init_state
    local total
    total=$(get_all_movie_ids | wc -l | tr -d ' ')
    local done
    done=$(sort -u "$DONE_FILE" | wc -l | tr -d ' ')
    local failed
    failed=$(sort -u "$FAILED_FILE" | wc -l | tr -d ' ')
    local skipped
    skipped=$(sort -u "$SKIPPED_FILE" | wc -l | tr -d ' ')
    local remaining=$((total - done - failed - skipped))

    echo "=========================================="
    echo "  Batch 720p Encoding Status"
    echo "=========================================="
    echo "  Total movies:  $total"
    echo "  Completed:     $done"
    echo "  Failed:        $failed"
    echo "  Skipped:       $skipped"
    echo "  Remaining:     $remaining"
    echo "=========================================="

    if [ "$failed" -gt 0 ]; then
        echo ""
        echo "Failed movies:"
        while IFS='|' read -r id reason; do
            local title
            title=$(get_movie_title "$id")
            echo "  $id - $title ($reason)"
        done < <(sort -u "$FAILED_FILE")
    fi
}

encode_movie() {
    local content_id="$1"
    local start_time exit_code elapsed minutes seconds
    start_time=$(date +%s)

    cd "$PROJECT_ROOT"
    set -a && source "$BACKEND_DIR/.env" 2>/dev/null && set +a
    "$POETRY_PYTHON" scripts/backend/convert_to_hls_chunked.py "$content_id" --force --clean 2>&1 || true
    exit_code=${PIPESTATUS[0]:-$?}

    elapsed=$(( $(date +%s) - start_time ))
    minutes=$((elapsed / 60))
    seconds=$((elapsed % 60))

    if [ "$exit_code" -eq 0 ]; then
        echo "$content_id" >> "$DONE_FILE"
        log "OK: $content_id (${minutes}m ${seconds}s)"
        return 0
    else
        echo "${content_id}|exit_code=$exit_code" >> "$FAILED_FILE"
        log "FAILED: $content_id (exit $exit_code, ${minutes}m ${seconds}s)"
        return 1
    fi
}

run_batch() {
    init_state
    log "Starting batch encode..."

    local all_ids
    all_ids=$(get_all_movie_ids)
    local total
    total=$(echo "$all_ids" | wc -l | tr -d ' ')
    local count=0
    local encoded=0
    local errors=0
    local batch_start
    batch_start=$(date +%s)

    log "Total movies in database: $total"

    while IFS= read -r content_id; do
        count=$((count + 1))

        # Skip if already done
        if grep -q "^$content_id$" "$DONE_FILE" 2>/dev/null; then
            continue
        fi

        # Skip if in skip list
        if grep -q "^$content_id$" "$SKIPPED_FILE" 2>/dev/null; then
            continue
        fi

        # Get title for display
        local title
        title=$(get_movie_title "$content_id")

        local done_count
        done_count=$(sort -u "$DONE_FILE" | wc -l | tr -d ' ')
        local remaining=$((total - done_count))

        echo ""
        echo "=========================================="
        log "[$done_count/$total] Encoding: $title ($content_id)"
        log "Remaining: $remaining"
        echo "=========================================="

        if encode_movie "$content_id"; then
            encoded=$((encoded + 1))
        else
            errors=$((errors + 1))
            log "Continuing to next movie after error..."
        fi

        # Clean up temp files to prevent disk fill
        rm -rf /var/folders/*/T/hls_${content_id}_* 2>/dev/null || true

    done <<< "$all_ids"

    local batch_elapsed=$(( $(date +%s) - batch_start ))
    local batch_hours=$((batch_elapsed / 3600))
    local batch_minutes=$(( (batch_elapsed % 3600) / 60 ))

    echo ""
    echo "=========================================="
    log "Batch complete!"
    log "Encoded: $encoded, Errors: $errors"
    log "Total time: ${batch_hours}h ${batch_minutes}m"
    echo "=========================================="
}

# Parse arguments
case "${1:-}" in
    --status)
        show_status
        ;;
    --skip)
        init_state
        echo "${2:?Content ID required}" >> "$SKIPPED_FILE"
        echo "Skipped: $2"
        ;;
    --retry)
        init_state
        content_id="${2:?Content ID required}"
        # Remove from failed list
        grep -v "^$content_id" "$FAILED_FILE" > "$FAILED_FILE.tmp" 2>/dev/null || true
        mv "$FAILED_FILE.tmp" "$FAILED_FILE"
        log "Retrying: $content_id"
        encode_movie "$content_id"
        ;;
    *)
        run_batch
        ;;
esac
