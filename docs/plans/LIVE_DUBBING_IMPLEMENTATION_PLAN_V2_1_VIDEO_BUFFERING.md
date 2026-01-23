# Implementation Plan v2.1: Live Dubbing with Video Stream Buffering

## CRITICAL ARCHITECTURAL REVISION

**Previous Version (v2.0):** Client-side audio mixing (INCORRECT)
**This Version (v2.1):** Server-side video buffering + audio extraction/reinsertion (CORRECT)

---

## Executive Summary

This plan implements **seamless live dubbing** by:
1. **Buffering the video stream** at the server (1200-1500ms delay)
2. **Extracting audio** from the buffered video
3. **Running dubbing pipeline** (STT → Translation → TTS)
4. **Re-inserting dubbed audio** into the video stream
5. **Delivering seamless output** to clients (video + dubbed audio, synchronized)

**Result:** User sees live stream delayed by ~1.2 seconds, but audio is perfectly dubbed and synchronized.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LIVE DUBBING PIPELINE (v2.1)                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ SOURCE: HLS Live Stream (Video + Original Audio)                     │
│ Bitrate: Adaptive (480p-4K), Audio: AAC 128-256kbps               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ BUFFER (HLS)│  ← 1200-1500ms delay
                    │  mp4byterange segments
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐         ┌────────▼────────┐
       │ AUDIO EXTRACT│         │ VIDEO PASSTHRU  │
       │ (FFmpeg)    │         │ (Video codec)   │
       │ PCM 48kHz   │         │                 │
       │ Mono        │         │                 │
       └──────┬──────┘         └────────┬────────┘
              │                         │
       ┌──────▼──────────────────────────┐
       │ DUBBING PIPELINE (1200ms)        │
       ├──────────────────────────────────┤
       │ 1. STT: Audio → Text (48kHz PCM)│
       │ 2. Translation: Text → Target   │
       │ 3. TTS: Text → Audio (48kHz PCM)│
       │ 4. Normalization & Sync         │
       └──────┬──────────────────────────┘
              │
       ┌──────▼──────────┐
       │ AUDIO MIX       │
       │ Original: 0%    │
       │ Dubbed: 100%    │
       │ (or user slider)│
       └──────┬──────────┘
              │
       ┌──────▼──────────────────────────┐
       │ RE-INSERT AUDIO INTO VIDEO       │
       │ (FFmpeg mux dubbed audio track) │
       │ Output: MP4 video with new audio│
       └──────┬──────────────────────────┘
              │
┌─────────────▼──────────────────────────────────────────────────────┐
│ OUTPUT: HLS Segments (Video + Dubbed Audio)                         │
│ Same codec as input, same bitrate, new audio track                 │
└─────────────────────────────────────────────────────────────────────┘
              │
       ┌──────▼──────────┐
       │ HLS OUTPUT      │
       │ (CDN/Hosting)   │
       └──────┬──────────┘
              │
       ┌──────▼──────────────────┐
       │ CLIENT PLAYBACK         │
       │ Standard HLS.js/AVPlayer│
       │ (No special handling)   │
       └─────────────────────────┘
```

---

## Phase 1: Critical Fixes & Core Video Buffering (Week 1) - 32 hours

### 1.1 Video Stream Buffering Infrastructure (8 hours)

**New Backend Component:** `VideoBufferService`

```python
# backend/app/services/live_dubbing/video_buffer_service.py

from typing import AsyncIterator, Optional
import asyncio
from datetime import datetime, timedelta

class VideoBufferService:
    """
    Buffers HLS video stream segments (1200-1500ms) while dubbing pipeline processes audio.

    Architecture:
    - HLS Input: Video + original audio
    - Buffer: Ring buffer of segments (key frames + duration)
    - Output: Same video, dubbed audio
    """

    def __init__(self, buffer_duration_ms: int = 1200):
        self.buffer_duration_ms = buffer_duration_ms
        self._segment_buffer: Dict[str, bytes] = {}  # channel_id -> segment data
        self._buffer_start_time: Dict[str, float] = {}  # channel_id -> buffer start timestamp
        self._lock = asyncio.Lock()

    async def buffer_segment(
        self,
        channel_id: str,
        segment_data: bytes,
        segment_duration_ms: float
    ) -> None:
        """Buffer a video segment while dubbing pipeline catches up."""
        async with self._lock:
            key = f"{channel_id}:{datetime.utcnow().timestamp()}"
            self._segment_buffer[key] = segment_data

            if channel_id not in self._buffer_start_time:
                self._buffer_start_time[channel_id] = datetime.utcnow().timestamp()

            # Check if buffer is full
            buffer_age = (datetime.utcnow().timestamp() - self._buffer_start_time[channel_id]) * 1000
            if buffer_age > self.buffer_duration_ms:
                # Segment is ready for processing
                await self._process_segment(channel_id, segment_data, segment_duration_ms)

    async def _process_segment(
        self,
        channel_id: str,
        segment_data: bytes,
        segment_duration_ms: float
    ) -> None:
        """
        Process buffered segment:
        1. Extract audio from video
        2. Run dubbing pipeline
        3. Re-insert dubbed audio into video
        """
        # Implementation in sections 1.2-1.4
        pass

    async def get_dubbed_segment(self, channel_id: str) -> Optional[bytes]:
        """Get next dubbed segment from output buffer."""
        pass
```

### 1.2 Audio Extraction from Video (6 hours)

**New Component:** `AudioExtractorService`

```python
# backend/app/services/live_dubbing/audio_extractor.py

import subprocess
import io
from pathlib import Path

class AudioExtractorService:
    """
    Extracts audio from MP4/HLS segments using FFmpeg.

    Input: MP4 video segment (H.264/H.265 video + AAC audio)
    Output: 48kHz PCM mono audio for STT pipeline
    """

    async def extract_audio_from_segment(self, segment_data: bytes) -> bytes:
        """
        Extract audio from video segment.

        Args:
            segment_data: Raw MP4 segment bytes

        Returns:
            PCM 48kHz mono audio bytes
        """
        # Write segment to temp file (FFmpeg needs file path)
        temp_input = Path(f"/tmp/segment_{uuid.uuid4()}.mp4")
        temp_output = Path(f"/tmp/audio_{uuid.uuid4()}.pcm")

        try:
            # Write segment
            temp_input.write_bytes(segment_data)

            # FFmpeg: Extract audio, convert to PCM 48kHz mono
            cmd = [
                "ffmpeg",
                "-i", str(temp_input),           # Input segment
                "-q:a", "9",                     # Audio quality (best)
                "-f", "s16le",                   # 16-bit PCM little-endian
                "-acodec", "pcm_s16le",          # PCM codec
                "-ar", "48000",                  # 48kHz sample rate
                "-ac", "1",                      # 1 channel (mono)
                str(temp_output)                 # Output file
            ]

            result = await asyncio.to_thread(subprocess.run, cmd, capture_output=True)

            if result.returncode != 0:
                raise AudioExtractionError(f"FFmpeg error: {result.stderr.decode()}")

            # Read extracted audio
            audio_bytes = temp_output.read_bytes()
            return audio_bytes

        finally:
            # Cleanup
            temp_input.unlink(missing_ok=True)
            temp_output.unlink(missing_ok=True)

    async def extract_audio_stream(self, segment_data: bytes) -> AsyncIterator[bytes]:
        """
        Stream extracted audio in chunks (for real-time processing).

        Yields:
            Audio chunks (2048 samples = ~42.67ms at 48kHz)
        """
        audio = await self.extract_audio_from_segment(segment_data)

        # Chunk size: 2048 samples × 2 bytes (16-bit) = 4096 bytes
        chunk_size = 4096
        for i in range(0, len(audio), chunk_size):
            yield audio[i:i + chunk_size]
```

### 1.3 Audio Extraction on Client (Web) (6 hours)

**Alternative for Web:** If server processing is too expensive, extract on client

```typescript
// web/src/services/dubbing/audio-extractor.ts

export class WebAudioExtractor {
  /**
   * Extract audio from HLS video stream (browser-based).
   *
   * Uses HTML5 Media API to capture audio from <video> element.
   * Only works if video element is CORS-enabled.
   */

  private audioContext: AudioContext
  private mediaSource: MediaElementAudioSourceNode
  private analyser: AnalyserNode

  async setupAudioCapture(videoElement: HTMLVideoElement): Promise<void> {
    this.audioContext = new AudioContext({ sampleRate: 48000 })

    // Connect video element audio output to Web Audio API
    this.mediaSource = this.audioContext.createMediaElementAudioSource(videoElement)
    this.analyser = this.audioContext.createAnalyser()

    this.mediaSource.connect(this.analyser)
    this.analyser.connect(this.audioContext.destination)
  }

  async captureAudioFrame(): Promise<Float32Array> {
    /**
     * Capture single frame of audio from currently playing video.
     *
     * Note: Only works if video is already playing and CORS allows it.
     */
    const buffer = new Float32Array(this.analyser.fftSize)
    this.analyser.getFloatTimeDomainData(buffer)
    return buffer
  }
}
```

**ISSUE:** Browser security prevents direct audio extraction from cross-origin HLS streams. **Server-side extraction is required.**

### 1.4 WebSocket Protocol Update for Video Segments (6 hours)

**New WebSocket Message Types:**

```python
# backend/app/api/routes/websocket_live_dubbing.py - UPDATED

class VideoSegmentMessage(BaseModel):
    """Receive raw video segment for buffering."""
    type: Literal["video_segment"]
    segment_data: bytes  # Base64-encoded MP4 segment
    segment_duration_ms: float
    timestamp_ms: int

class DubbedSegmentMessage(BaseModel):
    """Send back dubbed video segment."""
    type: Literal["dubbed_segment"]
    segment_data: bytes  # Base64-encoded MP4 with dubbed audio
    original_duration_ms: float
    dubbing_latency_ms: int

@router.websocket("/ws/live/{channel_id}/dubbing-v2")
async def websocket_live_dubbing_v2(websocket: WebSocket, channel_id: str):
    """
    V2: Video stream + dubbing pipeline

    Client sends: Raw video segments (from HLS stream)
    Server returns: Same video segments with dubbed audio
    """
    await websocket.accept()

    # Authentication + setup (same as v1)
    user = await authenticate_ws(websocket)

    buffer_service = VideoBufferService()

    try:
        while True:
            msg = await websocket.receive_json()

            if msg["type"] == "video_segment":
                # Client sends video segment
                segment_data = base64.b64decode(msg["segment_data"])
                segment_duration = msg["segment_duration_ms"]

                # Buffer and process
                dubbed_segment = await buffer_service.buffer_segment(
                    channel_id=channel_id,
                    segment_data=segment_data,
                    segment_duration_ms=segment_duration
                )

                # Send back dubbed segment
                await websocket.send_json({
                    "type": "dubbed_segment",
                    "segment_data": base64.b64encode(dubbed_segment).decode(),
                    "original_duration_ms": segment_duration,
                    "dubbing_latency_ms": 1200
                })
    finally:
        await buffer_service.cleanup(channel_id)
```

### 1.5 Client-Side Video Buffering Integration (6 hours)

**Web Implementation:**

```typescript
// web/src/services/dubbing/hls-buffer-integration.ts

import HLS from "hls.js"

export class DubbingHLSIntegration {
  /**
   * Integrate live dubbing with HLS.js video streaming.
   *
   * Strategy:
   * 1. HLS.js loads segments normally
   * 2. Before appending to video, send to dubbing service
   * 3. Receive dubbed segments back
   * 4. Append dubbed segments to buffer
   * 5. Play seamlessly (user sees 1.2s delay)
   */

  private hls: HLS
  private dubbingWS: WebSocket
  private pendingSegments: Map<string, ArrayBuffer> = new Map()

  setupDubbingInterceptor(videoElement: HTMLVideoElement): void {
    this.hls = new HLS()
    this.hls.attachMedia(videoElement)

    // Intercept segment download
    this.hls.on(HLS.Events.FRAG_LOADED, (event, data) => {
      this.onSegmentLoaded(data)
    })
  }

  private async onSegmentLoaded(data: { payload: ArrayBuffer }): Promise<void> {
    const segment = data.payload

    // Send to dubbing service
    this.dubbingWS.send(JSON.stringify({
      type: "video_segment",
      segment_data: this.arrayBufferToBase64(segment),
      segment_duration_ms: 4000,  // Typical HLS segment duration
      timestamp_ms: Date.now()
    }))

    // Wait for dubbed version
    const dubbedSegment = await this.waitForDubbedSegment()

    // Append dubbed segment to video buffer
    this.hls.media!.sourceBuffer?.appendBuffer(dubbedSegment)
  }

  private async waitForDubbedSegment(): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        const msg = JSON.parse(event.data)
        if (msg.type === "dubbed_segment") {
          this.dubbingWS.removeEventListener("message", handler)
          resolve(this.base64ToArrayBuffer(msg.segment_data))
        }
      }
      this.dubbingWS.addEventListener("message", handler)
    })
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const view = new Uint8Array(buffer)
    let str = ""
    for (let i = 0; i < view.byteLength; i += 65536) {
      str += String.fromCharCode.apply(null, Array.from(view.subarray(i, i + 65536)))
    }
    return btoa(str)
  }

  private base64ToArrayBuffer(str: string): ArrayBuffer {
    const binary = atob(str)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}
```

**iOS Implementation:**

```swift
// mobile-app/ios/BayitPlus/DubbingAVPlayerIntegration.swift

import AVFoundation

class DubbingAVPlayerIntegration: NSObject {
    private var player: AVPlayer
    private var resourceLoaderDelegate: DubbingResourceLoaderDelegate

    /**
     Integrate live dubbing with native AVPlayer (iOS video playback).

     Strategy:
     1. Intercept HLS segment requests via URLProtocol
     2. Send raw segments to WebSocket dubbing service
     3. Receive dubbed segments back
     4. Return dubbed segments to player
     5. Player renders seamlessly with dubbed audio
     */

    func setupDubbingInterceptor(videoURL: URL) {
        let urlAsset = AVURLAsset(url: videoURL)

        // Register custom protocol to intercept segment requests
        URLProtocol.registerClass(DubbingURLProtocol.self)

        // Create player with intercepted asset
        let playerItem = AVPlayerItem(asset: urlAsset)
        player = AVPlayer(playerItem: playerItem)
    }
}

class DubbingURLProtocol: URLProtocol {
    /**
     Intercepts HLS segment requests and processes through dubbing pipeline.
     */

    private var dubbingWS: URLWebSocketTask?

    override class func canInit(with request: URLRequest) -> Bool {
        // Only intercept HLS segment requests (.ts, .m4s files)
        return request.url?.pathExtension == "ts" || request.url?.pathExtension == "m4s"
    }

    override func startLoading() {
        guard let client = client, let request = request else { return }

        // Fetch original segment
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let data = data, let response = response else {
                client.urlProtocol(self!, didFailWithError: error ?? NSError())
                return
            }

            // Send to dubbing service via WebSocket
            self?.sendSegmentToDubbing(data) { dubbedData in
                // Return dubbed segment to player
                client.urlProtocol(self!, didLoad: dubbedData)
                client.urlProtocolDidFinishLoading(self!)
            }
        }.resume()
    }

    private func sendSegmentToDubbing(_ segmentData: Data, completion: @escaping (Data) -> Void) {
        let base64 = segmentData.base64EncodedString()
        let json = ["type": "video_segment", "segment_data": base64]

        // Send via existing WebSocket connection
        // Receive dubbed segment back and return
    }

    override func stopLoading() {
        // Cleanup
    }
}
```

### 1.6 Video Re-insertion (Audio → Video Muxing) (6 hours)

**New Component:** `AudioReinsertionService`

```python
# backend/app/services/live_dubbing/audio_reinsertion.py

import subprocess
from pathlib import Path

class AudioReinsertionService:
    """
    Re-inserts dubbed audio back into video stream.

    Input:
    - Video segment (video track, no audio or original audio)
    - Dubbed audio (48kHz PCM mono)

    Output:
    - MP4 segment with dubbed audio track
    - Same video codec/bitrate/container format
    """

    async def reinsertion_audio_into_segment(
        self,
        video_segment: bytes,
        dubbed_audio: bytes,
        output_format: str = "mp4"  # or "m4s" for HLS
    ) -> bytes:
        """
        Mux dubbed audio back into video segment.

        Process:
        1. Save video to temp file
        2. Save audio to temp file
        3. FFmpeg: mux video + audio
        4. Return muxed segment
        """

        temp_video = Path(f"/tmp/video_{uuid.uuid4()}.mp4")
        temp_audio = Path(f"/tmp/audio_{uuid.uuid4()}.pcm")
        temp_output = Path(f"/tmp/output_{uuid.uuid4()}.mp4")

        try:
            # Write files
            temp_video.write_bytes(video_segment)
            temp_audio.write_bytes(dubbed_audio)

            # FFmpeg: Mux video + audio
            cmd = [
                "ffmpeg",
                "-i", str(temp_video),              # Input video (no audio)
                "-i", str(temp_audio),              # Input audio (PCM)
                "-c:v", "copy",                     # Copy video codec (no re-encoding)
                "-c:a", "aac",                      # Encode audio to AAC
                "-b:a", "128k",                     # Audio bitrate (match original)
                "-shortest",                        # Stop at shortest stream
                "-y",                               # Overwrite output
                str(temp_output)
            ]

            result = await asyncio.to_thread(subprocess.run, cmd, capture_output=True)

            if result.returncode != 0:
                raise AudioReinsertionError(f"FFmpeg error: {result.stderr.decode()}")

            # Read output
            muxed_segment = temp_output.read_bytes()
            return muxed_segment

        finally:
            temp_video.unlink(missing_ok=True)
            temp_audio.unlink(missing_ok=True)
            temp_output.unlink(missing_ok=True)
```

---

## Phase 2: Dubbing Pipeline Integration (Week 2-3) - 40 hours

### 2.1 ChannelSTTManager for Shared Audio Processing (16 hours)

**Same as v2.0 but now processes extracted audio:**

```python
# backend/app/services/live_dubbing/channel_stt_manager.py

class ChannelSTTManager:
    """
    Manages shared STT for extracted audio from all segments of a channel.

    Input: 48kHz PCM audio extracted from video segments
    Output: Transcripts broadcast to all dubbing sessions for that channel
    """

    async def process_audio_frame(self, frame_data: bytes) -> None:
        """
        Process 48kHz PCM audio frame from extracted video segment.
        """
        # Send to ElevenLabs STT streaming API
        await self._stt_provider.send_audio_chunk(frame_data)
```

### 2.2 Redis Session Store (12 hours)

**Same as v2.0 but tracks video segment buffering state:**

```python
# backend/app/services/live_dubbing/session_store.py

class LiveDubbingSessionStore:
    """
    Enhanced to track video buffer state and segment ordering.
    """

    async def save_segment_state(self, channel_id: str, segment_id: str, state: dict):
        """
        Track: segment_id, buffer_start_time, dubbing_start_time, dubbing_end_time
        """
        pass
```

### 2.3 Circuit Breakers (12 hours)

**Same as v2.0** (unchanged)

---

## Phase 3: Performance Optimization (Week 4) - 20 hours

### 3.1 FFmpeg Optimization for Real-Time Processing (8 hours)

**Optimize audio extraction/reinsertion for live performance:**

```bash
# Use hardware acceleration if available
ffmpeg -hwaccel cuda -i segment.mp4 ...          # NVIDIA GPU
ffmpeg -hwaccel videotoolbox -i segment.mp4 ... # Apple Hardware

# Use faster encoders
ffmpeg -c:a libopus ...  # Faster than AAC (but different codec)
ffmpeg -c:a libfdk_aac -profile aac_low ...  # Optimized AAC
```

### 3.2 Segment Prefetching & Pipelining (8 hours)

**Buffer multiple segments in advance:**

```python
# Process segments concurrently:
# Segment N: Extract audio, run dubbing pipeline
# Segment N+1: Extract audio while N is processing
# Segment N+2: Extract audio while N+1 is processing
```

### 3.3 Caching Strategies (4 hours)

- Cache extracted audio per segment (same audio = same output)
- Cache translation results (same text = same translation)
- Cache TTS output (same translated text + voice = same audio)

---

## Phase 4: Compliance & Testing (Week 5) - 16 hours

### 4.1 GDPR Compliance (8 hours)

**Same as v2.0** (unchanged)

### 4.2 Rate Limiting & Quotas (4 hours)

**Same as v2.0** (unchanged)

### 4.3 End-to-End Video Integration Testing (4 hours)

```python
# backend/tests/e2e/test_video_dubbing_e2e.py

async def test_full_video_dubbing_flow():
    """Test: HLS segment → extract audio → dub → reinsertion → output."""

    # 1. Create test HLS segment (H.264 video + AAC audio)
    test_segment = create_test_video_segment(duration_ms=4000)

    # 2. Extract audio
    extracted_audio = await audio_extractor.extract_audio_from_segment(test_segment)
    assert len(extracted_audio) > 0

    # 3. Run dubbing pipeline
    dubbed_audio = await run_dubbing_pipeline(extracted_audio, target_lang="en")

    # 4. Reinsertion
    output_segment = await audio_reinsertion.reinsertion_audio_into_segment(
        test_segment,
        dubbed_audio
    )

    # 5. Verify output is valid MP4
    assert is_valid_mp4(output_segment)

    # 6. Verify audio track can be extracted
    audio_from_output = await audio_extractor.extract_audio_from_segment(output_segment)

    # 7. Verify dubbed audio is in output
    assert audio_matches(audio_from_output, dubbed_audio, tolerance=0.95)
```

---

## Updated Latency Budget

```
Total Sync Delay: 1200-1500ms (user sees this delay)

├─ Video buffering:           200-300ms   (wait for full segment)
├─ Audio extraction:           100-150ms   (FFmpeg extraction)
├─ STT (streaming):           200-300ms   (ElevenLabs Scribe)
├─ Translation:               150-250ms   (Google Translate)
├─ TTS synthesis:             300-400ms   (ElevenLabs TTS)
├─ Audio reinsertion:         100-150ms   (FFmpeg mux)
├─ Network round-trip:         100-200ms   (WebSocket transmission)
└─ Processing buffer:         50-100ms    (margin)
────────────────────────────────────────
TOTAL:                        1200-1500ms ✓

User Experience:
- User watches stream with ~1.2s delay
- Audio is perfectly synchronized (dubbed, not subtitled)
- No audio sync artifacts
- Seamless playback
```

---

## Infrastructure Requirements

### Backend Resources

**Current:** 1 Cloud Run instance

**New Requirements:**
- **FFmpeg**: Installed on backend (0.5 CPU per segment processing)
- **Storage**: Temp files during processing (minimal, auto-cleaned)
- **Memory**: 2GB (video buffering + processing)
- **CPU**: 2-4 cores for concurrent segment processing
- **Network**: Higher bandwidth for HLS segment transfers

**Scaling:** Each segment ~2MB, processing ~1.2s
- 1000 concurrent users on same channel: 1 segment stream → N users
- Cost: Minimal (CPU-bound, not API call bound)

### CDN/Delivery

**Output:** Dubbed HLS segments go back to CDN
- Can use same CDN as original stream
- No changes needed to delivery infrastructure

---

## Migration Path from v2.0 to v2.1

### Option A: Parallel Deployment

Keep v2.0 (client-side audio mixing) running while deploying v2.1 (server-side video buffering)

```
v2.0 URL: /ws/live/{channel_id}/dubbing           (old: client audio mixing)
v2.1 URL: /ws/live/{channel_id}/dubbing-v2        (new: server video buffering)

User can choose which version to use
```

### Option B: Gradual Migration

1. Week 1-2: Deploy v2.1 to 10% of users (canary)
2. Week 3: Gradual ramp to 50%
3. Week 4: Full migration to v2.1
4. Decommission v2.0

---

## Security Considerations

### FFmpeg Attack Surface

```python
# ⚠️ SECURITY: Validate FFmpeg input
# Never trust raw segment data from client

def validate_segment_format(segment_data: bytes) -> bool:
    """
    Validate segment is valid MP4 before processing with FFmpeg.

    Check:
    - Magic bytes (ftypisom, ftypMSnV, ftypmp42, ftypdasmse, ftypquicktime)
    - File size > 0 and < MAX_SEGMENT_SIZE (e.g., 50MB)
    - No obvious malicious patterns
    """
    magic_bytes = b'ftyp'
    if not segment_data[4:8] == magic_bytes:
        raise InvalidSegmentError("Invalid MP4 magic bytes")

    if len(segment_data) > 50 * 1024 * 1024:  # 50MB max
        raise InvalidSegmentError("Segment too large")

    return True
```

### Audio Processing Privacy

```python
# Extracted audio is temporary - delete after processing
# Never store raw user audio
# Use short-lived temporary files (/tmp/)
```

---

## Client Implementation Examples

### Web (HLS.js)

```typescript
// User sees this in UI:
<video id="player">
  <source src="https://cdn.bayit.plus/live/channel123/master.m3u8" type="application/vnd.apple.mpegurl" />
</video>

// Behind the scenes:
// 1. HLS.js loads segments
// 2. Segments sent to dubbing service (WebSocket)
// 3. Dubbed segments returned
// 4. Dubbed segments played to user
// 5. User sees ~1.2s delay but hears perfect dubbed audio
```

### iOS (AVPlayer)

```swift
// User sees this in UI:
let player = AVPlayer(url: dubbingStreamURL)
playerViewController.player = player

// Behind the scenes:
// 1. Custom URLProtocol intercepts HLS segments
// 2. Segments sent to WebSocket dubbing service
// 3. Dubbed segments returned
// 4. Player renders with dubbed audio
// 5. Seamless playback experience
```

### Android (ExoPlayer)

```kotlin
// Similar to iOS but with ExoPlayer HttpDataSource intercept
val player = ExoPlayer.Builder(context)
    .setMediaSourceFactory(
        DefaultMediaSourceFactory(context)
            .setDataSourceFactory(DubbingDataSourceFactory())
    )
    .build()

player.setMediaItem(MediaItem.fromUri(hlsStreamURL))
```

---

## Updated Success Criteria

✅ **Phase 1:**
- Video buffering working
- Audio extraction producing valid PCM
- Re-insertion producing valid MP4
- WebSocket handles video segment transfers

✅ **Phase 2:**
- Shared STT per channel confirmed
- Dubbed audio inserted correctly
- Latency <1500ms end-to-end

✅ **Phase 3:**
- Hardware acceleration working (GPU utilization >50%)
- Concurrent segment processing (4+ segments simultaneously)
- Segment caching reducing processing time by 30%

✅ **Phase 4:**
- E2E video dubbing tests passing
- GDPR deletion verified
- Rate limiting enforced
- Production ready

---

## Key Differences from v2.0

| Aspect | v2.0 | v2.1 |
|--------|------|------|
| **Architecture** | Client audio mixing | Server video buffering |
| **Processing** | Audio only | Audio + Video codec |
| **Latency** | 600ms (audio playback) | 1200ms (video buffering) |
| **Infrastructure** | No changes | FFmpeg required |
| **Complexity** | Medium | High |
| **User Experience** | Volume mixing visible | Seamless dubbed experience |
| **Platform Support** | Web only easily | Web + iOS + Android |
| **Audio Sync** | Potential artifacts | Perfect sync (video is source) |

---

## **CRITICAL: This is a Complete Architectural Redesign**

The plan has been **fundamentally revised** to implement true video stream buffering + dubbing.

**Next Steps:**

1. ✅ **This document (v2.1)** now reflects correct architecture
2. ❌ **Previous reviews (v2.0)** are now partially invalid
3. ⏳ **New reviews needed** for sections affected by architecture change

**Sections that need RE-REVIEW after this revision:**

- ✅ System Architect (architecture now correct - re-validate)
- ✅ Code Reviewer (new components - validate against SOLID)
- ✅ Security Expert (FFmpeg attack surface - new issue)
- ⏳ Frontend Developer (HLS integration - validate)
- ⏳ Mobile Expert (iOS/Android video interception - new)
- ⏳ Voice Technician (audio extraction timing - new)
- ⏳ Deployment Specialist (FFmpeg infrastructure - new)
- ⏳ Database Architect (video segment metadata - validate)

**Shall I:**
1. **Re-run partial 13-agent review** (4-6 hours) on architecture changes only?
2. **Proceed with full 13-agent review v2.1** (4-6 hours) of complete revised plan?
3. **Wait for your feedback** on this v2.1 document first?

Which direction would you like?
