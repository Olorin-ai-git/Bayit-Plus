/**
 * Buffered Live Dubbing Player
 *
 * Simplified approach: Use HLS.js with increased buffer for delayed playback.
 * This allows time for dubbing pipeline (STT → Translation → TTS) to complete
 * before corresponding video segment plays.
 *
 * User sees live stream with 5-second delay, but dubbed audio arrives in sync.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import Hls from 'hls.js'

interface DubbedSegment {
  audio: ArrayBuffer  // Dubbed audio data (MP3/PCM)
  startTime: number   // Video timestamp this audio corresponds to
  duration: number    // Duration in seconds
  text: string        // Translated text
}

interface BufferedLiveDubbingPlayerProps {
  streamUrl: string
  videoRef?: React.RefObject<HTMLVideoElement> // Optional ref to expose video element to parent
  onError?: (error: string) => void
  // Callback to notify parent when player is ready to receive dubbed audio
  onPlayerReady?: (addSegment: (audio: ArrayBuffer, text: string) => void) => void
}

// Buffer duration: how long to delay live stream (allows dubbing to complete)
const BUFFER_DURATION = 5 // seconds

export const BufferedLiveDubbingPlayer: React.FC<BufferedLiveDubbingPlayerProps> = ({
  streamUrl,
  videoRef: externalVideoRef,
  onError,
  onPlayerReady,
}) => {
  // Use external ref if provided, otherwise create internal one
  const internalVideoRef = useRef<HTMLVideoElement>(null)
  const videoRef = externalVideoRef || internalVideoRef
  const hlsRef = useRef<Hls | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Dubbed audio queue (keyed by video timestamp)
  const dubbedQueueRef = useRef<Map<number, DubbedSegment>>(new Map())

  // Current playback state
  const [isBuffering, setIsBuffering] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const currentTimeRef = useRef(0)

  /**
   * Initialize HLS.js with buffering configuration for delayed playback
   */
  const initializeHLS = useCallback(() => {
    if (!videoRef.current) {
      console.warn('[BufferedPlayer] Video ref not available yet, cannot initialize HLS')
      return
    }

    // Prevent re-initialization if HLS is already running
    if (hlsRef.current) {
      console.log('[BufferedPlayer] HLS already initialized, skipping')
      return
    }

    console.log('[BufferedPlayer] Starting HLS initialization...')

    if (!Hls.isSupported()) {
      // Fallback for browsers with native HLS support (Safari)
      if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamUrl
        setIsReady(true)
        setIsBuffering(false)
      } else {
        onError?.('HLS not supported in this browser')
      }
      return
    }

    const hls = new Hls({
      // Buffering configuration for 5-second delay
      maxBufferLength: BUFFER_DURATION + 5, // Keep 10 seconds buffered
      maxMaxBufferLength: BUFFER_DURATION + 10, // Max 15 seconds
      liveSyncDuration: BUFFER_DURATION, // Target delay from live edge
      liveMaxLatencyDuration: BUFFER_DURATION + 10, // Max allowed delay
      lowLatencyMode: false, // Disable low-latency optimizations
      backBufferLength: 30, // Keep 30 seconds of back buffer
    })

    hlsRef.current = hls
    hls.loadSource(streamUrl)
    hls.attachMedia(videoRef.current) // ATTACH to video element (not manual buffering)

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('[BufferedPlayer] HLS manifest loaded, starting buffering')
      setIsBuffering(true)
    })

    hls.on(Hls.Events.BUFFER_CREATED, () => {
      console.log('[BufferedPlayer] Buffer created')
    })

    hls.on(Hls.Events.FRAG_BUFFERED, () => {
      // Check buffer length
      if (videoRef.current && videoRef.current.buffered.length > 0) {
        const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
        const currentTime = videoRef.current.currentTime
        const bufferedDuration = bufferedEnd - currentTime

        // Start playback once we have enough buffer
        if (bufferedDuration >= BUFFER_DURATION) {
          console.log(`[BufferedPlayer] Buffer ready (${bufferedDuration.toFixed(1)}s), starting playback`)
          setIsBuffering(false)
          setIsReady(true)
          videoRef.current.play().catch((err) => {
            console.error('[BufferedPlayer] Autoplay failed:', err)
          })
        }
      }
    })

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('[BufferedPlayer] HLS error:', data)
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log('[BufferedPlayer] Network error, attempting recovery')
            hls.startLoad()
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('[BufferedPlayer] Media error, attempting recovery')
            hls.recoverMediaError()
            break
          default:
            onError?.(data.details)
            hls.destroy()
            break
        }
      }
    })
  }, [streamUrl, onError])


  /**
   * Add dubbed audio segment to queue (called by parent component)
   */
  const addDubbedSegment = useCallback((audioData: ArrayBuffer, text: string) => {
    const currentTime = videoRef.current?.currentTime || 0
    const segment: DubbedSegment = {
      audio: audioData,
      startTime: currentTime + BUFFER_DURATION, // Sync with buffered video
      duration: 2.0, // Approximate duration
      text: text,
    }
    console.log(`[BufferedPlayer] Queuing dubbed audio for time ${segment.startTime}s: "${text.substring(0, 30)}..."`)
    dubbedQueueRef.current.set(segment.startTime, segment)
  }, [])

  /**
   * Play dubbed audio for current video time
   */
  const playDubbedAudioForTime = useCallback(async (videoTime: number) => {
    // Find dubbed segment for this time (within 0.5s tolerance)
    let matchedSegment: DubbedSegment | null = null
    let matchedTime: number | null = null

    for (const [time, segment] of dubbedQueueRef.current.entries()) {
      if (Math.abs(time - videoTime) < 0.5) {
        matchedSegment = segment
        matchedTime = time
        break
      }
    }

    if (!matchedSegment || matchedTime === null) {
      console.log(`[BufferedPlayer] No dubbed audio for time ${videoTime}s`)
      return
    }

    console.log(`[BufferedPlayer] Playing dubbed audio for time ${matchedTime}s: "${matchedSegment.text}"`)

    // Create audio context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 44100 })
    }

    try {
      // Decode dubbed audio
      const audioBuffer = await audioContextRef.current.decodeAudioData(
        matchedSegment.audio.slice(0) // Clone buffer
      )

      // Create source and play
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start()

      // Remove from queue after playing
      dubbedQueueRef.current.delete(matchedTime)

      console.log(`[BufferedPlayer] Dubbed audio playing (duration: ${audioBuffer.duration}s)`)
    } catch (error) {
      console.error('[BufferedPlayer] Error playing dubbed audio:', error)
    }
  }, [])

  /**
   * Video timeupdate handler - check for dubbed audio
   */
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return

    const currentTime = videoRef.current.currentTime

    // Check every second for new dubbed audio
    if (Math.floor(currentTime) !== Math.floor(currentTimeRef.current)) {
      playDubbedAudioForTime(currentTime)
    }

    currentTimeRef.current = currentTime
  }, [playDubbedAudioForTime])

  /**
   * Initialize on mount - only once
   * Note: In React StrictMode (development), this effect will run twice
   */
  useEffect(() => {
    console.log('[BufferedPlayer] Component mounted, attempting initialization')
    console.log('[BufferedPlayer] Video ref available:', !!videoRef.current)
    console.log('[BufferedPlayer] HLS ref status:', hlsRef.current ? 'already initialized' : 'not initialized')

    // Small delay to ensure video ref is available
    const timer = setTimeout(() => {
      initializeHLS()
    }, 50)

    return () => {
      // Cleanup
      clearTimeout(timer)
      console.log('[BufferedPlayer] Component unmounting, destroying HLS')
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Notify parent when player is ready to receive dubbed audio
   * Only notify once to prevent infinite loop
   */
  const hasNotifiedRef = useRef(false)
  useEffect(() => {
    if (isReady && onPlayerReady && !hasNotifiedRef.current) {
      console.log('[BufferedPlayer] Player ready, notifying parent')
      onPlayerReady(addDubbedSegment)
      hasNotifiedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, addDubbedSegment])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%' }}
        onTimeUpdate={handleTimeUpdate}
        // NOT muted - audio needs to be captured by liveDubbingService
        // liveDubbingService will route audio through gain nodes (original muted, dubbed audible)
      />

      {isBuffering && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
            Buffering Live Stream
          </div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            Building {BUFFER_DURATION}s buffer for synchronized dubbing...
          </div>
        </div>
      )}
    </div>
  )
}
