# Shared Video Assets

This directory contains shared video assets used across all Bayit+ platforms (web, mobile, TV).

## Directory Structure

```
video/
├── README.md           # This file
└── intro/              # App intro/splash videos
    ├── Bayit_Intro_English.mp4   # English intro video
    ├── Bayit_Intro_Hebrew.mp4    # Hebrew intro video
    └── Bayit_Intro_Spanish.mp4   # Spanish intro video (optional)
```

## Intro Videos

**Location:** `shared/assets/video/intro/`

**Expected files:**
- `Bayit_Intro_English.mp4` - English language intro
- `Bayit_Intro_Hebrew.mp4` - Hebrew language intro
- `Bayit_Intro_Spanish.mp4` - Spanish language intro (defaults to English if missing)

### Specifications

**Video Format:**
- Format: MP4 (H.264)
- Resolution: 1920x1080 (Full HD) recommended
- Aspect Ratio: 16:9
- Duration: 3-5 seconds recommended
- Audio: Included (with audio permission handling)

**File Size:**
- Target: < 5MB per video
- Keep videos short and optimized for fast loading

### Usage

These videos are displayed as splash screens on app startup. The app:
1. Detects user's language (Hebrew, English, Spanish)
2. Loads the corresponding intro video
3. Falls back to English if language-specific video not found
4. Gracefully handles missing videos (shows slogan instead)

### Platform Access

All platforms access these videos via symlinks:

**Web:**
- Symlink: `web/public/assets/video` → `shared/assets/video`
- URL: `/assets/video/intro/Bayit_Intro_English.mp4`

**Mobile (iOS/Android):**
- TBD: Asset bundling configuration

**TV (tvOS/Tizen/webOS):**
- TBD: Asset bundling configuration

## Adding New Videos

1. Place video files in this directory: `shared/assets/video/intro/`
2. Follow naming convention: `Bayit_Intro_{Language}.mp4`
3. Optimize videos for web delivery (compress, reduce bitrate if needed)
4. Test on all platforms (web, mobile, TV)

## Video Creation Guidelines

**Content:**
- Brand-appropriate (Bayit+ logo, colors, theme)
- Professional quality
- No copyrighted music/content
- Multilingual versions should match in length and style

**Technical:**
- Use H.264 codec for maximum compatibility
- AAC audio codec
- Progressive download (not streaming)
- Test autoplay with audio (requires user interaction on some platforms)

## Current Status

**Missing Videos:** All intro videos are currently missing.

**To Add Videos:**
```bash
# Navigate to intro directory
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/shared/assets/video/intro/

# Add your video files
# Example: Bayit_Intro_English.mp4, Bayit_Intro_Hebrew.mp4

# Videos are immediately available to all platforms via symlinks
```

## Version History

- **2026-01-23**: Created shared video assets structure with symlinks
  - Web platform symlinked to shared assets
  - Intro video directory structure established
  - Documentation created
