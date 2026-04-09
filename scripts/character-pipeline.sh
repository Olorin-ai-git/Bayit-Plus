#!/usr/bin/env bash
# =============================================================================
# Character Pipeline — Full character extraction and lip-sync generation
# =============================================================================
#
# Extracts a character from a video, clones their voice via ElevenLabs,
# and generates a lip-synced response video via fal.ai Aurora.
#
# Usage:
#   character-pipeline.sh --video <path|url> [options]
#
# Requires: ffmpeg, curl, jq
# API keys: ELEVENLABS_API_KEY, FAL_KEY (from env or backend .env)
# Optional: ANTHROPIC_API_KEY (for auto-generating response text)
# =============================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ELEVENLABS_URL="${ELEVENLABS_API_URL:-https://api.elevenlabs.io/v1}"
readonly FAL_QUEUE_URL="https://queue.fal.run/fal-ai/creatify/aurora"
readonly ANTHROPIC_URL="https://api.anthropic.com/v1/messages"
readonly DEFAULT_MODEL="claude-haiku-4-5-20251001"
readonly TMPFILES_URL="${TEMP_FILE_HOST_URL:-https://tmpfiles.org/api/v1/upload}"

VIDEO="" IMAGE="" AUDIO_SAMPLE="" NAME="" QUESTION="" RESPONSE=""
VOICE_ID="" OUTPUT_DIR="" RESOLUTION="480p" FRAME_SEC=2
AI_MODEL="$DEFAULT_MODEL"
WORK_DIR="" OPEN_RESULT=false SKIP_CROP=false

die()  { echo "ERROR: $*" >&2; exit 1; }
info() { echo ">>> $*"; }

usage() {
  cat <<'USAGE'
Character Pipeline — video to lip-sync response

Usage: character-pipeline.sh --video <path|url> [options]

Required:
  --video <path|url>       Source video file or URL

Optional:
  --image <path>           Portrait image (extracted from video if omitted)
  --name <string>          Character/speaker name (default: "Character")
  --question <string>      Question to ask the character
  --response <string>      Response text (auto-generated via Claude if omitted)
  --audio <path>           Voice sample MP3 for cloning (uses this instead of video audio)
  --voice-id <id>          Existing ElevenLabs voice ID (skip cloning)
  --output-dir <path>      Output directory (default: ./character-output)
  --resolution <480p|720p> Lip-sync resolution (default: 480p)
  --frame-time <seconds>   Portrait frame time offset (default: 2)
  --model <model>          Claude model for response gen (default: haiku)
  --no-crop                Skip auto face-crop on extracted portrait
  --open                   Open result video when done
  -h, --help               Show this help
USAGE
  exit 0
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --video)      VIDEO="$2"; shift 2 ;;
      --image)      IMAGE="$2"; shift 2 ;;
      --audio)      AUDIO_SAMPLE="$2"; shift 2 ;;
      --name)       NAME="$2"; shift 2 ;;
      --question)   QUESTION="$2"; shift 2 ;;
      --response)   RESPONSE="$2"; shift 2 ;;
      --voice-id)   VOICE_ID="$2"; shift 2 ;;
      --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
      --resolution) RESOLUTION="$2"; shift 2 ;;
      --frame-time) FRAME_SEC="$2"; shift 2 ;;
      --model)      AI_MODEL="$2"; shift 2 ;;
      --no-crop)    SKIP_CROP=true; shift ;;
      --open)       OPEN_RESULT=true; shift ;;
      -h|--help)    usage ;;
      *)            die "Unknown option: $1" ;;
    esac
  done
  [ -n "$VIDEO" ] || die "--video is required. Run with --help for usage."
  OUTPUT_DIR="${OUTPUT_DIR:-./character-output}"
  NAME="${NAME:-Character}"
}

load_env() {
  local env_file="${SCRIPT_DIR}/../backend/.env"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

check_deps() {
  for cmd in ffmpeg curl jq; do
    command -v "$cmd" >/dev/null || die "$cmd is required but not found"
  done
  [ -n "${ELEVENLABS_API_KEY:-}" ] || die "ELEVENLABS_API_KEY not set"
  [ -n "${FAL_KEY:-}" ] || die "FAL_KEY not set"
}

setup() {
  WORK_DIR=$(mktemp -d)
  trap 'rm -rf "$WORK_DIR"' EXIT
  mkdir -p "$OUTPUT_DIR"
}

ensure_local_video() {
  if [[ "$VIDEO" =~ ^https?:// ]]; then
    info "Downloading video..."
    curl -sL -o "$WORK_DIR/source.mp4" "$VIDEO" || die "Download failed"
    VIDEO="$WORK_DIR/source.mp4"
  fi
  [ -f "$VIDEO" ] || die "Video not found: $VIDEO"
}

extract_audio() {
  if [ -n "$AUDIO_SAMPLE" ]; then
    [ -f "$AUDIO_SAMPLE" ] || die "Audio sample not found: $AUDIO_SAMPLE"
    info "Using provided voice sample: $AUDIO_SAMPLE"
    cp "$AUDIO_SAMPLE" "$WORK_DIR/audio.mp3"
  else
    info "Extracting audio from video..."
    ffmpeg -y -i "$VIDEO" -vn -acodec libmp3lame -ar 16000 -ac 1 -ab 128k \
      "$WORK_DIR/audio.mp3" -loglevel error
    [ -s "$WORK_DIR/audio.mp3" ] || die "Audio extraction produced empty file"
  fi
}

extract_portrait() {
  if [ -n "$IMAGE" ]; then
    cp "$IMAGE" "$WORK_DIR/portrait_raw.jpg"
  else
    info "Extracting portrait frame at ${FRAME_SEC}s..."
    ffmpeg -y -i "$VIDEO" -ss "$FRAME_SEC" -frames:v 1 -q:v 2 \
      "$WORK_DIR/portrait_raw.jpg" -loglevel error
    [ -s "$WORK_DIR/portrait_raw.jpg" ] || die "Frame extraction failed"
  fi
  crop_face
  # Save portrait to output for inspection
  cp "$WORK_DIR/portrait.jpg" "$OUTPUT_DIR/portrait_used.jpg"
}

crop_face() {
  if [ "$SKIP_CROP" = true ]; then
    cp "$WORK_DIR/portrait_raw.jpg" "$WORK_DIR/portrait.jpg"
    return
  fi
  # Get image dimensions
  local dims
  dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
    -of csv=p=0 "$WORK_DIR/portrait_raw.jpg" 2>/dev/null) || {
    cp "$WORK_DIR/portrait_raw.jpg" "$WORK_DIR/portrait.jpg"; return; }
  local w h
  w=$(echo "$dims" | cut -d',' -f1)
  h=$(echo "$dims" | cut -d',' -f2)
  # Crop to upper-center square (face region heuristic: top 60%, center 70%)
  local crop_w crop_h crop_x crop_y
  crop_w=$((w * 70 / 100))
  crop_h=$((h * 60 / 100))
  crop_x=$(( (w - crop_w) / 2 ))
  crop_y=0
  info "Auto-cropping portrait to face region (${crop_w}x${crop_h})..."
  ffmpeg -y -i "$WORK_DIR/portrait_raw.jpg" \
    -vf "crop=${crop_w}:${crop_h}:${crop_x}:${crop_y}" \
    -q:v 2 "$WORK_DIR/portrait.jpg" -loglevel error 2>/dev/null || {
    info "Crop failed, using raw frame"
    cp "$WORK_DIR/portrait_raw.jpg" "$WORK_DIR/portrait.jpg"
  }
}

upload_to_tmpfiles() {
  local file="$1"
  local resp
  resp=$(curl -s -X POST "$TMPFILES_URL" -F "file=@${file}")
  local page_url
  page_url=$(echo "$resp" | jq -r '.data.url // empty')
  [ -n "$page_url" ] || die "tmpfiles upload failed: $resp"
  echo "$page_url" | sed 's|tmpfiles.org/|tmpfiles.org/dl/|'
}

clone_voice() {
  if [ -n "$VOICE_ID" ]; then
    info "Using existing voice: $VOICE_ID"
    return
  fi
  # Check audio duration — warn if too short for quality cloning
  local duration
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 \
    "$WORK_DIR/audio.mp3" 2>/dev/null | cut -d'.' -f1)
  if [ "${duration:-0}" -lt 30 ]; then
    echo "WARNING: Audio is only ${duration}s — ElevenLabs needs 30s+ for quality voice cloning."
    echo "         The cloned voice may not sound like the original speaker."
    echo "         Consider providing a longer video or use --voice-id with a pre-cloned voice."
  fi
  local voice_name="${NAME}_$(date +%s)"
  info "Cloning voice as '${voice_name}'..."
  local resp
  resp=$(curl -s -X POST "${ELEVENLABS_URL}/voices/add" \
    -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
    -F "name=${voice_name}" \
    -F "files=@${WORK_DIR}/audio.mp3")
  VOICE_ID=$(echo "$resp" | jq -r '.voice_id // empty')
  [ -n "$VOICE_ID" ] || die "Voice cloning failed: $resp"
  info "Voice cloned: $VOICE_ID"
}

generate_response() {
  if [ -n "$RESPONSE" ]; then return; fi
  [ -n "${ANTHROPIC_API_KEY:-}" ] || die "ANTHROPIC_API_KEY needed for response generation (or pass --response)"
  local q="${QUESTION:-What is this scene about?}"
  info "Generating in-character response via Claude..."
  local prompt="You are ${NAME} from a video. A viewer paused and asked: \"${q}\". Respond in character in 1 sentence, maximum 20 words. Short and punchy."
  local body
  body=$(jq -n --arg model "$AI_MODEL" --arg prompt "$prompt" \
    '{model: $model, max_tokens: 150, messages: [{role: "user", content: $prompt}]}')
  local resp
  resp=$(curl -s -X POST "$ANTHROPIC_URL" \
    -H "x-api-key: ${ANTHROPIC_API_KEY}" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d "$body")
  RESPONSE=$(echo "$resp" | jq -r '.content[0].text // empty')
  [ -n "$RESPONSE" ] || die "Response generation failed: $resp"
  info "Response: $RESPONSE"
}

synthesize_speech() {
  info "Generating speech via ElevenLabs TTS..."
  local body
  body=$(jq -n --arg text "$RESPONSE" \
    '{text: $text, model_id: "eleven_multilingual_v2", voice_settings: {stability: 0.5, similarity_boost: 0.75}}')
  curl -s -X POST "${ELEVENLABS_URL}/text-to-speech/${VOICE_ID}" \
    -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
    -H "content-type: application/json" \
    -d "$body" \
    -o "$WORK_DIR/speech.mp3" || die "TTS failed"
  [ -s "$WORK_DIR/speech.mp3" ] || die "TTS returned empty audio"
}

run_lipsync() {
  info "Uploading portrait and audio..."
  local image_url audio_url
  image_url=$(upload_to_tmpfiles "$WORK_DIR/portrait.jpg")
  audio_url=$(upload_to_tmpfiles "$WORK_DIR/speech.mp3")

  info "Submitting Aurora lip-sync job..."
  local body
  body=$(jq -n --arg img "$image_url" --arg aud "$audio_url" --arg res "$RESOLUTION" \
    '{image_url: $img, audio_url: $aud, resolution: $res, guidance_scale: 1, audio_guidance_scale: 2}')
  local resp
  resp=$(curl -s -X POST "$FAL_QUEUE_URL" \
    -H "Authorization: Key ${FAL_KEY}" \
    -H "Content-Type: application/json" \
    -d "$body")
  local status_url
  status_url=$(echo "$resp" | jq -r '.status_url // empty')
  [ -n "$status_url" ] || die "Aurora submission failed: $resp"

  info "Polling for completion (up to 5 min)..."
  local attempt=0 max_attempts=60
  while [ $attempt -lt $max_attempts ]; do
    sleep 5
    resp=$(curl -s "$status_url" -H "Authorization: Key ${FAL_KEY}")
    local status
    status=$(echo "$resp" | jq -r '.status')
    case "$status" in
      COMPLETED)
        local response_url
        response_url=$(echo "$resp" | jq -r '.response_url')
        resp=$(curl -s "$response_url" -H "Authorization: Key ${FAL_KEY}")
        local video_url
        video_url=$(echo "$resp" | jq -r '.video.url')
        info "Downloading result video..."
        curl -sL -o "$OUTPUT_DIR/lipsync_response.mp4" "$video_url"
        return ;;
      FAILED|CANCELLED)
        die "Aurora failed: $(echo "$resp" | jq -r '.error // "unknown"')" ;;
    esac
    attempt=$((attempt + 1))
    printf "\r  Status: %-12s (attempt %d/%d)" "$status" "$attempt" "$max_attempts"
  done
  die "Aurora timed out after 5 minutes"
}

main() {
  parse_args "$@"
  load_env
  check_deps
  setup
  ensure_local_video
  extract_audio
  extract_portrait
  clone_voice
  generate_response
  synthesize_speech
  run_lipsync

  echo ""
  echo "=== Pipeline Complete ==="
  echo "Output:    $OUTPUT_DIR/lipsync_response.mp4"
  echo "Voice ID:  $VOICE_ID"
  echo "Character: $NAME"
  echo "Response:  $RESPONSE"

  # Save metadata
  jq -n \
    --arg voice "$VOICE_ID" --arg name "$NAME" \
    --arg response "$RESPONSE" --arg video "$VIDEO" \
    '{voice_id: $voice, character: $name, response: $response, source_video: $video}' \
    > "$OUTPUT_DIR/pipeline-metadata.json"

  if [ "$OPEN_RESULT" = true ]; then
    open "$OUTPUT_DIR/lipsync_response.mp4" 2>/dev/null || true
  fi
}

main "$@"
