# Video Encoding Specifications

## Overview

This document defines the encoding standards for all video assets used in the Olorin streaming portal. These specifications ensure consistent quality, optimal performance, and accessibility across all platforms.

---

## Video Encoding Standards

### General Requirements

| Parameter | Specification | Rationale |
|-----------|--------------|-----------|
| **Container Format** | MP4 (H.264), WebM (VP9) | Browser compatibility |
| **Maximum Resolution** | 1920x1080 (1080p) | Balance quality vs file size |
| **Frame Rate** | 30fps | Smooth playback, reasonable bandwidth |
| **Bitrate Mode** | Variable Bitrate (VBR) | Optimal quality per bitrate |
| **Bitrate Range** | 3-5 Mbps | High quality without bloat |
| **Color Space** | BT.709 | Standard for HD video |
| **Pixel Format** | YUV 4:2:0 | Standard compression |

### Video Codec Settings

**H.264 (MP4 - Safari/iOS compatibility)**
```bash
-c:v libx264
-preset slow              # Better compression
-crf 23                   # Constant Rate Factor (18-28 range, 23 = good quality)
-profile:v high           # H.264 High Profile
-level 4.0                # Compatibility level
-pix_fmt yuv420p         # Pixel format
```

**VP9 (WebM - Modern browsers)**
```bash
-c:v libvpx-vp9
-crf 30                   # VP9 quality (lower = better)
-b:v 0                    # Constrained quality mode
-row-mt 1                 # Multi-threading
```

---

## Audio Encoding Standards

### Audio Requirements

| Parameter | Specification | Rationale |
|-----------|--------------|-----------|
| **Codec** | AAC (MP4), Opus (WebM) | Universal compatibility |
| **Sample Rate** | 48kHz | Broadcast standard |
| **Bitrate** | 128kbps | Clear speech, reasonable size |
| **Channels** | Stereo (2.0) | Standard stereo audio |
| **Normalization Target** | -16 LUFS | Consistent perceived loudness |
| **True Peak** | -1.5 dBTP | Prevent clipping |
| **Loudness Range** | 11 LU | Dynamic range control |

### Audio Codec Settings

**AAC (MP4)**
```bash
-c:a aac
-b:a 128k
-ar 48000
-ac 2
```

**Opus (WebM)**
```bash
-c:a libopus
-b:a 128k
-ar 48000
-ac 2
```

---

## Audio Normalization

All videos MUST be normalized to ensure consistent volume levels across all content.

### Normalization Process

**Step 1: Measure Current Levels**
```bash
ffmpeg -i input.mp4 -af loudnorm=print_format=json -f null - 2>&1 | grep "input_i"
```

**Step 2: Normalize to Target**
```bash
ffmpeg -i input.mp4 \
  -af loudnorm=I=-16:TP=-1.5:LRA=11 \
  -c:v copy \
  output-normalized.mp4
```

**Target Levels**:
- **Integrated Loudness (I)**: -16 LUFS ± 1 LU
- **True Peak (TP)**: -1.5 dBTP maximum
- **Loudness Range (LRA)**: 11 LU

---

## File Size Limits

To ensure fast loading and reasonable CDN costs:

| Video Type | Maximum Size | Typical Duration |
|------------|--------------|------------------|
| **Hero Background** | 50 MB | 30-60 seconds |
| **Feature Demos** | 30 MB | 15-45 seconds |
| **Voice Demos** | 15 MB | 10-20 seconds |
| **Total Page Weight** | 150 MB | All videos combined |

---

## FFmpeg Encoding Commands

### Complete Encoding Workflow

**H.264/AAC (MP4) - Safari/iOS Compatible**
```bash
ffmpeg -i input.mov \
  -c:v libx264 -preset slow -crf 23 \
  -profile:v high -level 4.0 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -r 30 \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -af loudnorm=I=-16:TP=-1.5:LRA=11 \
  -movflags +faststart \
  output.mp4
```

**VP9/Opus (WebM) - Modern Browsers**
```bash
ffmpeg -i input.mov \
  -c:v libvpx-vp9 -crf 30 -b:v 0 -row-mt 1 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -r 30 \
  -c:a libopus -b:a 128k -ar 48000 -ac 2 \
  -af loudnorm=I=-16:TP=-1.5:LRA=11 \
  output.webm
```

### Poster Image Generation

**WebP Format (Modern browsers)**
```bash
ffmpeg -i input.mp4 -ss 00:00:02 -vframes 1 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease" \
  -c:v libwebp -quality 80 \
  poster.webp
```

**PNG Fallback (Legacy browsers)**
```bash
ffmpeg -i input.mp4 -ss 00:00:02 -vframes 1 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease" \
  poster.png
```

---

## Caption Files (WebVTT)

All videos MUST include captions in both English and Hebrew for accessibility compliance (WCAG 2.1 AA).

### WebVTT Format Specification

```vtt
WEBVTT

00:00:00.000 --> 00:00:05.000
First caption line goes here.

00:00:05.000 --> 00:00:10.000
Second caption line.
```

### Caption Requirements

| Requirement | Specification |
|-------------|--------------|
| **Format** | WebVTT (.vtt) |
| **Encoding** | UTF-8 |
| **Line Length** | 42 characters maximum |
| **Display Duration** | 1-7 seconds per caption |
| **Reading Speed** | 160-180 words per minute |
| **Languages** | English (en) and Hebrew (he) required |

### Caption File Naming

```
hero-en.vtt              # English captions for hero video
hero-he.vtt              # Hebrew captions for hero video
ai-assistant-en.vtt      # English captions for AI demo
ai-assistant-he.vtt      # Hebrew captions for AI demo
voice-request-en.vtt     # English captions for voice request
voice-request-he.vtt     # Hebrew captions for voice request
voice-response-en.vtt    # English captions for voice response
voice-response-he.vtt    # Hebrew captions for voice response
```

---

## Quality Assurance Checklist

Before deploying any video asset, verify:

- [ ] Video resolution is 1920x1080 or lower
- [ ] Frame rate is 30fps
- [ ] Video bitrate is 3-5 Mbps (VBR)
- [ ] Audio bitrate is 128kbps
- [ ] Audio is normalized to -16 LUFS ± 1 LU
- [ ] File size is under limit for video type
- [ ] Both MP4 and WebM formats generated
- [ ] Poster image (WebP) generated at 2-second mark
- [ ] English captions (en.vtt) created
- [ ] Hebrew captions (he.vtt) created
- [ ] Captions tested in video player
- [ ] Video plays correctly in Chrome, Firefox, Safari
- [ ] Video displays properly on mobile devices
- [ ] Audio levels consistent with other portal videos

---

## Tools & Resources

### Required Software
- **FFmpeg 5.0+**: Video encoding and analysis
- **MediaInfo**: Verify video/audio specifications
- **VLC Media Player**: Test playback and captions

### FFmpeg Installation
```bash
# macOS (Homebrew)
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Verify installation
ffmpeg -version
```

### Verification Commands

**Check Video Specifications**
```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,bit_rate,codec_name \
  -of default=noprint_wrappers=1 \
  video.mp4
```

**Check Audio Loudness**
```bash
ffmpeg -i video.mp4 -af loudnorm=print_format=json -f null - 2>&1 | grep -A 12 "input_i"
```

**Check File Size**
```bash
du -h video.mp4
```

---

## Asset Delivery

All video assets MUST be delivered via CDN (Google Cloud Storage) with proper cache headers:

```
Cache-Control: public, max-age=31536000, immutable
Content-Type: video/mp4 (or video/webm)
```

### CDN Structure
```
gs://bayit-plus-portal-assets/
├── videos/
│   ├── hero/
│   │   ├── hero.mp4
│   │   ├── hero.webm
│   │   └── hero-poster.webp
│   ├── demo/
│   │   ├── ai-assistant.mp4
│   │   ├── ai-assistant.webm
│   │   └── ai-assistant-poster.webp
│   └── captions/
│       ├── hero-en.vtt
│       ├── hero-he.vtt
│       ├── ai-assistant-en.vtt
│       └── ai-assistant-he.vtt
```

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-21 | 1.0 | Initial specification | Voice Technician Agent |

---

## Contact

For questions about video encoding standards, contact the technical team or refer to this document.
