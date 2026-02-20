# Regenerate Interaction Videos

Replaces old Creatify stock persona videos with Aurora lip-sync videos using the correct per-character cloned voices and face images from `Content.interactive_characters`.

**Status:** Production Ready

---

## Why Regenerate?

Early interactive moment and live session videos were generated with:
- A single **default voice ID** shared across all characters
- **Creatify stock personas** (generic faces) instead of actual character faces

The regeneration script fixes both issues by using:
- **Per-character cloned voice IDs** from `Content.interactive_characters`
- **Per-character face images** (`frame_url`) animated via fal.ai Aurora lip-sync

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| Poetry | Backend dependencies installed (`cd backend && poetry install`) |
| MongoDB | Access to the Bayit+ database (via `MONGODB_URI` in `.env`) |
| ElevenLabs | Valid `ELEVENLABS_API_KEY` in `.env` |
| fal.ai | Valid `FAL_KEY` in `.env` |
| Content | Target content must have `interactive_characters` with `voice_id` and `frame_url` populated |

---

## Usage

### Basic Commands

```bash
# Dry run - scan and report what would be regenerated (no API calls)
./scripts/regenerate-interaction-videos.sh --imdb-id tt0088763 --dry-run

# Regenerate everything (moments + live sessions)
./scripts/regenerate-interaction-videos.sh --imdb-id tt0088763

# Regenerate only interactive moments (pre-seeded responses)
./scripts/regenerate-interaction-videos.sh --imdb-id tt0088763 --moments-only

# Regenerate only live session exchanges
./scripts/regenerate-interaction-videos.sh --imdb-id tt0088763 --sessions-only
```

### Running the Python Script Directly

```bash
cd backend && poetry run python ../scripts/regenerate_interaction_videos.py --imdb-id tt0088763 --dry-run
```

---

## What Gets Regenerated

### Interactive Moments

Stored in `content.interactive_moments[]` on the content document.

| Field | Action |
|-------|--------|
| `character_response_audio_url` | Re-generated TTS with correct voice |
| `character_response_video_url` | Re-generated Aurora lip-sync with correct face |
| `voice_id` | Updated to match character lookup |

Only moments with existing `character_response_text` are processed. Moments without response text are skipped.

### Live Session Exchanges

Stored in `vod_interaction_sessions.dialogue_exchanges[]`.

| Field | Action |
|-------|--------|
| `audio_url` | Re-generated TTS with correct voice |
| `animated_video_url` | Re-generated Aurora lip-sync with correct face |

Only exchanges where `speaker == "character"` and `animated_video_url` already exists are processed.

---

## Character Resolution

The script builds a lookup map from `Content.interactive_characters[]`:

```
character_name -> { voice_id, frame_url }
```

For each moment or exchange, the character is resolved in this order:

1. **Primary:** Match `character_name` against the `interactive_characters` lookup
2. **Moment fallback:** Use the moment's own `voice_id` and `character_frame_url` fields
3. **Session fallback:** Use the session's `character_voice_id` and `character_frame_url` fields
4. **Skip:** If no voice ID or frame URL can be resolved, the item is skipped

---

## Pipeline Per Item

Each regenerated moment or exchange follows this pipeline:

1. **TTS Generation** -- ElevenLabs `eleven_multilingual_v2` model with the character's cloned voice
2. **Audio Upload** -- Uploaded to storage as `vod-interactions/character-audio/{name}_{hash}.mp3`
3. **URL Bridging** -- Local or GCS URLs are made publicly accessible for fal.ai (via tmpfiles.org if needed)
4. **Aurora Lip-Sync** -- `fal_aurora_client.create_lipsync(image_url, audio_url)` generates the video
5. **Video Upload** -- Aurora output uploaded to storage as `vod-interactions/aurora-lipsync/{hash}.mp4`
6. **MongoDB Update** -- Updated fields written back to the document

---

## Flags Reference

| Flag | Description |
|------|-------------|
| `--imdb-id` | **(Required)** IMDB ID of the content to regenerate |
| `--dry-run` | Scan and log what would be regenerated without calling any APIs |
| `--moments-only` | Only process interactive moments, skip live sessions |
| `--sessions-only` | Only process live session exchanges, skip moments |

---

## Files

| File | Description |
|------|-------------|
| `scripts/regenerate_interaction_videos.py` | Async Python script (Motor + httpx + fal.ai Aurora) |
| `scripts/regenerate-interaction-videos.sh` | Bash wrapper with color output and flag validation |

---

## Troubleshooting

**"Content not found"** -- Verify the IMDB ID exists in the `content` collection. Check with:

```bash
cd backend && poetry run python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_settings
s = get_settings()
async def check():
    c = AsyncIOMotorClient(s.MONGODB_URI)
    doc = await c[s.MONGODB_DB_NAME].content.find_one({'imdb_id': 'tt0088763'})
    print('Found:', doc.get('title') if doc else 'NOT FOUND')
    c.close()
asyncio.run(check())
"
```

**"No interactive_characters with frame_url found"** -- The content needs `interactive_characters` populated with `voice_id` and `frame_url` for each character. Run the voice cloning pipeline first.

**Aurora timeout** -- Aurora jobs can take 30-90 seconds each. The client has a 600-second timeout and falls back to queue polling if needed. For large batches, consider using `--moments-only` and `--sessions-only` separately.

**GCS credentials missing** -- If running locally without GCS credentials, the script falls back to local storage. Videos will be saved under `backend/uploads/` instead of GCS.
