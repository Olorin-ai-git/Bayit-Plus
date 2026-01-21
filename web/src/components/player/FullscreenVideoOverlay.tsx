/**
 * FullscreenVideoOverlay Component
 * A fullscreen video player overlay that can be triggered from anywhere in the app
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { View, Pressable, ActivityIndicator, Text } from 'react-native'
import { X } from 'lucide-react'
import { useFullscreenPlayerStore } from '@/stores/fullscreenPlayerStore'
import { contentService, liveService, chaptersService, historyService } from '@/services/api'
import { colors } from '@bayit/shared/theme'
import VideoPlayer from './VideoPlayer'
import logger from '@/utils/logger'

interface Chapter {
  start_time: number
  end_time: number
  title?: string
}

/**
 * Check if a URL is a YouTube URL (any format)
 */
function isYouTubeUrl(url: string | null): boolean {
  if (!url) return false
  const lowerUrl = url.toLowerCase()
  return lowerUrl.includes('youtube.com/') || lowerUrl.includes('youtu.be/')
}

/**
 * Extract YouTube video ID from URL
 */
function getYouTubeVideoId(url: string): string | null {
  // Match youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/)
  if (embedMatch) return embedMatch[1]

  // Match youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/)
  if (shortMatch) return shortMatch[1]

  // Match youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/)
  if (watchMatch) return watchMatch[1]

  return null
}

export default function FullscreenVideoOverlay() {
  const { isOpen, content, startTime, closePlayer } = useFullscreenPlayerStore()
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chaptersLoading, setChaptersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastProgressRef = useRef<number>(0)

  // Fetch stream URL when content changes (unless src is already provided)
  useEffect(() => {
    if (!isOpen || !content) {
      setStreamUrl(null)
      setChapters([])
      setLoading(true)
      setError(null)
      return
    }

    // If src is already provided (e.g., for trailers), use it directly
    if (content.src) {
      setStreamUrl(content.src)
      setLoading(false)
      return
    }

    const fetchStream = async () => {
      setLoading(true)
      setError(null)
      try {
        let stream: { url?: string } | undefined

        if (content.type === 'live') {
          stream = await liveService.getStreamUrl(content.id)
        } else {
          stream = await contentService.getStreamUrl(content.id)
        }

        if (stream?.url) {
          setStreamUrl(stream.url)
        } else {
          setError('No stream URL available')
        }
      } catch (err) {
        logger.error('Failed to fetch stream URL', 'FullscreenVideoOverlay', err)
        setError('Failed to load video')
      } finally {
        setLoading(false)
      }
    }

    fetchStream()
  }, [isOpen, content?.id, content?.type, content?.src])

  // Fetch chapters for VOD content
  useEffect(() => {
    if (!isOpen || !content || content.type === 'live') {
      setChapters([])
      return
    }

    const fetchChapters = async () => {
      setChaptersLoading(true)
      try {
        const chaptersData = await chaptersService.getChapters(content.id)
        if (chaptersData && Array.isArray(chaptersData)) {
          setChapters(chaptersData)
        }
      } catch (err) {
        // Chapters are optional, don't show error
        logger.debug('No chapters available', 'FullscreenVideoOverlay')
      } finally {
        setChaptersLoading(false)
      }
    }

    fetchChapters()
  }, [isOpen, content?.id, content?.type])

  // Handle progress updates for watch history
  const handleProgress = useCallback((currentTime: number, duration: number) => {
    if (!content) return

    // Update every 10 seconds
    if (Math.abs(currentTime - lastProgressRef.current) >= 10) {
      lastProgressRef.current = currentTime
      historyService.updateProgress(content.id, currentTime, duration).catch(() => {})
    }
  }, [content?.id])

  // Handle video ended
  const handleEnded = useCallback(() => {
    if (!content) return
    // Mark as completed
    historyService.updateProgress(content.id, 0, 0).catch(() => {})
  }, [content?.id])

  // Handle close with ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePlayer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closePlayer])

  // Request fullscreen on open
  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.requestFullscreen?.().catch(() => {
        // Fullscreen request may fail, continue anyway
      })
    }
  }, [isOpen])

  if (!isOpen || !content) return null

  const overlay = (
    <div
      ref={containerRef}
      style={webStyles.container}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close button */}
      <Pressable
        onPress={closePlayer}
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-black/60 items-center justify-center z-[10001] hover:bg-black/80"
      >
        <X size={24} color={colors.text} />
      </Pressable>

      {/* Loading state */}
      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-white text-base mt-4">Loading...</Text>
        </View>
      )}

      {/* Error state */}
      {error && !loading && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-red-500 text-lg text-center mb-4">{error}</Text>
          <Pressable onPress={closePlayer} className="px-8 py-4 rounded-lg" style={{ backgroundColor: colors.primary }}>
            <Text className="text-white text-base font-semibold">Close</Text>
          </Pressable>
        </View>
      )}

      {/* Video Player - YouTube iframe or native player */}
      {streamUrl && !loading && !error && (
        isYouTubeUrl(streamUrl) ? (
          // YouTube content - use iframe embed
          <div style={webStyles.youtubeContainer}>
            <iframe
              src={`https://www.youtube.com/embed/${getYouTubeVideoId(streamUrl)}?autoplay=1&rel=0&modestbranding=1`}
              style={webStyles.youtubeIframe}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              title={content.title}
            />
          </div>
        ) : (
          // Regular video content - use native player
          <VideoPlayer
            src={streamUrl}
            poster={content.poster}
            title={content.title}
            contentId={content.id}
            contentType={content.type}
            isLive={content.type === 'live'}
            autoPlay={true}
            chapters={chapters}
            chaptersLoading={chaptersLoading}
            onProgress={handleProgress}
            onEnded={handleEnded}
          />
        )
      )}
    </div>
  )

  // Render via portal to ensure it's on top of everything
  return typeof document !== 'undefined'
    ? createPortal(overlay, document.body)
    : null
}

const webStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 10000,
  },
  youtubeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
}
