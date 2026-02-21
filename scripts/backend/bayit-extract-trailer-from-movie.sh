#!/usr/bin/env bash
# bayit-extract-trailer-from-movie.sh
#
# Extract a trailer clip from a GCS HLS movie stream.
# Wraps extract_trailer_from_gcs_hls.py with environment setup.
#
# Usage:
#   ./bayit-extract-trailer-from-movie.sh "Fellowship"
#   ./bayit-extract-trailer-from-movie.sh "Fellowship" --start 240 --duration 120
#   ./bayit-extract-trailer-from-movie.sh "Fellowship" --dry-run

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../../backend" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/extract_trailer_from_gcs_hls.py"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
die() { echo "[$(date -u +%H:%M:%S)] ERROR: $*" >&2; exit 1; }

[[ $# -lt 1 ]] && die "Usage: $0 <title-filter> [--start N] [--duration N] [--dry-run]"

TITLE="$1"
shift

# ---------------------------------------------------------------------------
# GCP credentials
# ---------------------------------------------------------------------------
CREDS="$BACKEND_DIR/credentials/bayit-plus-7c3927963c21.json"
if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" && -f "$CREDS" ]]; then
  export GOOGLE_APPLICATION_CREDENTIALS="$CREDS"
  log "Using credentials: $CREDS"
fi

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
log "Extracting trailers for: \"$TITLE\""
cd "$BACKEND_DIR"
exec poetry run python "$PYTHON_SCRIPT" --title "$TITLE" "$@"
