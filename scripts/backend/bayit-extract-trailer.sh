#!/usr/bin/env bash
# bayit-extract-trailer.sh
#
# Extract and upload a single trailer: yt-dlp download -> ffmpeg merge -> GCS upload.
#
# Usage:
#   ./bayit-extract-trailer.sh <youtube-url-or-video-id>
#
# Required env vars:
#   GCS_BUCKET_NAME                     GCS bucket for uploads
#
# Optional env vars (match backend config defaults):
#   TRAILER_GCS_PATH_PREFIX             GCS path prefix (default: trailers)
#   TRAILER_EXTRACTION_TEMP_DIR         Local temp dir   (default: /tmp/trailer-extraction)
#   TRAILER_EXTRACTION_YTDLP_TIMEOUT    yt-dlp timeout s (default: 120)
#   TRAILER_EXTRACTION_FFMPEG_TIMEOUT   ffmpeg timeout s (default: 300)

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
err()  { echo "[$(date -u +%H:%M:%S)] ERROR: $*" >&2; }
die()  { err "$*"; exit 1; }

require() {
  for cmd in "$@"; do
    command -v "$cmd" &>/dev/null || die "Required tool not found: $cmd"
  done
}

# ---------------------------------------------------------------------------
# Parse input
# ---------------------------------------------------------------------------
[[ $# -lt 1 ]] && die "Usage: $0 <youtube-url-or-video-id>"

INPUT="$1"

# Extract video ID from a URL or accept a bare ID
if [[ "$INPUT" =~ ^https?:// ]]; then
  VIDEO_ID=$(python3 -c "
import sys, urllib.parse
u = urllib.parse.urlparse('$INPUT')
qs = urllib.parse.parse_qs(u.query)
vid = qs.get('v', [None])[0]
if not vid and u.hostname in ('youtu.be',):
    vid = u.path.lstrip('/')
if not vid:
    sys.exit(1)
print(vid)
" 2>/dev/null) || die "Cannot extract video ID from: $INPUT"
else
  VIDEO_ID="$INPUT"
fi

[[ -z "$VIDEO_ID" ]] && die "Empty video ID"

# ---------------------------------------------------------------------------
# Config from env (mirrors Python settings)
# ---------------------------------------------------------------------------
GCS_BUCKET_NAME="${GCS_BUCKET_NAME:-}"
TRAILER_GCS_PATH_PREFIX="${TRAILER_GCS_PATH_PREFIX:-trailers}"
TRAILER_EXTRACTION_TEMP_DIR="${TRAILER_EXTRACTION_TEMP_DIR:-/tmp/trailer-extraction}"
YTDLP_TIMEOUT="${TRAILER_EXTRACTION_YTDLP_TIMEOUT:-120}"
FFMPEG_TIMEOUT="${TRAILER_EXTRACTION_FFMPEG_TIMEOUT:-300}"

[[ -z "$GCS_BUCKET_NAME" ]] && die "GCS_BUCKET_NAME env var is required"

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------
require yt-dlp ffmpeg gsutil

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
WORK_DIR="${TRAILER_EXTRACTION_TEMP_DIR}/${VIDEO_ID}"
VIDEO_OUT="${WORK_DIR}/${VIDEO_ID}_video.%(ext)s"
AUDIO_OUT="${WORK_DIR}/${VIDEO_ID}_audio.%(ext)s"
MERGED="${WORK_DIR}/${VIDEO_ID}_merged.mp4"
GCS_OBJECT="${TRAILER_GCS_PATH_PREFIX}/${VIDEO_ID}.mp4"
GCS_URI="gs://${GCS_BUCKET_NAME}/${GCS_OBJECT}"
PUBLIC_URL="https://storage.googleapis.com/${GCS_BUCKET_NAME}/${GCS_OBJECT}"
WATCH_URL="https://www.youtube.com/watch?v=${VIDEO_ID}"

cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT

mkdir -p "$WORK_DIR"

# ---------------------------------------------------------------------------
# Check if already uploaded
# ---------------------------------------------------------------------------
if gsutil -q stat "$GCS_URI" 2>/dev/null; then
  log "Trailer already exists in GCS: $PUBLIC_URL"
  echo "$PUBLIC_URL"
  exit 0
fi

# ---------------------------------------------------------------------------
# Download video + audio in parallel
# ---------------------------------------------------------------------------
log "Downloading video stream: $WATCH_URL"
yt-dlp \
  --format "bestvideo[height<=1080][ext=mp4]/bestvideo[height<=1080]/bestvideo" \
  --output "$VIDEO_OUT" \
  --quiet \
  --no-warnings \
  --socket-timeout "$YTDLP_TIMEOUT" \
  "$WATCH_URL" &
PID_VIDEO=$!

log "Downloading audio stream: $WATCH_URL"
yt-dlp \
  --format "bestaudio[ext=m4a]/bestaudio" \
  --output "$AUDIO_OUT" \
  --quiet \
  --no-warnings \
  --socket-timeout "$YTDLP_TIMEOUT" \
  "$WATCH_URL" &
PID_AUDIO=$!

wait "$PID_VIDEO" || die "Video stream download failed"
wait "$PID_AUDIO" || die "Audio stream download failed"

# Resolve actual filenames (yt-dlp expands %(ext)s)
VIDEO_FILE=$(ls "${WORK_DIR}/${VIDEO_ID}_video."* 2>/dev/null | head -1)
AUDIO_FILE=$(ls "${WORK_DIR}/${VIDEO_ID}_audio."* 2>/dev/null | head -1)

[[ -f "$VIDEO_FILE" ]] || die "Video file not found in $WORK_DIR"
[[ -f "$AUDIO_FILE" ]] || die "Audio file not found in $WORK_DIR"

log "Downloaded video: $(du -sh "$VIDEO_FILE" | cut -f1)"
log "Downloaded audio: $(du -sh "$AUDIO_FILE" | cut -f1)"

# ---------------------------------------------------------------------------
# Merge with ffmpeg
# ---------------------------------------------------------------------------
log "Merging streams -> $MERGED"
timeout "$FFMPEG_TIMEOUT" ffmpeg \
  -i "$VIDEO_FILE" \
  -i "$AUDIO_FILE" \
  -c:v copy \
  -c:a aac \
  -b:a 192k \
  -movflags +faststart \
  -y \
  "$MERGED" \
  2>&1 | tail -5

[[ -f "$MERGED" ]] || die "Merged file not produced"
log "Merged: $(du -sh "$MERGED" | cut -f1)"

# ---------------------------------------------------------------------------
# Upload to GCS
# ---------------------------------------------------------------------------
log "Uploading to $GCS_URI"
gsutil -h "Content-Type:video/mp4" cp "$MERGED" "$GCS_URI"

log "Trailer ready: $PUBLIC_URL"
echo "$PUBLIC_URL"
