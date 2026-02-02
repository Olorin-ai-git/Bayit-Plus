# HLS Subtitles for Apple TV/AirPlay Compatibility

**Date**: 2026-02-02
**Status**: Production
**Platforms**: Web (browser playback), Apple TV (AirPlay casting)

## Overview

This guide documents the implementation of HLS-compatible subtitles that work with both browser playback (HLS.js) and Apple TV native playback via AirPlay.

## Problem Statement

Subtitles were displaying correctly when playing videos in the browser but **not displaying when casting to Apple TV via AirPlay**. This is because:

- **Browser**: Uses HLS.js JavaScript library which can load VTT files directly
- **Apple TV AirPlay**: Uses native HLS player which requires proper HLS subtitle playlists

## Solution Architecture

### HLS Subtitle Format Requirements

For Apple TV compatibility, subtitles must follow this structure:

```
master.m3u8 (master manifest)
├── playlist.m3u8 (video playlist)
├── subtitles_en.m3u8 (English subtitle playlist)
│   └── subtitles_en.vtt (English VTT file)
├── subtitles_he.m3u8 (Hebrew subtitle playlist)
│   └── subtitles_he.vtt (Hebrew VTT file)
└── [additional language playlists...]
```

### File Formats

#### 1. Master Manifest (master.m3u8)

```hls
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Hebrew",DEFAULT=NO,AUTOSELECT=NO,FORCED=NO,LANGUAGE="he",CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog",URI="https://storage.googleapis.com/bayit-plus-media-new/movies/Ice_Age/hls/subtitles_he.m3u8"

#EXT-X-STREAM-INF:BANDWIDTH=5000000,SUBTITLES="subs"
playlist.m3u8
```

**Key attributes:**
- `TYPE=SUBTITLES` - Identifies this as a subtitle track
- `GROUP-ID="subs"` - Groups all subtitle tracks together
- `LANGUAGE="he"` - Two-letter ISO language code
- `CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog"` - Apple accessibility attribute
- `URI="https://..."` - **Absolute URL** to subtitle playlist (required for AirPlay)

#### 2. Subtitle Playlist (subtitles_he.m3u8)

```hls
#EXTM3U
#EXT-X-TARGETDURATION:3600
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:3600.000,
subtitles_he.vtt
#EXT-X-ENDLIST
```

**Key attributes:**
- `#EXT-X-TARGETDURATION:3600` - Maximum segment duration (1 hour for full movie)
- `#EXT-X-PLAYLIST-TYPE:VOD` - Video On Demand (not live)
- `#EXTINF:3600.000,` - Duration of this subtitle segment (full movie)
- `subtitles_he.vtt` - Relative path to VTT file

#### 3. WebVTT File (subtitles_he.vtt)

```vtt
WEBVTT

1
00:00:41.707 --> 00:00:45.462
תיקוני סינכרון-שפה-פיסוק-תרגום והוספת שורות תרגום חסרות aviva2005

2
00:03:53.775 --> 00:03:57.444
?"למה שלא נקרא לו ה"פקו" ?או ה"ניפיה
```

**Format requirements:**
- Plain `WEBVTT` header (no X-TIMESTAMP-MAP needed)
- Standard WebVTT cue format
- UTF-8 encoding (UTF-8 BOM optional but compatible)

## Implementation Steps

### 1. Generate WebVTT Files from Database

Extract subtitle cues from MongoDB and convert to plain WebVTT format:

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def generate_vtt_files(content_id: str):
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client.bayit_plus

    content = await db.content.find_one({'_id': ObjectId(content_id)})

    for subtitle in content['subtitles']:
        language = subtitle['language']
        cues = subtitle['cues']

        # Plain WebVTT format
        vtt = 'WEBVTT\n\n'

        for i, cue in enumerate(cues, 1):
            vtt += f'{i}\n'
            vtt += f'{cue["start"]} --> {cue["end"]}\n'
            vtt += f'{cue["text"]}\n\n'

        # Save to file
        with open(f'subtitles_{language}.vtt', 'w', encoding='utf-8') as f:
            f.write(vtt)
```

### 2. Create Subtitle Playlists

Generate HLS playlist for each subtitle track:

```bash
for lang in en es da de et fi fr hu id he; do
  cat > subtitles_${lang}.m3u8 << EOF
#EXTM3U
#EXT-X-TARGETDURATION:3600
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:3600.000,
subtitles_${lang}.vtt
#EXT-X-ENDLIST
EOF
done
```

### 3. Upload to Google Cloud Storage

Upload all files with proper headers:

```bash
# Upload VTT files
for lang in en es da de et fi fr hu id he; do
  gsutil -h "Cache-Control:no-cache, no-store, must-revalidate" \
         -h "Content-Type:text/vtt" \
         -h "Access-Control-Allow-Origin:*" \
         cp subtitles_${lang}.vtt \
         gs://bayit-plus-media-new/movies/Ice_Age/hls/
done

# Upload subtitle playlists
for lang in en es da de et fi fr hu id he; do
  gsutil -h "Cache-Control:no-cache, no-store, must-revalidate" \
         -h "Content-Type:application/vnd.apple.mpegurl" \
         cp subtitles_${lang}.m3u8 \
         gs://bayit-plus-media-new/movies/Ice_Age/hls/
done
```

### 4. Update Master Manifest

Create master.m3u8 with absolute URLs pointing to subtitle playlists:

```bash
cat > master.m3u8 << 'EOF'
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",DEFAULT=NO,AUTOSELECT=NO,FORCED=NO,LANGUAGE="en",CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog",URI="https://storage.googleapis.com/bayit-plus-media-new/movies/Ice_Age/hls/subtitles_en.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Hebrew",DEFAULT=NO,AUTOSELECT=NO,FORCED=NO,LANGUAGE="he",CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog",URI="https://storage.googleapis.com/bayit-plus-media-new/movies/Ice_Age/hls/subtitles_he.m3u8"
[... additional languages ...]

#EXT-X-STREAM-INF:BANDWIDTH=5000000,SUBTITLES="subs"
playlist.m3u8
EOF

gsutil -h "Cache-Control:no-cache, no-store, must-revalidate" \
       -h "Content-Type:application/vnd.apple.mpegurl" \
       cp master.m3u8 \
       gs://bayit-plus-media-new/movies/Ice_Age/hls/
```

### 5. Update Database with Cache-Busting URL

Force clients to reload the updated manifest:

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

async def update_stream_url(content_id: str):
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client.bayit_plus

    timestamp = int(datetime.now().timestamp())
    new_url = f'https://storage.googleapis.com/bayit-plus-media-new/movies/Ice_Age/hls/master.m3u8?v={timestamp}'

    await db.content.update_one(
        {'_id': ObjectId(content_id)},
        {'$set': {'stream_url': new_url}}
    )
```

## GCS File Structure

Final file structure in Google Cloud Storage:

```
gs://bayit-plus-media-new/movies/Ice_Age/hls/
├── master.m3u8                 # Master manifest with subtitle references
├── playlist.m3u8               # Video playlist
├── segment_000.ts              # Video segments
├── segment_001.ts
├── ...
├── subtitles_en.m3u8           # English subtitle playlist
├── subtitles_en.vtt            # English subtitles
├── subtitles_es.m3u8           # Spanish subtitle playlist
├── subtitles_es.vtt            # Spanish subtitles
├── subtitles_he.m3u8           # Hebrew subtitle playlist
├── subtitles_he.vtt            # Hebrew subtitles
└── [additional subtitle files...]
```

## Supported Languages

10 languages with ISO 639-1 codes:

| Language | Code | Label |
|----------|------|-------|
| English | en | English |
| Spanish | es | Spanish |
| Danish | da | Danish |
| German | de | German |
| Estonian | et | Estonian |
| Finnish | fi | Finnish |
| French | fr | French |
| Hungarian | hu | Hungarian |
| Indonesian | id | Indonesian |
| Hebrew | he | Hebrew |

## Key Learnings

### What Didn't Work

1. **Direct VTT URIs** - `URI="subtitles_he.vtt"` worked in browser but not on Apple TV
2. **X-TIMESTAMP-MAP header** - Not required and may cause issues
3. **Relative URLs** - Apple TV requires absolute URLs for AirPlay
4. **Missing CHARACTERISTICS** - Apple TV prefers accessibility attributes

### What Works

1. **Subtitle playlists** - HLS .m3u8 wrappers around VTT files
2. **Absolute URLs** - Full `https://` URLs for all subtitle resources
3. **Plain WebVTT** - Simple WEBVTT header without timing metadata
4. **CHARACTERISTICS attribute** - `public.accessibility.transcribes-spoken-dialog`

## Testing

### Browser Testing

1. Open movie in browser: `http://localhost:3200/vod/movie/6965398bb0b67350385e6e0b`
2. Click play
3. Select subtitle language from player controls
4. Verify subtitles display correctly

### Apple TV Testing

1. Start playback in browser
2. Click AirPlay icon to cast to Apple TV
3. **Seek to middle of movie** (first subtitle appears at 00:00:41)
4. Use Apple TV remote to select subtitle language
5. Verify subtitles display on TV screen

### Common Issues

**Subtitles not appearing:**
- Check that you've seeked past 00:00:00 (first subtitle may not be immediate)
- Verify cache-busting parameter is current
- Clear Apple TV cache or restart device

**Subtitles work in browser but not Apple TV:**
- Ensure subtitle URIs are absolute URLs (not relative)
- Verify subtitle playlists (.m3u8) exist alongside VTT files
- Check GCS CORS headers allow cross-origin requests

## Related Backend Code

### Python Script for HLS Subtitle Generation

See: `backend/app/services/ffmpeg/hls_subtitle_generator.py`

Key function:
```python
def generate_master_manifest_with_subtitles(
    video_playlist: str,
    subtitle_files: List[Dict[str, str]],
    output_path: str
) -> str:
    """Generate HLS master manifest with subtitle track references."""
    manifest = "#EXTM3U\n#EXT-X-VERSION:3\n\n"

    # Add subtitle tracks
    for sub in subtitle_files:
        manifest += (
            f'#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",'
            f'NAME="{sub["label"]}",DEFAULT=NO,'
            f'AUTOSELECT=NO,FORCED=NO,'
            f'LANGUAGE="{sub["language"]}",'
            f'CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog",'
            f'URI="{sub["uri"]}"\n'
        )

    # Add video stream reference
    manifest += f'\n#EXT-X-STREAM-INF:BANDWIDTH=5000000,SUBTITLES="subs"\n'
    manifest += f'{video_playlist}\n'

    return manifest
```

## References

- [Apple HLS Authoring Specification](https://developer.apple.com/documentation/http_live_streaming/hls_authoring_specification_for_apple_devices)
- [WebVTT Specification](https://www.w3.org/TR/webvtt1/)
- [HLS.js Documentation](https://github.com/video-dev/hls.js/)
- [RFC 8216 - HTTP Live Streaming](https://datatracker.ietf.org/doc/html/rfc8216)

## Version History

- **2026-02-02**: Initial implementation for Ice Age movie
  - 10 languages supported
  - Browser and Apple TV AirPlay compatibility confirmed
  - Plain WebVTT format without X-TIMESTAMP-MAP
