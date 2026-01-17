/**
 * FullscreenVideoOverlay Component
 * A fullscreen video player overlay that can be triggered from anywhere in the app
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { View, StyleSheet, Pressable, ActivityIndicator, Text } from 'react-native'
import { X } from 'lucide-react'
import { useFullscreenPlayerStore } from '@/stores/fullscreenPlayerStore'
import { contentService, liveService, chaptersService, historyService } from '@/services/api'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import VideoPlayer from './VideoPlayer'
import logger from '@/utils/logger'

interface Chapter {
  start_time: number
  end_time: number
  title?: string
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
        style={({ hovered }) => [
          styles.closeButton,
          hovered && styles.closeButtonHovered,
        ]}
      >
        <X size={24} color={colors.text} />
      </Pressable>

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Error state */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={closePlayer} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Close</Text>
          </Pressable>
        </View>
      )}

      {/* Video Player */}
      {streamUrl && !loading && !error && (
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
}

const styles = StyleSheet.create({
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
  },
  closeButtonHovered: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: colors.error,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  errorButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
})
