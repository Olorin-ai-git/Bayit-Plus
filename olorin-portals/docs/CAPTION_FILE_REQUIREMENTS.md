# Caption File Requirements

## Overview

All videos in the Olorin streaming portal MUST include captions in both English and Hebrew for WCAG 2.1 AA compliance and accessibility.

---

## Required Caption Files

### Hero Video
- **English**: `videos/captions/hero-en.vtt`
- **Hebrew**: `videos/captions/hero-he.vtt`

### AI Assistant Demo
- **English**: `videos/captions/ai-assistant-en.vtt`
- **Hebrew**: `videos/captions/ai-assistant-he.vtt`

### Voice Request Demo
- **English**: `videos/captions/voice-request-en.vtt`
- **Hebrew**: `videos/captions/voice-request-he.vtt`

### Voice Response Demo
- **English**: `videos/captions/voice-response-en.vtt`
- **Hebrew**: `videos/captions/voice-response-he.vtt`

**Total**: 8 caption files (4 videos × 2 languages)

---

## WebVTT Format Specification

### File Header
```vtt
WEBVTT

00:00:00.000 --> 00:00:05.000
First caption line goes here.

00:00:05.000 --> 00:00:10.000
Second caption line.
```

### Formatting Rules

| Rule | Specification | Example |
|------|---------------|---------|
| **File Encoding** | UTF-8 with BOM | Save as UTF-8 |
| **Line Length** | 42 characters maximum | Break long sentences |
| **Display Duration** | 1-7 seconds per caption | `00:00:00.000 --> 00:00:05.000` |
| **Reading Speed** | 160-180 words per minute | ~3 words/second |
| **Timestamp Format** | `HH:MM:SS.mmm` | `00:01:23.500` |

### Example English Caption File

```vtt
WEBVTT

00:00:00.000 --> 00:00:03.500
Welcome to Bayit Plus,
Israel's premier streaming platform.

00:00:03.500 --> 00:00:07.000
Watch Israeli movies, live TV,
and radio from anywhere in the world.

00:00:07.000 --> 00:00:10.500
With AI-powered Hebrew search
and personalized recommendations.

00:00:10.500 --> 00:00:14.000
Available on all your devices:
iOS, Android, Web, and Smart TVs.
```

### Example Hebrew Caption File

```vtt
WEBVTT

00:00:00.000 --> 00:00:03.500
ברוכים הבאים לבית פלוס,
פלטפורמת הסטרימינג הישראלית המובילה.

00:00:03.500 --> 00:00:07.000
צפו בסרטים ישראלים, טלוויזיה חיה,
ורדיו מכל מקום בעולם.

00:00:07.000 --> 00:00:10.500
עם חיפוש חכם בעברית
והמלצות מותאמות אישית.

00:00:10.500 --> 00:00:14.000
זמין על כל המכשירים שלכם:
iOS, Android, Web, וטלוויזיות חכמות.
```

---

## Caption Creation Workflow

### Step 1: Transcription

1. **Watch the video** and note all spoken words
2. **Identify sound effects** that are important for understanding (e.g., "[Music playing]")
3. **Mark speaker changes** if multiple people speak
4. **Note timing** of each dialogue segment

### Step 2: Timing

1. **Start time**: When the speaker begins talking
2. **End time**: When the caption should disappear (allow reading time)
3. **Rule of thumb**: 3-4 seconds minimum per caption
4. **Overlap**: Avoid overlapping captions

### Step 3: Formatting

1. **Break long sentences** into multiple captions
2. **Max 2 lines** per caption
3. **42 characters per line** (including spaces)
4. **Natural breaks** at punctuation marks

### Step 4: Validation

Use the caption validation checklist:
- [ ] File starts with `WEBVTT` header
- [ ] UTF-8 encoding with BOM
- [ ] All timestamps in correct format (`HH:MM:SS.mmm`)
- [ ] No caption longer than 7 seconds
- [ ] No line longer than 42 characters
- [ ] Reading speed 160-180 words/minute
- [ ] Timestamps don't overlap
- [ ] All important dialogue captioned
- [ ] Sound effects noted in brackets (e.g., `[Music]`)

---

## Tools for Caption Creation

### Subtitle Edit (Free, Windows/Mac/Linux)
**Download**: https://www.nikse.dk/subtitleedit

**Features**:
- Visual waveform for precise timing
- Auto-sync capabilities
- Spell check in multiple languages
- Export to WebVTT format

### Aegisub (Free, Cross-platform)
**Download**: http://www.aegisub.org/

**Features**:
- Advanced timing controls
- Real-time preview
- Style editor
- WebVTT export

### YouTube Auto-Captions (Free, requires upload)
**Steps**:
1. Upload video to YouTube (unlisted)
2. Wait for auto-captions to generate
3. Edit auto-captions for accuracy
4. Download as .vtt file

**Note**: Auto-captions require manual editing for accuracy.

---

## Quality Assurance Process

### 1. Technical Validation
```bash
# Check file encoding
file -I hero-en.vtt
# Should output: hero-en.vtt: text/plain; charset=utf-8

# Validate WebVTT syntax
vtt-validate hero-en.vtt
```

### 2. Manual Review
- [ ] Play video with captions enabled
- [ ] Verify all dialogue is captioned
- [ ] Check timing accuracy (captions sync with speech)
- [ ] Confirm readability (not too fast)
- [ ] Test in actual video player (browser)

### 3. Language Review
- [ ] **English**: Native English speaker reviews for accuracy
- [ ] **Hebrew**: Native Hebrew speaker reviews for accuracy
- [ ] Check for typos and grammar errors
- [ ] Verify technical terms are correct

---

## Deployment Checklist

Before deploying caption files to CDN:

- [ ] All 8 caption files created (4 English + 4 Hebrew)
- [ ] Files validated with vtt-validate tool
- [ ] UTF-8 encoding verified
- [ ] Manual review completed for all files
- [ ] Files uploaded to Google Cloud Storage
  - Path: `gs://bayit-plus-portal-assets/videos/captions/`
- [ ] CDN URLs added to environment variables
  - File: `.env.production`
- [ ] Test in production environment
  - Verify captions load in video player
  - Test language switching (English ↔ Hebrew)
  - Confirm default language matches user preference

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Captions don't appear** | Wrong file path or CORS | Check CDN URL, verify CORS headers |
| **Garbled Hebrew text** | Encoding not UTF-8 | Re-save file as UTF-8 with BOM |
| **Captions out of sync** | Incorrect timestamps | Adjust timing in subtitle editor |
| **Captions too fast** | Display duration too short | Increase end time by 1-2 seconds |
| **Overlapping captions** | Timestamps overlap | Ensure end time < next start time |

---

## Example Production URLs

```bash
# English Captions
REACT_APP_VIDEO_HERO_CAPTIONS_EN=https://storage.googleapis.com/bayit-plus-portal-assets/videos/captions/hero-en.vtt
REACT_APP_VIDEO_AI_CAPTIONS_EN=https://storage.googleapis.com/bayit-plus-portal-assets/videos/captions/ai-assistant-en.vtt
REACT_APP_VIDEO_VOICE_REQUEST_CAPTIONS_EN=https://storage.googleapis.com/bayit-plus-portal-assets/videos/captions/voice-request-en.vtt
REACT_APP_VIDEO_VOICE_RESPONSE_CAPTIONS_EN=https://storage.googleapis.com/bayit-plus-portal-assets/videos/captions/voice-response-en.vtt

# Hebrew Captions
REACT_APP_VIDEO_HERO_CAPTIONS_HE=https://storage.googleapis.com/bayit-plus-portal-assets/videos/captions/hero-he.vtt
REACT_APP_VIDEO_AI_CAPTIONS_HE=https://storage.googleapis.com/bayit-plus-portal-assets/videos/captions/ai-assistant-he.vtt
REACT_APP_VIDEO_VOICE_REQUEST_CAPTIONS_HE=https://storage.googleapis.com/bayit-plus-portal-assets/videos/captions/voice-request-he.vtt
REACT_APP_VIDEO_VOICE_RESPONSE_CAPTIONS_HE=https://storage.googleapis.com/bayit-plus-portal-assets/videos/captions/voice-response-he.vtt
```

---

## Testing Caption Files

### Browser Testing
```html
<!-- Test caption file in browser -->
<video controls>
  <source src="video.mp4" type="video/mp4">
  <track kind="captions" src="captions-en.vtt" srclang="en" label="English" default>
  <track kind="captions" src="captions-he.vtt" srclang="he" label="עברית">
</video>
```

### Command-Line Testing
```bash
# Preview captions with FFmpeg
ffmpeg -i video.mp4 -vf subtitles=captions-en.vtt preview.mp4
```

---

## Priority Order for Caption Creation

1. **Hero Video** (highest priority) - First impression, most views
2. **AI Assistant Demo** - Key differentiator feature
3. **Voice Request Demo** - Accessibility showcase
4. **Voice Response Demo** - Accessibility showcase

---

## Resources

- [WebVTT Specification](https://www.w3.org/TR/webvtt1/)
- [WCAG 2.1 Caption Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html)
- [Caption Best Practices (BBC)](https://bbc.github.io/subtitle-guidelines/)
- [YouTube Caption Style Guide](https://support.google.com/youtube/answer/2734796)

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-21 | 1.0 | Initial caption requirements | Voice Technician Fixes |
