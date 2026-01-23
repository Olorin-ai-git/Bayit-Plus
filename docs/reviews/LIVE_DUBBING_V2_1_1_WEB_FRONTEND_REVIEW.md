# Live Dubbing Implementation Plan v2.1.1 - WEB FRONTEND REVIEW
## Frontend Developer - Web Specialist Assessment

**Reviewer**: Frontend Developer (Web Specialist)
**Date**: 2026-01-23
**Plan Version**: v2.1.1 FINAL
**Review Focus**: Web frontend implementation, HLS.js integration, React/TypeScript patterns

---

## APPROVAL STATUS: ⚠️ CONDITIONAL APPROVAL

The plan has strong architectural foundations but requires critical web-specific updates before implementation.

---

## EXECUTIVE SUMMARY

### Strengths
✅ Security-first approach with FFmpeg hardening and input validation
✅ Solid SOLID principles with service separation
✅ Cross-platform architecture (iOS/Web/Android/tvOS)
✅ Good UX transparency planning with delay indicators
✅ Infrastructure as Code with Terraform

### Critical Issues Requiring Resolution
❌ **CRITICAL**: HLS.js segment interception architecture is **MISSING** - Plan assumes URLProtocol approach that doesn't exist for web
❌ **CRITICAL**: Base64 encoding overhead not addressed - 33% bandwidth inflation is unacceptable
❌ **HIGH**: Glass Components library missing from plan - `@bayit/glass` not referenced but is mandatory per CLAUDE.md
❌ **HIGH**: TypeScript types incomplete - Missing critical interfaces for segment handling
❌ **HIGH**: CSS styling approach incorrect - Plan shows `StyleSheet.create()` for web (React Native only)
❌ **MEDIUM**: Accessibility requirements not specified
❌ **MEDIUM**: Performance budgets not defined for Core Web Vitals

---

## 1. HLS.JS INTEGRATION ARCHITECTURE ASSESSMENT

### Current Plan Analysis
The plan (Section 1.4.1, lines 731-751) shows:

```typescript
// ❌ INCORRECT - This is placeholder pseudo-code, not actual HLS.js implementation
export class URLProtocolDubbingIntegration {
    async startInterception(videoElement: HTMLVideoElement): Promise<void> {
        // HLS.js on web: Hook beforeSegmentRequest
        this.hls.on(Hls.Events.FRAG_LOADING, (data) => {
            this.sendToDubbingService(data.frag.url)
        })
    }
}
```

**Problem**: This is a **placeholder comment**, not working code. The plan does not specify:
1. How to intercept segment data (not just URLs)
2. How to modify/replace segment data in HLS.js
3. How to handle buffering while waiting for dubbed segments
4. How to prevent playback stalls

### Existing Implementation Review
The codebase already has `liveDubbingService.ts` (lines 1-566) which:
- ✅ Captures audio from video element via `captureStream()` API
- ✅ Sends PCM audio to WebSocket for dubbing
- ✅ Plays back dubbed audio in parallel with video
- ✅ Uses AudioWorklet for capture (modern, performant)
- ✅ Implements Lanczos downsampling (40dB stopband attenuation)

However, `useVideoPlayer.ts` (lines 92-134) shows HLS.js initialization WITHOUT segment interception:

```typescript
// Current implementation - NO segment interception
if (Hls.isSupported() && currentStreamUrl.includes('.m3u8')) {
  const hls = new Hls({
    enableWorker: true,
    lowLatencyMode: isLive,
  })
  hlsRef.current = hls
  hls.loadSource(currentStreamUrl)
  hls.attachMedia(video)
  // No FRAG_LOADING or FRAG_LOADED hooks registered
}
```

### Required HLS.js Integration Architecture

**RECOMMENDATION**: The plan needs a complete HLS.js segment interception architecture:

```typescript
/**
 * HLS.js Segment Interception for Live Dubbing
 * Intercepts segment loading and injects dubbed audio
 */
interface HLSDubbingConfig {
  channelId: string
  targetLanguage: string
  videoElement: HTMLVideoElement
  onBufferHealth: (health: number) => void
  onLatency: (latencyMs: number) => void
}

class HLSDubbingInterceptor {
  private hls: Hls
  private dubbingService: DubbingSegmentService
  private segmentBuffer: Map<number, DubbedSegment> = new Map()
  private currentSequence = 0

  /**
   * CRITICAL: HLS.js segment interception architecture
   *
   * Approaches:
   * 1. FRAG_LOADING hook: Intercept before fetch (modify request)
   * 2. xhrSetup: Custom XHR configuration (deprecated in HLS.js 1.x)
   * 3. Custom Loader: Replace default fragment loader
   *
   * RECOMMENDED: Custom Loader approach for full control
   */
  async initialize(config: HLSDubbingConfig): Promise<void> {
    this.hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      // Custom loader replaces default HTTP loader
      fLoader: DubbingFragmentLoader,
      // Pass dubbing context to loader
      loaderContext: {
        dubbingService: this.dubbingService,
        channelId: config.channelId,
        targetLanguage: config.targetLanguage,
      },
    })

    // Monitor segment loading for buffer health
    this.hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
      this.handleFragmentLoading(data)
    })

    // Handle dubbed segments received from backend
    this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
      this.handleFragmentLoaded(data)
    })

    // Track buffer health
    this.hls.on(Hls.Events.BUFFER_APPENDED, (event, data) => {
      const bufferLength = this.hls.media?.buffered.length || 0
      const bufferHealth = bufferLength > 0
        ? (this.hls.media!.buffered.end(bufferLength - 1) - this.hls.media!.currentTime) / 1.5 * 100
        : 0
      config.onBufferHealth(Math.min(100, bufferHealth))
    })

    this.hls.loadSource(config.videoUrl)
    this.hls.attachMedia(config.videoElement)
  }

  /**
   * Custom Fragment Loader for HLS.js
   * Replaces default HTTP loader to intercept segments
   */
  private createCustomLoader(): typeof Hls.DefaultConfig.loader {
    return class DubbingFragmentLoader {
      private context: LoaderContext
      private xhr: XMLHttpRequest

      constructor(config: LoaderConfiguration) {
        this.context = config.loaderContext
      }

      async load(
        context: LoaderContext,
        config: LoaderConfiguration,
        callbacks: LoaderCallbacks
      ): Promise<void> {
        const { url, frag } = context

        try {
          // Step 1: Fetch original segment
          const response = await fetch(url)
          const segmentData = await response.arrayBuffer()

          // Step 2: Send to dubbing service
          const dubbedSegment = await this.context.dubbingService.processSegment({
            segmentData: new Uint8Array(segmentData),
            sequence: frag.sn,
            duration: frag.duration,
            channelId: this.context.channelId,
            targetLanguage: this.context.targetLanguage,
          })

          // Step 3: Return dubbed segment to HLS.js
          callbacks.onSuccess({
            url,
            data: dubbedSegment.data.buffer,
          }, {
            // Pass through original stats
          }, context, null)

        } catch (error) {
          callbacks.onError(
            { code: 0, text: `Dubbing error: ${error.message}` },
            context,
            null
          )
        }
      }

      abort(): void {
        this.xhr?.abort()
      }
    }
  }
}
```

**FILE LOCATION**: Should be documented in Appendix A (line 1658):
```
web/src/services/dubbing/
├── HLSDubbingInterceptor.ts        (NEW: HLS.js segment interception)
├── DubbingSegmentService.ts        (NEW: Backend communication)
├── ios-web-integration.ts          (REMOVE: iOS-specific, not for web)
```

---

## 2. BASE64 ENCODING OVERHEAD - BINARY WEBSOCKET ANALYSIS

### Current Plan Analysis
Plan acknowledges issue (line 737 comment) but provides NO solution:
```typescript
// HLS.js on web: Hook beforeSegmentRequest
this.hls.on(Hls.Events.FRAG_LOADING, (data) => {
    this.sendToDubbingService(data.frag.url)  // Sends URL, not segment data
})
```

### Bandwidth Impact Calculation

**Typical HLS Segment**: ~2 seconds @ 720p = ~1-2MB per segment
**Segments per minute**: 30 segments
**Base64 inflation**: 33% overhead

| Encoding | Segment Size | Per Minute | Per Hour | Monthly (10h/user) |
|----------|-------------|------------|----------|-------------------|
| **Binary** | 1.5 MB | 45 MB | 2.7 GB | 27 GB |
| **Base64** | 2.0 MB | 60 MB | 3.6 GB | 36 GB |
| **Overhead** | +0.5 MB | +15 MB | +0.9 GB | **+9 GB/user** |

**Cost Impact** (assuming $0.12/GB egress):
- Binary: $3.24/user/month
- Base64: $4.32/user/month
- **Extra cost**: $1.08/user/month × 10,000 users = **$10,800/month wasted**

### Existing Implementation Analysis
`liveDubbingService.ts` (lines 297-313) already sends **binary** audio:

```typescript
// ✅ CORRECT - Binary audio transmission (no Base64)
if (type === 'audio' && this.ws?.readyState === WebSocket.OPEN) {
  const downsampled = this.downsample(new Int16Array(data), DOWNSAMPLE_RATIO)
  this.ws.send(downsampled.buffer)  // Binary ArrayBuffer, not Base64
}
```

However, plan shows Base64 for dubbed audio (line 382):

```typescript
// ❌ INCORRECT - Plan shows Base64 playback
private async playDubbedAudio(base64Audio: string): Promise<void> {
  const binaryString = atob(base64Audio)  // Base64 decode
  const bytes = new Uint8Array(binaryString.length)
  // ...
}
```

### REQUIRED CHANGES

**1. Update WebSocket Protocol** (backend `websocket_live_dubbing.py`):
```python
# ❌ CURRENT (from plan) - Base64 encoding
await websocket.send_json({
    "type": "dubbed_audio",
    "data": base64.b64encode(dubbed_audio).decode(),  # Base64 overhead
    "sequence": sequence,
})

# ✅ REQUIRED - Binary frames
await websocket.send_bytes(dubbed_audio)  # Raw binary, no encoding
```

**2. Update Frontend Reception** (`liveDubbingService.ts`):
```typescript
// ❌ CURRENT - JSON messages with Base64
this.ws.onmessage = async (event) => {
  const msg = JSON.parse(event.data)
  if (msg.type === 'dubbed_audio') {
    await this.playDubbedAudio(msg.data)  // Base64 string
  }
}

// ✅ REQUIRED - Binary messages
this.ws.onmessage = async (event) => {
  if (event.data instanceof ArrayBuffer) {
    // Binary dubbed audio segment
    await this.playDubbedAudioBinary(event.data)
  } else {
    // JSON control messages (connection info, errors, latency)
    const msg = JSON.parse(event.data)
    this.handleControlMessage(msg)
  }
}

private async playDubbedAudioBinary(buffer: ArrayBuffer): Promise<void> {
  const audioBuffer = await this.audioContext.decodeAudioData(buffer)
  const source = this.audioContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(this.dubbedGain)
  source.start()
}
```

**3. Protocol Specification** (should be in plan Appendix):
```typescript
/**
 * WebSocket Message Protocol
 *
 * CONTROL MESSAGES (JSON, text frames):
 * - Client → Server:
 *   { type: "authenticate", token: string }
 * - Server → Client:
 *   { type: "connected", session_id: string, ... }
 *   { type: "latency_report", avg_total_ms: number, ... }
 *   { type: "error", error: string, recoverable: boolean }
 *
 * AUDIO DATA (Binary frames):
 * - Client → Server: Int16Array audio samples (no wrapper)
 * - Server → Client: Dubbed audio segment (MP3/AAC/Opus, no wrapper)
 */
```

---

## 3. GLASS COMPONENTS COMPLIANCE CHECK

### Critical Finding: Glass Library Not Referenced in Plan

**CLAUDE.md Requirement** (lines 82-113):
> ALL UI components MUST use the `@bayit/glass` library. Native/browser elements are FORBIDDEN.

**Plan Violation** (lines 916-1043): Shows React Native `View`, `Text`, `ProgressBar`:
```tsx
// ❌ FORBIDDEN - Native React Native components in web plan
import { View, Text, ProgressBar, StyleSheet } from 'react-native'

export function DubbingDelayIndicator({ ... }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>...</Text>
      <ProgressBar value={bufferHealth / 100} ... />
    </View>
  )
}

// ❌ FORBIDDEN - StyleSheet.create() for web (this is React Native API)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', ... },
})
```

### Existing Glass Components Available
Per `/shared/components/ui/index.ts`:
- ✅ `GlassProgressBar` - Available for buffer health display
- ✅ `GlassView` - Available for container
- ✅ `GlassCard` - Available for panels
- ✅ `GlassBadge` - Available for status indicators
- ✅ `GlassButton` - Available for controls

### REQUIRED CORRECTIONS

**1. Update `DubbingDelayIndicator.tsx`** (should be in `web/src/components/player/dubbing/`):

```tsx
// ✅ CORRECT - Glass Components with TailwindCSS
import { GlassView, GlassBadge } from '@bayit/shared/ui'
import { GlassProgressBar } from '@bayit/shared/ui/GlassProgressBar'

interface DubbingDelayIndicatorProps {
  isEnabled: boolean
  delayMs: number
  bufferHealth: number
  onLearnMore: () => void
}

export function DubbingDelayIndicator({
  isEnabled,
  delayMs,
  bufferHealth,
  onLearnMore,
}: DubbingDelayIndicatorProps) {
  return (
    <GlassView
      className="bg-black/70 rounded-xl p-4 mb-4 border-l-4 border-purple-500"
      // Note: GlassView already handles glassmorphism backdrop-blur
    >
      {/* Header with delay disclosure */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-white text-sm font-semibold">
          🌐 Spanish Dubbing
        </span>
        <GlassBadge variant="info" size="sm">
          +{delayMs}ms behind live
        </GlassBadge>
      </div>

      {/* Buffer health with GlassProgressBar */}
      <div className="mb-3">
        <span className="text-gray-400 text-xs block mb-1">
          Buffer Health
        </span>
        <GlassProgressBar
          progress={bufferHealth}
          variant={bufferHealth > 50 ? 'success' : 'warning'}
          size="md"
          showLabel
          animated
        />
      </div>

      {/* Warning for low buffer */}
      {bufferHealth < 30 && (
        <div className="flex items-center gap-2 bg-orange-500/10 rounded-lg p-2 mb-3">
          <span className="text-base">⚠️</span>
          <span className="text-orange-400 text-xs flex-1">
            Buffer is low - dubbing may pause
          </span>
        </div>
      )}

      {/* Learn more link */}
      <button
        onClick={onLearnMore}
        className="text-blue-400 text-xs underline hover:text-blue-300 transition-colors"
      >
        Why is there a delay? →
      </button>
    </GlassView>
  )
}
```

**2. Remove StyleSheet.create() references** from plan (lines 978-1043):
- ❌ `StyleSheet.create()` is React Native API, NOT for pure web
- ✅ Use TailwindCSS classes for styling
- ✅ Glass Components handle glassmorphism automatically

---

## 4. TYPESCRIPT IMPLEMENTATION COMPLETENESS

### Missing Type Definitions

**Plan shows incomplete types** (lines 58-66):
```typescript
// ❌ INCOMPLETE - Missing critical properties
export interface DubbedAudioMessage {
  type: 'dubbed_audio'
  data: string // Vague - Base64? Binary? What format?
  // Missing: codec, sample_rate, channels, duration
}
```

### REQUIRED COMPLETE TYPES

```typescript
/**
 * Type definitions for Live Dubbing system
 * Location: web/src/services/dubbing/types.ts
 */

/** HLS segment with timing information */
export interface HLSSegment {
  /** Segment sequence number */
  sequence: number
  /** Segment data (video + audio) */
  data: Uint8Array
  /** Segment duration in seconds */
  duration: number
  /** Presentation timestamp */
  pts: number
  /** Program timestamp */
  programDateTime: Date | null
}

/** Dubbed segment returned from backend */
export interface DubbedSegment {
  /** Original segment sequence */
  sequence: number
  /** Dubbed segment data (video + new audio) */
  data: Uint8Array
  /** Processing latency in milliseconds */
  latencyMs: number
  /** Original text transcription */
  originalText: string
  /** Translated text */
  translatedText: string
  /** Source language code (ISO 639-1) */
  sourceLang: string
  /** Target language code (ISO 639-1) */
  targetLang: string
}

/** WebSocket control message types */
export type DubbingControlMessage =
  | DubbingConnectionInfo
  | DubbingLatencyReport
  | DubbingError
  | DubbingBufferHealthUpdate

export interface DubbingConnectionInfo {
  type: 'connected'
  sessionId: string
  sourceLang: string
  targetLang: string
  voiceId: string
  syncDelayMs: number
  /** Server capabilities */
  features: {
    binaryFrames: boolean
    segmentCaching: boolean
    qualityAdaptation: boolean
  }
}

export interface DubbingLatencyReport {
  type: 'latency_report'
  /** STT latency (ms) */
  avgSttMs: number
  /** Translation latency (ms) */
  avgTranslationMs: number
  /** TTS latency (ms) */
  avgTtsMs: number
  /** Total pipeline latency (ms) */
  avgTotalMs: number
  /** Number of segments processed */
  segmentsProcessed: number
  /** P99 latency (ms) */
  p99LatencyMs: number
}

export interface DubbingError {
  type: 'error'
  /** Error code for programmatic handling */
  code:
    | 'AUTH_FAILED'
    | 'QUOTA_EXCEEDED'
    | 'SEGMENT_PROCESSING_ERROR'
    | 'BUFFER_OVERFLOW'
    | 'NETWORK_ERROR'
    | 'INVALID_LANGUAGE'
  /** Human-readable error message */
  message: string
  /** Can client retry? */
  recoverable: boolean
  /** Retry delay in seconds (if recoverable) */
  retryAfterSeconds?: number
}

export interface DubbingBufferHealthUpdate {
  type: 'buffer_health'
  /** Buffer health percentage (0-100) */
  health: number
  /** Current buffer size in segments */
  bufferSize: number
  /** Recommended buffer size */
  recommendedSize: number
}

/** Dubbing service configuration */
export interface DubbingServiceConfig {
  /** Live channel ID */
  channelId: string
  /** Target dubbing language */
  targetLanguage: string
  /** Optional voice ID for TTS */
  voiceId?: string
  /** Video element reference */
  videoElement: HTMLVideoElement
  /** Callbacks */
  onConnected: (info: DubbingConnectionInfo) => void
  onLatency: (report: DubbingLatencyReport) => void
  onError: (error: DubbingError) => void
  onBufferHealth: (update: DubbingBufferHealthUpdate) => void
}

/** Dubbing service state */
export interface DubbingServiceState {
  /** Connection status */
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  /** Current sync delay (ms) */
  syncDelayMs: number
  /** Buffer health (0-100) */
  bufferHealth: number
  /** Average total latency (ms) */
  averageLatencyMs: number
  /** Segments processed */
  segmentsProcessed: number
  /** Last error */
  lastError: DubbingError | null
}
```

**Add to plan Appendix A** (line 1658):
```
web/src/services/dubbing/
├── types.ts                         (NEW: Complete TypeScript definitions)
```

---

## 5. REACT STATE MANAGEMENT PATTERNS

### Current Hook Implementation Assessment

**Existing `useLiveDubbing` hook** is referenced but not shown in plan. Based on codebase patterns, it likely exists but needs to be **specified in the plan**.

### REQUIRED: Document Complete Hook Interface

```typescript
/**
 * React hook for live dubbing state management
 * Location: web/src/components/player/hooks/useLiveDubbing.ts
 */

export interface UseLiveDubbingOptions {
  /** Live channel ID */
  channelId: string
  /** Video element reference */
  videoElement: HTMLVideoElement | null
  /** Target language (optional, can be changed later) */
  targetLanguage?: string
  /** Auto-connect on mount */
  autoConnect?: boolean
}

export interface UseLiveDubbingReturn {
  /** Connection state */
  connectionState: DubbingServiceState['connectionState']

  /** Dubbing control functions */
  connect: (targetLanguage: string, voiceId?: string) => Promise<void>
  disconnect: () => void

  /** Volume controls */
  setOriginalVolume: (volume: number) => void
  setDubbedVolume: (volume: number) => void

  /** State values */
  syncDelayMs: number
  bufferHealth: number
  averageLatencyMs: number
  segmentsProcessed: number
  lastError: DubbingError | null

  /** Latest latency report */
  latencyReport: DubbingLatencyReport | null

  /** Connection info */
  connectionInfo: DubbingConnectionInfo | null

  /** Available languages for this channel */
  availableLanguages: string[]

  /** Loading state */
  isConnecting: boolean
  isConnected: boolean
}

export function useLiveDubbing(options: UseLiveDubbingOptions): UseLiveDubbingReturn {
  // State management with useState, useRef, useEffect
  const [connectionState, setConnectionState] = useState<DubbingServiceState['connectionState']>('disconnected')
  const [bufferHealth, setBufferHealth] = useState(0)
  const [averageLatencyMs, setAverageLatencyMs] = useState(0)
  const [segmentsProcessed, setSegmentsProcessed] = useState(0)
  const [lastError, setLastError] = useState<DubbingError | null>(null)
  const [latencyReport, setLatencyReport] = useState<DubbingLatencyReport | null>(null)
  const [connectionInfo, setConnectionInfo] = useState<DubbingConnectionInfo | null>(null)
  const [syncDelayMs, setSyncDelayMs] = useState(1200)

  // Service reference (stable across renders)
  const serviceRef = useRef<HLSDubbingInterceptor | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      serviceRef.current?.disconnect()
    }
  }, [])

  // Auto-connect if enabled
  useEffect(() => {
    if (options.autoConnect && options.targetLanguage && options.videoElement) {
      connect(options.targetLanguage)
    }
  }, [options.autoConnect, options.targetLanguage, options.videoElement])

  const connect = useCallback(async (targetLanguage: string, voiceId?: string) => {
    if (!options.videoElement) {
      throw new Error('Video element not available')
    }

    setConnectionState('connecting')
    setLastError(null)

    try {
      serviceRef.current = new HLSDubbingInterceptor()
      await serviceRef.current.initialize({
        channelId: options.channelId,
        targetLanguage,
        voiceId,
        videoElement: options.videoElement,
        onConnected: setConnectionInfo,
        onLatency: setLatencyReport,
        onError: setLastError,
        onBufferHealth: setBufferHealth,
      })

      setConnectionState('connected')
    } catch (error) {
      setConnectionState('error')
      setLastError({
        type: 'error',
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Connection failed',
        recoverable: true,
      })
    }
  }, [options.channelId, options.videoElement])

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect()
    serviceRef.current = null
    setConnectionState('disconnected')
  }, [])

  const setOriginalVolume = useCallback((volume: number) => {
    serviceRef.current?.setOriginalVolume(volume)
  }, [])

  const setDubbedVolume = useCallback((volume: number) => {
    serviceRef.current?.setDubbedVolume(volume)
  }, [])

  // Update derived values from latest report
  useEffect(() => {
    if (latencyReport) {
      setAverageLatencyMs(latencyReport.avgTotalMs)
      setSegmentsProcessed(latencyReport.segmentsProcessed)
    }
  }, [latencyReport])

  useEffect(() => {
    if (connectionInfo) {
      setSyncDelayMs(connectionInfo.syncDelayMs)
    }
  }, [connectionInfo])

  return {
    connectionState,
    connect,
    disconnect,
    setOriginalVolume,
    setDubbedVolume,
    syncDelayMs,
    bufferHealth,
    averageLatencyMs,
    segmentsProcessed,
    lastError,
    latencyReport,
    connectionInfo,
    availableLanguages: [], // TODO: Fetch from API
    isConnecting: connectionState === 'connecting',
    isConnected: connectionState === 'connected',
  }
}
```

---

## 6. BROWSER COMPATIBILITY & RESPONSIVE DESIGN

### Browser Support Matrix

**Plan Missing**: No browser compatibility specification.

**REQUIRED SPECIFICATION**:

| Browser | Version | HLS.js Support | WebSocket | captureStream() | AudioWorklet |
|---------|---------|----------------|-----------|-----------------|--------------|
| **Chrome** | 90+ | ✅ Native | ✅ | ✅ | ✅ |
| **Firefox** | 88+ | ✅ Native | ✅ | ✅ (mozCaptureStream) | ✅ |
| **Safari** | 14+ | ✅ Native HLS | ✅ | ❌ (no captureStream) | ✅ |
| **Edge** | 90+ | ✅ Native | ✅ | ✅ | ✅ |

**Critical Issue: Safari on macOS does not support `captureStream()`**

**WORKAROUND REQUIRED** for Safari:
```typescript
// web/src/services/dubbing/SafariAudioCapture.ts
export class SafariAudioCapture {
  /**
   * Safari workaround: Use HLS.js segment interception
   * instead of captureStream() which is not supported.
   *
   * Extract audio from HLS segments directly instead of
   * capturing from video element audio output.
   */
  async captureFromSegment(segment: Uint8Array): Promise<Int16Array> {
    // Use FFmpeg.wasm or AudioContext decodeAudioData
    // to extract audio from segment
  }
}
```

### Responsive Design Requirements

**Plan shows mobile detection** (line 160-166):
```typescript
// ✅ CORRECT - Mobile detection pattern
useEffect(() => {
  setIsMobile(window.innerWidth < 768)
  const handleResize = () => setIsMobile(window.innerWidth < 768)
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

**REQUIRED: Add responsive layout specifications**:

```typescript
/**
 * Responsive layout breakpoints for dubbing controls
 * Must follow Tailwind CSS breakpoints for consistency
 */
export const DUBBING_RESPONSIVE_CONFIG = {
  breakpoints: {
    mobile: 0,      // 0-640px
    tablet: 640,    // 640-768px
    desktop: 768,   // 768px+
    widescreen: 1280, // 1280px+
  },

  layouts: {
    mobile: {
      // Dubbing indicator: Fixed bottom banner
      indicatorPosition: 'fixed bottom-0',
      indicatorSize: 'compact',
      showFullMetrics: false,

      // Controls: Simplified
      showLatencyGraph: false,
      showBufferHistory: false,
    },

    tablet: {
      // Dubbing indicator: Overlay top-right
      indicatorPosition: 'absolute top-4 right-4',
      indicatorSize: 'medium',
      showFullMetrics: true,

      // Controls: Standard
      showLatencyGraph: true,
      showBufferHistory: false,
    },

    desktop: {
      // Dubbing indicator: Overlay with full details
      indicatorPosition: 'absolute top-4 right-4',
      indicatorSize: 'large',
      showFullMetrics: true,

      // Controls: Full feature set
      showLatencyGraph: true,
      showBufferHistory: true,
    },
  },
} as const
```

---

## 7. CSS/TAILWIND COMPLIANCE

### Critical Violation: StyleSheet.create() in Plan

**CLAUDE.md Violation** (Global CLAUDE.md lines 193-229):
> Pure Web (non-React Native) - CORRECT:
> ```tsx
> // ✅ TailwindCSS for pure web components
> <div className="flex flex-col gap-4 bg-black/20 backdrop-blur-xl">
> ```
>
> WRONG (all platforms):
> ```tsx
> // ❌ FORBIDDEN - External CSS files
> import './styles.css'
> ```

**Plan shows StyleSheet.create()** (lines 978-1043):
```tsx
// ❌ FORBIDDEN - This is React Native API, not for web
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', ... },
})
```

**CORRECTION REQUIRED**: All web styling must use TailwindCSS:

```tsx
// ✅ CORRECT - TailwindCSS classes for web
<div className="flex flex-col gap-4 bg-black/20 backdrop-blur-xl rounded-2xl p-6">
  <span className="text-white text-xl font-bold">Title</span>
</div>
```

**Plan Update Required**:
- Remove ALL `StyleSheet.create()` references from Section 1.5 (lines 978-1043)
- Replace with TailwindCSS utility classes
- Document Glass Components usage

---

## 8. ACCESSIBILITY REQUIREMENTS

### Missing Specification

**Plan Missing**: No accessibility requirements specified.

**REQUIRED WCAG 2.1 AA COMPLIANCE**:

```typescript
/**
 * Accessibility requirements for dubbing controls
 * WCAG 2.1 AA compliance mandatory
 */

// 1. Keyboard Navigation
export const DUBBING_KEYBOARD_SHORTCUTS = {
  'Alt + D': 'Toggle dubbing on/off',
  'Alt + L': 'Change dubbing language',
  'Alt + V': 'Adjust dubbed audio volume',
  'Alt + Shift + D': 'Show dubbing settings',
} as const

// 2. Screen Reader Support (ARIA)
interface DubbingAriaLabels {
  dubbingToggle: 'Toggle live dubbing'
  languageSelector: 'Select dubbing language'
  volumeSlider: 'Adjust dubbed audio volume'
  bufferHealth: 'Dubbing buffer health percentage'
  syncDelay: 'Audio synchronization delay in milliseconds'
  errorMessage: 'Dubbing error message'
}

// 3. Focus Management
export const DUBBING_FOCUS_ORDER = [
  'dubbing-toggle-button',
  'language-selector',
  'volume-slider',
  'settings-button',
  'close-button',
] as const

// 4. Color Contrast (WCAG AA)
export const DUBBING_COLORS = {
  // All combinations must meet 4.5:1 contrast ratio
  textOnBackground: '#FFFFFF', // on rgba(0,0,0,0.7) = 15:1 ratio ✅
  warningText: '#FBB624', // on rgba(0,0,0,0.7) = 8.2:1 ratio ✅
  errorText: '#EF4444', // on rgba(0,0,0,0.7) = 5.8:1 ratio ✅
} as const

// 5. Component Example
export function AccessibleDubbingToggle() {
  return (
    <button
      // ARIA attributes
      aria-label="Toggle live dubbing"
      aria-pressed={isEnabled}
      aria-describedby="dubbing-status"

      // Keyboard support
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggleDubbing()
        }
      }}

      // Focus indicator (required for keyboard users)
      className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"

      // Minimum touch target: 44x44px (WCAG 2.5.5)
      style={{ minWidth: 44, minHeight: 44 }}
    >
      <span className="sr-only">
        {isEnabled ? 'Dubbing is on' : 'Dubbing is off'}
      </span>
      <DubbingIcon aria-hidden="true" />
    </button>
  )
}
```

**Plan Update Required**: Add Section 1.5.3 "Accessibility Requirements" with above specification.

---

## 9. PERFORMANCE OPTIMIZATION & CORE WEB VITALS

### Missing Performance Budget

**Plan Missing**: No Core Web Vitals targets specified.

**REQUIRED PERFORMANCE BUDGET**:

```typescript
/**
 * Core Web Vitals targets for dubbing feature
 * Must NOT degrade base video player performance
 */
export const DUBBING_PERFORMANCE_BUDGET = {
  // Largest Contentful Paint (LCP)
  // Target: < 2.5s
  // Dubbing should add < 100ms to LCP
  maxLCPMs: 2500,
  dubbingLCPOverheadMs: 100,

  // First Input Delay (FID)
  // Target: < 100ms
  // Dubbing should add < 10ms to FID
  maxFIDMs: 100,
  dubbingFIDOverheadMs: 10,

  // Cumulative Layout Shift (CLS)
  // Target: < 0.1
  // Dubbing controls must not cause layout shift
  maxCLS: 0.1,
  dubbingCLSOverhead: 0,

  // Time to Interactive (TTI)
  // Target: < 3.5s
  maxTTIMs: 3500,

  // Total Blocking Time (TBT)
  // Target: < 200ms
  maxTBTMs: 200,

  // WebSocket connection
  maxWebSocketConnectMs: 1000,

  // HLS.js initialization
  maxHLSInitMs: 500,

  // Segment processing latency
  maxSegmentProcessingMs: 1500,

  // Memory budget
  maxMemoryUsageMB: 50,
  maxSegmentBufferSize: 10,
} as const

/**
 * Performance monitoring
 */
export function useDubbingPerformanceMetrics() {
  const [metrics, setMetrics] = useState({
    lcpMs: 0,
    fidMs: 0,
    cls: 0,
    segmentProcessingMs: 0,
    memoryUsageMB: 0,
  })

  useEffect(() => {
    // Web Vitals monitoring
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          setMetrics(prev => ({ ...prev, lcpMs: entry.renderTime }))
        }
        // ... other vitals
      }
    })

    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })

    return () => observer.disconnect()
  }, [])

  return metrics
}
```

**Plan Update Required**: Add Section 4.4 "Performance Testing & Core Web Vitals" with above budget.

---

## 10. ERROR HANDLING & NETWORK FAILURES

### Plan Assessment

**Plan shows basic error handling** (lines 192-199 in `liveDubbingService.ts`):
```typescript
// ✅ ACCEPTABLE - Basic error handling present
} else if (msg.type === 'error') {
  logger.error('Server error', 'liveDubbingService', msg.error || msg.message)
  onError(msg.error || msg.message, msg.recoverable ?? true)
}
```

**REQUIRED ENHANCEMENTS**:

```typescript
/**
 * Comprehensive error handling for dubbing service
 */

// Error types with retry strategies
export const DUBBING_ERROR_STRATEGIES: Record<
  DubbingError['code'],
  { retryable: boolean; maxRetries: number; backoffMs: number }
> = {
  AUTH_FAILED: { retryable: false, maxRetries: 0, backoffMs: 0 },
  QUOTA_EXCEEDED: { retryable: false, maxRetries: 0, backoffMs: 0 },
  SEGMENT_PROCESSING_ERROR: { retryable: true, maxRetries: 3, backoffMs: 1000 },
  BUFFER_OVERFLOW: { retryable: true, maxRetries: 2, backoffMs: 500 },
  NETWORK_ERROR: { retryable: true, maxRetries: 5, backoffMs: 2000 },
  INVALID_LANGUAGE: { retryable: false, maxRetries: 0, backoffMs: 0 },
}

// Network failure handling
export class DubbingNetworkResilience {
  private retryCount = 0
  private backoffTimer: number | null = null

  async handleNetworkFailure(error: DubbingError): Promise<void> {
    const strategy = DUBBING_ERROR_STRATEGIES[error.code]

    if (!strategy.retryable || this.retryCount >= strategy.maxRetries) {
      // Non-retryable or max retries exceeded
      this.showPermanentError(error)
      return
    }

    // Calculate exponential backoff
    const backoffMs = strategy.backoffMs * Math.pow(2, this.retryCount)

    // Show transient error with countdown
    this.showTransientError(error, backoffMs)

    // Schedule retry
    this.backoffTimer = window.setTimeout(() => {
      this.retryCount++
      this.attemptReconnect()
    }, backoffMs)
  }

  private showTransientError(error: DubbingError, retryInMs: number): void {
    // Show toast: "Connection lost. Retrying in 2s..."
    // Update UI to show retrying state
  }

  private showPermanentError(error: DubbingError): void {
    // Show modal: "Dubbing unavailable: [reason]"
    // Offer: "Try again" button (resets retry count)
  }

  private attemptReconnect(): void {
    // Reconnect logic
  }
}

// Segment loss handling
export class SegmentLossHandler {
  private missingSegments: Set<number> = new Set()

  handleMissingSegment(sequence: number): void {
    this.missingSegments.add(sequence)

    // Request retransmission (backend must support)
    this.requestSegmentRetransmission(sequence)

    // If too many missing, pause and buffer
    if (this.missingSegments.size > 3) {
      this.pauseAndBuffer()
    }
  }

  private pauseAndBuffer(): void {
    // Pause playback, show buffering indicator
    // Wait for missing segments to arrive
  }
}
```

**Plan Update Required**: Expand Section 1.5.1 to include network resilience patterns.

---

## 11. WEBSOCKET CONNECTION LIFECYCLE

### Current Implementation Review

**Existing `liveDubbingService.ts`** (lines 124-215) shows basic WebSocket lifecycle:
- ✅ Connection establishment
- ✅ Authentication after connect
- ✅ onmessage, onerror, onclose handlers
- ⚠️ No reconnection logic
- ⚠️ No heartbeat/ping-pong
- ⚠️ No connection state machine

**REQUIRED ENHANCEMENTS**:

```typescript
/**
 * WebSocket connection state machine
 */
export type WSConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'reconnecting'
  | 'failed'

export class DubbingWebSocketManager {
  private state: WSConnectionState = 'disconnected'
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private heartbeatInterval: number | null = null
  private lastHeartbeat: number = 0

  async connect(config: DubbingServiceConfig): Promise<void> {
    this.state = 'connecting'

    try {
      this.ws = new WebSocket(this.buildWebSocketURL(config))

      this.ws.onopen = () => this.handleOpen(config)
      this.ws.onmessage = (event) => this.handleMessage(event)
      this.ws.onerror = (error) => this.handleError(error)
      this.ws.onclose = (event) => this.handleClose(event)

    } catch (error) {
      this.state = 'failed'
      throw error
    }
  }

  private handleOpen(config: DubbingServiceConfig): void {
    this.state = 'authenticating'

    // Send authentication
    this.send({
      type: 'authenticate',
      token: this.getAuthToken(),
    })

    // Wait for authentication response
    // (handled in handleMessage)
  }

  private handleMessage(event: MessageEvent): void {
    if (event.data instanceof ArrayBuffer) {
      // Binary audio data
      this.handleBinaryAudio(event.data)
      return
    }

    const msg = JSON.parse(event.data)

    switch (msg.type) {
      case 'connected':
        this.state = 'connected'
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.onConnected(msg)
        break

      case 'pong':
        this.lastHeartbeat = Date.now()
        break

      case 'error':
        this.handleServerError(msg)
        break

      // ... other message types
    }
  }

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat()

    // Normal closure (1000) or going away (1001) - don't reconnect
    if (event.code === 1000 || event.code === 1001) {
      this.state = 'disconnected'
      return
    }

    // Abnormal closure - attempt reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.state = 'reconnecting'
      this.reconnectAttempts++

      const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      setTimeout(() => this.connect(this.config), backoffMs)
    } else {
      this.state = 'failed'
      this.onError({
        type: 'error',
        code: 'NETWORK_ERROR',
        message: 'Failed to reconnect after multiple attempts',
        recoverable: false,
      })
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      // Send ping every 30 seconds
      this.send({ type: 'ping' })

      // Check if pong received within 10 seconds
      setTimeout(() => {
        const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat
        if (timeSinceLastHeartbeat > 10000) {
          // No pong received, connection likely dead
          this.ws?.close(1006, 'Heartbeat timeout')
        }
      }, 10000)
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  disconnect(): void {
    this.stopHeartbeat()
    this.ws?.close(1000, 'Client disconnect')
    this.state = 'disconnected'
  }
}
```

**Plan Update Required**: Add Section 1.5.2 "WebSocket Connection Management" with above state machine.

---

## 12. TESTING STRATEGY - PLAYWRIGHT

### Plan Assessment

**Plan mentions Playwright** (line 1587):
```bash
# tvOS Testing
# Run on tvOS Simulator
# Verify: Server-side dubbed stream URLs work
# Metrics: Initial playback latency (should be 2-3s)
```

**But provides NO web-specific Playwright tests**.

**REQUIRED PLAYWRIGHT TEST SUITE**:

```typescript
/**
 * Playwright E2E tests for live dubbing
 * Location: web/tests/e2e/live-dubbing.spec.ts
 */

import { test, expect } from '@playwright/test'

test.describe('Live Dubbing - HLS.js Integration', () => {
  test('should intercept HLS segments and inject dubbed audio', async ({ page }) => {
    // 1. Load live channel page
    await page.goto('/live/channel/123')

    // 2. Wait for video player to initialize
    const video = await page.locator('video')
    await expect(video).toBeVisible()

    // 3. Enable dubbing
    await page.click('[aria-label="Toggle live dubbing"]')

    // 4. Select Spanish
    await page.click('[aria-label="Select dubbing language"]')
    await page.click('text="Spanish"')

    // 5. Verify WebSocket connection established
    const wsRequests = []
    page.on('websocket', (ws) => {
      ws.on('framereceived', (event) => wsRequests.push(event))
    })

    await page.waitForTimeout(2000)
    expect(wsRequests.length).toBeGreaterThan(0)

    // 6. Verify segments are being received
    // (check for binary frames)
    const binaryFrames = wsRequests.filter(r => r.payload instanceof Buffer)
    expect(binaryFrames.length).toBeGreaterThan(0)
  })

  test('should show delay indicator with correct metrics', async ({ page }) => {
    await page.goto('/live/channel/123')
    await page.click('[aria-label="Toggle live dubbing"]')

    // Verify delay indicator appears
    const indicator = page.locator('[data-testid="dubbing-delay-indicator"]')
    await expect(indicator).toBeVisible()

    // Verify delay value shown
    const delayText = await indicator.locator('text=/\+\d+ms behind live/').textContent()
    expect(delayText).toMatch(/\+\d+ms/)

    // Verify buffer health shown
    const bufferHealth = await indicator.locator('[data-testid="buffer-health"]')
    await expect(bufferHealth).toBeVisible()
  })

  test('should handle network failure gracefully', async ({ page, context }) => {
    await page.goto('/live/channel/123')
    await page.click('[aria-label="Toggle live dubbing"]')

    // Simulate network failure
    await context.setOffline(true)
    await page.waitForTimeout(3000)

    // Verify error message shown
    const errorMsg = page.locator('text=/Connection lost|Network error/')
    await expect(errorMsg).toBeVisible()

    // Reconnect network
    await context.setOffline(false)

    // Verify auto-reconnect
    await page.waitForTimeout(5000)
    await expect(errorMsg).not.toBeVisible()
  })

  test('should meet Core Web Vitals targets', async ({ page }) => {
    await page.goto('/live/channel/123')

    // Measure LCP before dubbing
    const lcpBefore = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          resolve(entries[entries.length - 1].renderTime)
        }).observe({ type: 'largest-contentful-paint', buffered: true })
      })
    })

    // Enable dubbing
    await page.click('[aria-label="Toggle live dubbing"]')

    // Measure LCP after dubbing
    const lcpAfter = await page.evaluate(() => { /* same as above */ })

    // Verify dubbing overhead < 100ms
    const overhead = lcpAfter - lcpBefore
    expect(overhead).toBeLessThan(100)

    // Verify LCP still < 2.5s
    expect(lcpAfter).toBeLessThan(2500)
  })
})

test.describe('Live Dubbing - Accessibility', () => {
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/live/channel/123')

    // Focus dubbing toggle with Tab
    await page.keyboard.press('Tab') // Skip to first focusable

    // Verify focus visible
    const toggleButton = page.locator('[aria-label="Toggle live dubbing"]:focus')
    await expect(toggleButton).toBeVisible()

    // Toggle with Enter
    await page.keyboard.press('Enter')
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'true')

    // Use Alt+L shortcut to open language selector
    await page.keyboard.press('Alt+L')
    const languageMenu = page.locator('[role="menu"]')
    await expect(languageMenu).toBeVisible()
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/live/channel/123')

    // Verify all controls have aria-label
    const controls = [
      '[aria-label="Toggle live dubbing"]',
      '[aria-label="Select dubbing language"]',
      '[aria-label="Adjust dubbed audio volume"]',
    ]

    for (const selector of controls) {
      await expect(page.locator(selector)).toHaveCount(1)
    }
  })

  test('should meet color contrast requirements', async ({ page }) => {
    await page.goto('/live/channel/123')
    await page.click('[aria-label="Toggle live dubbing"]')

    // Use axe-core for automated accessibility testing
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-ignore
        axe.run((err, results) => {
          resolve(results.violations.filter(v => v.id === 'color-contrast'))
        })
      })
    }).then((violations: any) => {
      expect(violations).toHaveLength(0)
    })
  })
})

test.describe('Live Dubbing - Browser Compatibility', () => {
  test.use({ browserName: 'chromium' })
  test('Chrome: HLS.js with dubbing', async ({ page }) => {
    // Test Chrome-specific behavior
  })

  test.use({ browserName: 'firefox' })
  test('Firefox: HLS.js with dubbing', async ({ page }) => {
    // Test Firefox mozCaptureStream
  })

  test.use({ browserName: 'webkit' })
  test('Safari: HLS.js with dubbing (fallback mode)', async ({ page }) => {
    // Test Safari without captureStream support
    // Verify fallback to segment-level audio extraction
  })
})
```

**Plan Update Required**: Add Section 4.4 "Web Frontend E2E Testing (Playwright)" with above test suite.

---

## REQUIRED PLAN UPDATES SUMMARY

### Critical Changes (Must Have Before Implementation)

1. **Section 1.4.1** (lines 731-751): Replace with complete HLS.js segment interception architecture
   - Add `HLSDubbingInterceptor` class specification
   - Add `DubbingFragmentLoader` custom loader
   - Specify segment buffering strategy

2. **Section 1.5.1** (lines 916-1043): Fix `DubbingDelayIndicator` component
   - Remove `StyleSheet.create()` (React Native API)
   - Use Glass Components (`GlassView`, `GlassProgressBar`, etc.)
   - Use TailwindCSS classes only

3. **WebSocket Protocol**: Add binary frame specification
   - Update backend to send binary frames (not Base64 JSON)
   - Update frontend to handle binary messages
   - Add protocol documentation to Appendix

4. **TypeScript Types**: Add complete type definitions
   - `HLSSegment`, `DubbedSegment`
   - Complete `DubbingControlMessage` union
   - `DubbingServiceConfig`, `DubbingServiceState`

5. **Appendix A** (line 1658): Update file structure
   ```
   web/src/services/dubbing/
   ├── HLSDubbingInterceptor.ts       (NEW)
   ├── DubbingSegmentService.ts       (NEW)
   ├── DubbingWebSocketManager.ts     (NEW)
   ├── SafariAudioCapture.ts          (NEW - Safari workaround)
   ├── types.ts                       (NEW)

   web/src/components/player/dubbing/
   ├── DubbingDelayIndicator.tsx      (FIX - Use Glass Components)
   ├── DubbingControls.tsx            (EXISTS - Review)
   ├── DubbingOverlay.tsx             (EXISTS - Review)
   ```

### High Priority Changes (Strongly Recommended)

6. **Section 1.5.2**: Add WebSocket connection state machine
7. **Section 1.5.3**: Add accessibility requirements (WCAG 2.1 AA)
8. **Section 4.4**: Add Core Web Vitals performance budget
9. **Section 4.5**: Add Playwright E2E test specifications

### Medium Priority Changes (Recommended)

10. **Section 2.1**: Add Safari compatibility workaround
11. **Section 3.2**: Add browser support matrix
12. **Section 4.6**: Add responsive design specifications

---

## IMPLEMENTATION RECOMMENDATIONS

### Phase 1 Priorities (Week 1)

1. **HLS.js Architecture** (Critical)
   - Implement `HLSDubbingInterceptor` with custom fragment loader
   - Test segment interception with HLS.js events
   - Verify segment buffering without playback stalls

2. **Binary WebSocket Protocol** (Critical)
   - Update backend to send binary frames
   - Update frontend to handle binary messages
   - Measure bandwidth savings vs Base64

3. **Glass Components Integration** (Critical)
   - Rewrite `DubbingDelayIndicator` with Glass Components
   - Remove all `StyleSheet.create()` references
   - Use TailwindCSS for all styling

4. **TypeScript Types** (High Priority)
   - Define complete type definitions
   - Add JSDoc comments for all interfaces
   - Export types from dedicated types.ts file

### Phase 2 Priorities (Week 2)

5. **WebSocket Resilience** (High Priority)
   - Implement connection state machine
   - Add heartbeat/ping-pong
   - Add automatic reconnection with exponential backoff

6. **Accessibility** (High Priority)
   - Add keyboard shortcuts
   - Add ARIA labels to all controls
   - Test with screen readers

7. **Safari Compatibility** (Medium Priority)
   - Implement `SafariAudioCapture` fallback
   - Test on macOS Safari without `captureStream()`

### Phase 3 Priorities (Week 3-4)

8. **Playwright Tests** (High Priority)
   - Implement segment interception tests
   - Implement accessibility tests
   - Implement performance tests (Core Web Vitals)

9. **Performance Optimization** (Medium Priority)
   - Profile memory usage
   - Optimize segment buffer size
   - Verify Core Web Vitals targets

---

## APPROVAL CONDITIONS

This plan will receive **FULL APPROVAL** when the following conditions are met:

### Blocking Conditions (Must Fix)
- [ ] HLS.js segment interception architecture fully specified (Section 1.4.1)
- [ ] Binary WebSocket protocol specified (replace Base64)
- [ ] Glass Components used for all UI (fix Section 1.5.1)
- [ ] Complete TypeScript types defined
- [ ] File structure updated in Appendix A

### High Priority Conditions (Strongly Recommended)
- [ ] WebSocket connection state machine specified
- [ ] Accessibility requirements specified (WCAG 2.1 AA)
- [ ] Core Web Vitals performance budget specified
- [ ] Playwright E2E tests specified

### Medium Priority Conditions (Recommended)
- [ ] Safari compatibility workaround specified
- [ ] Browser support matrix included
- [ ] Responsive design specifications added

---

## FINAL VERDICT

**APPROVAL STATUS**: ⚠️ **CONDITIONAL APPROVAL**

**Summary**: The plan has a solid architectural foundation with excellent security hardening, service separation (SOLID principles), and cross-platform support. However, it contains **critical gaps in web frontend implementation** that must be addressed before proceeding.

**Key Strengths**:
- Security-first FFmpeg hardening with Docker sandboxing
- Clean service architecture (no SRP violations)
- Good UX transparency with delay indicators
- Infrastructure as Code with Terraform
- Comprehensive platform support (iOS/Web/Android/tvOS)

**Critical Gaps**:
- HLS.js segment interception is placeholder code, not working architecture
- Base64 encoding overhead not addressed ($10,800/month waste potential)
- Glass Components library ignored (CLAUDE.md violation)
- StyleSheet.create() used for web (React Native API, not web)
- Missing TypeScript types, accessibility specs, performance budgets

**Recommendation**: **Address all blocking conditions before implementation**. The HLS.js architecture gap is particularly critical - attempting implementation without a complete segment interception strategy will result in failed integration or severe performance issues.

**Estimated Effort to Fix**: 16-24 hours to address all blocking conditions and document complete web frontend architecture.

**Risk Assessment**:
- **High Risk**: Proceeding without fixing HLS.js architecture
- **Medium Risk**: Proceeding without binary WebSocket protocol
- **Low Risk**: Proceeding without accessibility/performance specs (can be added incrementally)

---

## REVIEWER SIGNATURE

**Reviewed By**: Frontend Developer (Web Specialist)
**Date**: 2026-01-23
**Status**: ⚠️ Conditional Approval
**Next Review Required**: After critical changes implemented

---

**END OF REVIEW**
