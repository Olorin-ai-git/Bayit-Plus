import { useRef, useEffect } from 'react'
import Hls from 'hls.js'
import logger from '@/utils/logger'

interface UseHLSPlayerOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  streamUrl: string
  isLive: boolean
  autoPlay: boolean
  onReady: () => void
}

export function useHLSPlayer({
  videoRef,
  streamUrl,
  isLive,
  autoPlay,
  onReady,
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
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onReady()
        if (autoPlay) {
          // Try to play with sound first, if blocked by autoplay policy, play muted
          video.play().catch(() => {
            video.muted = true
            video.play().catch((e) => {
              logger.warn('Autoplay blocked even when muted', 'useHLSPlayer', e)
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
      video.src = streamUrl
      video.addEventListener('loadedmetadata', () => {
        onReady()
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true
            video.play().catch((e) => {
              logger.warn('Autoplay blocked even when muted', 'useHLSPlayer', e)
            })
          })
        }
      })
    } else {
      video.src = streamUrl
      video.addEventListener('loadeddata', () => {
        onReady()
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true
            video.play().catch((e) => {
              logger.warn('Autoplay blocked even when muted', 'useHLSPlayer', e)
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
  }, [streamUrl, isLive, autoPlay, videoRef, onReady])

  return { hlsRef }
}
