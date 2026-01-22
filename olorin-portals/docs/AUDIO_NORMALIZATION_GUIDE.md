# Audio Normalization Guide

## Overview

All video assets in the Olorin streaming portal MUST have normalized audio to ensure consistent volume levels across all content. This prevents jarring volume changes when users switch between videos.

**Target Standard**: -16 LUFS (Loudness Units relative to Full Scale)
**Industry**: Broadcast television standard (EBU R128, ATSC A/85)

---

## Why Audio Normalization Matters

### User Experience Issues Without Normalization
- User adjusts volume for quiet video
- Next video plays much louder → startles user
- User must constantly adjust volume
- Poor professional impression
- Accessibility issue (especially for voice demos)

### Business Impact
- Increased bounce rate (users leave due to poor UX)
- Negative brand perception
- WCAG compliance failure for accessibility

---

## Audio Standards

| Parameter | Target Value | Tolerance | Rationale |
|-----------|--------------|-----------|-----------|
| **Integrated Loudness (I)** | -16 LUFS | ±1 LU | Broadcast standard, comfortable listening |
| **True Peak (TP)** | -1.5 dBTP | Max | Prevents clipping/distortion |
| **Loudness Range (LRA)** | 11 LU | ±2 LU | Dynamic range control |

### What is LUFS?
**LUFS** (Loudness Units relative to Full Scale) measures perceived loudness, not just peak levels. Two videos with the same peak volume can sound dramatically different in perceived loudness.

---

## Required Tools

### FFmpeg (Required)
**Install**:
```bash
# macOS (Homebrew)
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Verify installation
ffmpeg -version
```

### Optional Tools
- **Audacity**: Free audio editor with loudness analysis
- **Adobe Audition**: Professional audio editing (paid)
- **Reaper**: Digital audio workstation with loudness meter (free trial)

---

## Audio Measurement Process

### Step 1: Measure Current Levels

Run this command for each video file:

```bash
ffmpeg -i hero.mp4 -af loudnorm=print_format=json -f null - 2>&1 | grep -A 12 "input_i"
```

**Expected Output**:
```json
{
  "input_i" : "-18.50",
  "input_tp" : "-2.10",
  "input_lra" : "9.80",
  "input_thresh" : "-28.90",
  "output_i" : "-16.00",
  "output_tp" : "-1.50",
  "output_lra" : "11.00",
  "output_thresh" : "-26.50",
  "normalization_type" : "dynamic",
  "target_offset" : "2.50"
}
```

### Step 2: Interpret Results

| Measurement | Current | Target | Action Needed |
|-------------|---------|--------|---------------|
| **input_i** | -18.50 LUFS | -16.0 LUFS | ✅ Increase loudness by 2.5 LU |
| **input_i** | -14.00 LUFS | -16.0 LUFS | ✅ Decrease loudness by 2.0 LU |
| **input_i** | -16.50 LUFS | -16.0 LUFS | ✅ Minor adjustment (0.5 LU) |
| **input_i** | -15.80 LUFS | -16.0 LUFS | ✅ Within tolerance (±1 LU) |

### Step 3: Document Current State

Create a spreadsheet to track all videos:

| Video File | Current LUFS | Target LUFS | Adjustment Needed | Status |
|------------|--------------|-------------|-------------------|--------|
| hero.mp4 | -18.50 | -16.00 | +2.50 LU | ⏳ Needs normalization |
| ai-assistant.mp4 | -14.20 | -16.00 | -1.80 LU | ⏳ Needs normalization |
| voice-request.mp4 | -17.10 | -16.00 | +1.10 LU | ⏳ Needs normalization |
| voice-response.mp4| -15.90 | -16.00 | +0.10 LU | ✅ Within tolerance |

---

## Audio Normalization Process

### Two-Pass Normalization (Recommended)

**Why Two-Pass?** Analyzes entire video first, then applies precise normalization.

#### Pass 1: Analyze Audio
```bash
ffmpeg -i input.mp4 -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 > analysis.json
```

#### Pass 2: Apply Normalization
```bash
ffmpeg -i input.mp4 \
  -af loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=-18.50:measured_TP=-2.10:measured_LRA=9.80:measured_thresh=-28.90:offset=2.50 \
  -c:v copy \
  -c:a aac -b:a 128k \
  output-normalized.mp4
```

**Replace measured values** with actual values from Pass 1 analysis.

### Single-Pass Normalization (Quick Method)

```bash
ffmpeg -i input.mp4 \
  -af loudnorm=I=-16:TP=-1.5:LRA=11 \
  -c:v copy \
  -c:a aac -b:a 128k \
  output-normalized.mp4
```

**Note**: Single-pass is faster but less accurate than two-pass.

---

## Batch Processing All Videos

### Bash Script for All Videos

```bash
#!/bin/bash

# Audio normalization script for Olorin streaming portal
# Target: -16 LUFS with -1.5 dBTP true peak

VIDEOS=(
  "hero"
  "ai-assistant"
  "voice-request"
  "voice-response"
)

for video in "${VIDEOS[@]}"; do
  echo "Processing: $video.mp4"

  # Pass 1: Measure loudness
  ffmpeg -i "$video.mp4" \
    -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json \
    -f null - 2>&1 | tee "${video}_analysis.json"

  # Extract measured values (manual step - see JSON output)
  # For automation, parse JSON with jq:
  # measured_i=$(jq -r '.input_i' "${video}_analysis.json")
  # measured_tp=$(jq -r '.input_tp' "${video}_analysis.json")
  # measured_lra=$(jq -r '.input_lra' "${video}_analysis.json")
  # measured_thresh=$(jq -r '.input_thresh' "${video}_analysis.json")
  # offset=$(jq -r '.target_offset' "${video}_analysis.json")

  # Pass 2: Apply normalization (adjust measured values from Pass 1)
  ffmpeg -i "$video.mp4" \
    -af loudnorm=I=-16:TP=-1.5:LRA=11 \
    -c:v copy \
    -c:a aac -b:a 128k -ar 48000 \
    "${video}_normalized.mp4"

  echo "✅ Completed: $video.mp4 → ${video}_normalized.mp4"
done

echo "🎉 All videos normalized to -16 LUFS"
```

### Save Script
```bash
chmod +x normalize-videos.sh
./normalize-videos.sh
```

---

## Verification After Normalization

### Re-Measure Normalized Videos
```bash
for video in hero ai-assistant voice-request voice-response; do
  echo "=== $video-normalized.mp4 ==="
  ffmpeg -i "${video}-normalized.mp4" \
    -af loudnorm=print_format=json \
    -f null - 2>&1 | grep "input_i"
done
```

### Expected Results
All videos should show:
```
"input_i" : "-16.00"  (or within ±1.0 LU)
```

### Acceptance Criteria
- [ ] All videos within -15.0 to -17.0 LUFS
- [ ] No true peaks above -1.5 dBTP
- [ ] Loudness range (LRA) between 9-13 LU
- [ ] No audible distortion or clipping
- [ ] Consistent perceived volume across all videos

---

## Quality Assurance Checklist

### 1. Technical Validation
```bash
# Check all normalized videos
for video in *-normalized.mp4; do
  echo "Checking: $video"
  ffprobe -v error -select_streams a:0 \
    -show_entries stream=codec_name,sample_rate,bit_rate \
    -of default=noprint_wrappers=1 \
    "$video"
done
```

Expected output:
```
codec_name=aac
sample_rate=48000
bit_rate=128000
```

### 2. Subjective Testing
- [ ] Play all videos in sequence
- [ ] Verify no volume jumps between videos
- [ ] Check for audio distortion (clipping)
- [ ] Confirm dialogue clarity (not too quiet)
- [ ] Test on different devices (desktop, mobile, headphones)

### 3. A/B Comparison
```bash
# Compare original vs normalized side-by-side
ffplay -i original.mp4  # Play original
ffplay -i normalized.mp4  # Play normalized
```

Listen for:
- Consistent volume level
- No introduced artifacts
- Clear dialogue
- Appropriate dynamic range

---

## Common Issues & Solutions

| Issue | Symptoms | Cause | Solution |
|-------|----------|-------|----------|
| **Audio Clipping** | Distortion, crackling | True peak > -1.5 dBTP | Lower true peak target to -2.0 dBTP |
| **Too Quiet** | User must increase volume | Target too low | Re-normalize to -14 LUFS (streaming standard) |
| **Too Loud** | Harsh, fatiguing | Target too high | Re-normalize to -18 LUFS (quieter) |
| **Pumping Effect** | Volume fluctuates | Aggressive compression | Increase LRA target to 13-15 LU |
| **Lost Dynamics** | Flat, lifeless sound | LRA too low | Increase LRA target, use two-pass method |

---

## Platform-Specific Targets

Different platforms have different loudness standards:

| Platform | Target LUFS | Notes |
|----------|-------------|-------|
| **YouTube** | -14 LUFS | Streaming optimized |
| **Spotify** | -14 LUFS | Music standard |
| **Netflix** | -27 LUFS | Cinema-style dynamic range |
| **Broadcast TV** | -23 LUFS | EBU R128 (Europe) |
| **Online Video** | -16 LUFS | **Our target** (comfortable) |

**Recommendation**: Stick with -16 LUFS for general web video content.

---

## Advanced Normalization Options

### Preserve More Dynamic Range
```bash
ffmpeg -i input.mp4 \
  -af loudnorm=I=-16:TP=-1.5:LRA=15 \
  -c:v copy -c:a aac -b:a 128k \
  output.mp4
```
**Use for**: Music videos, cinematic content

### More Aggressive Compression
```bash
ffmpeg -i input.mp4 \
  -af loudnorm=I=-16:TP=-1.5:LRA=7 \
  -c:v copy -c:a aac -b:a 128k \
  output.mp4
```
**Use for**: Voice-only content, podcasts

---

## File Naming Convention

```
original/
├── hero.mp4
├── ai-assistant.mp4
├── voice-request.mp4
└── voice-response.mp4

normalized/
├── hero-normalized.mp4
├── ai-assistant-normalized.mp4
├── voice-request-normalized.mp4
└── voice-response-normalized.mp4

analysis/
├── hero-analysis.json
├── ai-assistant-analysis.json
├── voice-request-analysis.json
└── voice-response-analysis.json
```

---

## Production Deployment

### Pre-Deployment Checklist
- [ ] All videos measured (current LUFS documented)
- [ ] All videos normalized to -16 LUFS ±1 LU
- [ ] Normalized videos re-measured for verification
- [ ] Subjective listening test passed
- [ ] No clipping or distortion detected
- [ ] Original files backed up (never delete originals!)

### Deployment Steps
1. Upload normalized videos to Google Cloud Storage
   ```bash
   gsutil cp *-normalized.mp4 gs://bayit-plus-portal-assets/videos/
   ```

2. Update environment variables with new file paths
   ```bash
   REACT_APP_VIDEO_HERO_WEBM_URL=...hero-normalized.webm
   REACT_APP_VIDEO_HERO_MP4_URL=...hero-normalized.mp4
   ```

3. Test in staging environment
   - Play all videos in sequence
   - Verify consistent volume
   - Check on multiple devices

4. Deploy to production
   - Monitor user feedback
   - Check analytics for video engagement
   - Be ready to roll back if issues arise

---

## Monitoring & Maintenance

### Post-Launch Checks
- [ ] User feedback: "Videos too loud/quiet?"
- [ ] Analytics: Video completion rates
- [ ] Support tickets: Audio quality complaints

### Future Video Uploads
For every new video added:
1. Measure current loudness
2. Normalize to -16 LUFS
3. Verify with re-measurement
4. Add to production with same process

---

## Resources

- [EBU R128 Loudness Standard](https://tech.ebu.ch/docs/r/r128.pdf)
- [FFmpeg Loudnorm Documentation](https://ffmpeg.org/ffmpeg-filters.html#loudnorm)
- [Understanding LUFS](https://www.masteringthemix.com/blogs/learn/what-are-lufs)
- [Broadcast Loudness Guidelines](https://www.atsc.org/atsc-documents/a85-techniques-establishing-maintaining-audio-loudness/)

---

## Quick Reference Commands

```bash
# Measure loudness
ffmpeg -i video.mp4 -af loudnorm=print_format=json -f null - 2>&1 | grep "input_i"

# Normalize to -16 LUFS
ffmpeg -i input.mp4 -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:v copy -c:a aac -b:a 128k output.mp4

# Verify normalization
ffmpeg -i normalized.mp4 -af loudnorm=print_format=json -f null - 2>&1 | grep "input_i"

# Batch process
for f in *.mp4; do ffmpeg -i "$f" -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:v copy -c:a aac -b:a 128k "${f%.mp4}-normalized.mp4"; done
```

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-21 | 1.0 | Initial audio normalization guide | Voice Technician Fixes |
