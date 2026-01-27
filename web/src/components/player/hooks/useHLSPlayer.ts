import { useRef, useEffect } from 'react'
import Hls from 'hls.js'
import logger from '@/utils/logger'

interface UseHLSPlayerOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  streamUrl: string
  isLive: boolean
  autoPlay: boolean
  onReady: () => void
  onAutoplayMuted?: () => void
}

export function useHLSPlayer({
  videoRef,
  streamUrl,
  isLive,
  autoPlay,
  onReady,
  onAutoplayMuted,
}: UseHLSPlayerOptions) {
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return

    const video = videoRef.current

    if (Hls.isSupported() && streamUrl.includes('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
      })
      hlsRef.current = hls
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        onReady()
        // Check audio tracks in the stream
        const hasAudioTracks = (data.audioTracks?.length || 0) > 0
        const audioTrackDetails = data.audioTracks?.map((t: any) => ({
          id: t.id,
          name: t.name,
          lang: t.lang,
          default: t.default,
        })) || []
        logger.info('HLS manifest parsed', 'useHLSPlayer', {
          autoPlay,
          videoDOMMuted: video.muted,
          videoDOMVolume: video.volume,
          audioTracksCount: data.audioTracks?.length || 0,
          hasAudioTracks,
          audioTrackDetails,
          levels: data.levels?.length || 0,
          // Check if video element has audio tracks API support
          videoAudioTracksCount: (video as any).audioTracks?.length ?? 'not supported',
        })
        if (autoPlay) {
          // Ensure video starts unmuted
          video.muted = false
          video.volume = 1
          logger.info('Starting autoplay attempt', 'useHLSPlayer', {
            videoDOMMuted: video.muted,
            videoDOMVolume: video.volume,
            hasAudioTracks,
          })
          // Try to play with sound first, if blocked by autoplay policy, play muted
          video.play().then(() => {
            // Verify audio state after successful play
            logger.info('Autoplay succeeded', 'useHLSPlayer', {
              videoDOMMuted: video.muted,
              videoDOMVolume: video.volume,
              paused: video.paused,
              currentTime: video.currentTime,
              hasAudioTracks,
            })
            // If video is unexpectedly muted after play, something is wrong
            if (video.muted) {
              logger.warn('Video unexpectedly muted after autoplay success', 'useHLSPlayer')
            }
          }).catch((err) => {
            logger.info('Autoplay blocked by browser, trying muted', 'useHLSPlayer', {
              error: err.message,
              errorName: err.name,
            })
            video.muted = true
            onAutoplayMuted?.()
            video.play().then(() => {
              logger.info('Muted autoplay succeeded', 'useHLSPlayer', {
                videoDOMMuted: video.muted,
                videoDOMVolume: video.volume,
              })
            }).catch((e) => {
              logger.warn('Autoplay blocked even when muted', 'useHLSPlayer', {
                error: e.message,
                errorName: e.name,
              })
            })
          })
        }
      })
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          logger.error('HLS error', 'useHLSPlayer', data)
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = streamUrl
      video.addEventListener('loadedmetadata', () => {
        onReady()
        const audioTracksCount = (video as any).audioTracks?.length ?? 'not supported'
        logger.info('Safari HLS loadedmetadata', 'useHLSPlayer', {
          autoPlay,
          videoDOMMuted: video.muted,
          videoDOMVolume: video.volume,
          audioTracksCount,
          duration: video.duration,
        })
        if (autoPlay) {
          // Ensure video starts unmuted
          video.muted = false
          video.volume = 1
          logger.info('Starting autoplay attempt (Safari)', 'useHLSPlayer', {
            videoDOMMuted: video.muted,
            videoDOMVolume: video.volume,
          })
          video.play().then(() => {
            logger.info('Autoplay succeeded (Safari)', 'useHLSPlayer', {
              videoDOMMuted: video.muted,
              videoDOMVolume: video.volume,
              paused: video.paused,
            })
          }).catch((err) => {
            logger.info('Autoplay blocked (Safari), trying muted', 'useHLSPlayer', {
              error: err.message,
              errorName: err.name,
            })
            video.muted = true
            onAutoplayMuted?.()
            video.play().then(() => {
              logger.info('Muted autoplay succeeded (Safari)', 'useHLSPlayer')
            }).catch((e) => {
              logger.warn('Autoplay blocked even when muted (Safari)', 'useHLSPlayer', {
                error: e.message,
              })
            })
          })
        }
      })
    } else {
      // Fallback for non-HLS streams
      video.src = streamUrl
      video.addEventListener('loadeddata', () => {
        onReady()
        const audioTracksCount = (video as any).audioTracks?.length ?? 'not supported'
        logger.info('Video loadeddata (fallback)', 'useHLSPlayer', {
          autoPlay,
          videoDOMMuted: video.muted,
          videoDOMVolume: video.volume,
          audioTracksCount,
          duration: video.duration,
        })
        if (autoPlay) {
          // Ensure video starts unmuted
          video.muted = false
          video.volume = 1
          logger.info('Starting autoplay attempt (fallback)', 'useHLSPlayer', {
            videoDOMMuted: video.muted,
            videoDOMVolume: video.volume,
          })
          video.play().then(() => {
            logger.info('Autoplay succeeded (fallback)', 'useHLSPlayer', {
              videoDOMMuted: video.muted,
              videoDOMVolume: video.volume,
              paused: video.paused,
            })
          }).catch((err) => {
            logger.info('Autoplay blocked (fallback), trying muted', 'useHLSPlayer', {
              error: err.message,
              errorName: err.name,
            })
            video.muted = true
            onAutoplayMuted?.()
            video.play().then(() => {
              logger.info('Muted autoplay succeeded (fallback)', 'useHLSPlayer')
            }).catch((e) => {
              logger.warn('Autoplay blocked even when muted (fallback)', 'useHLSPlayer', {
                error: e.message,
              })
            })
          })
        }
      })
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [streamUrl, isLive, autoPlay, videoRef, onReady, onAutoplayMuted])

  return { hlsRef }
}
