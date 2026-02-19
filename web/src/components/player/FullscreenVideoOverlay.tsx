/**
 * FullscreenVideoOverlay Component
 * A fullscreen video player overlay that can be triggered from anywhere in the app
 * Includes quiz feature for kids content
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { View, Pressable, Text, Image, StyleSheet } from 'react-native'
import { GlassLoadingSpinner } from '@bayit/shared/ui'
import { X, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import { useFullscreenPlayerStore } from '@/stores/fullscreenPlayerStore'
import { usePlaylistPlaybackStore } from '@bayit/shared/stores'
import { contentService, liveService, radioService, podcastService, chaptersService, historyService } from '@/services/api'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import VideoPlayer from './VideoPlayer'
import AudioPlayer from './AudioPlayer'
import logger from '@/utils/logger'
import { useNotificationStore } from '@olorin/glass-ui/stores'
import { QuizOverlay } from '@bayit/shared/components/quiz'
import { useProfileStore } from '@/stores/profileStore'
import { AvatarDialoguePanel, CharacterSelectBar } from '@/components/vod-interactions'
import { useVODInteraction } from '@/hooks/useVODInteraction'
import type { ContentCharacter } from '@/hooks/useVODInteraction'

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
  const { t, i18n: i18nInstance } = useTranslation()
  const { isOpen, content, startTime, closePlayer } = useFullscreenPlayerStore()
  const addNotification = useNotificationStore((state) => state.add)
  const activeProfile = useProfileStore((state) => state.activeProfile)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chaptersLoading, setChaptersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const [savedPosition, setSavedPosition] = useState<number | null>(null)
  const [nextEpisode, setNextEpisode] = useState<{ id: string; title: string; thumbnail?: string; episode_number: number } | null>(null)
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastProgressRef = useRef<number>(0)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Free-form character dialogue (delegated to hook)
  const [showCharacterSelect, setShowCharacterSelect] = useState(false)
  const [showDialoguePanel, setShowDialoguePanel] = useState(false)
  const noop = useCallback(() => {}, [])
  const vodInteraction = useVODInteraction({
    contentId: content?.id ?? '',
    profileId: activeProfile?.id ?? '',
    avatarId: '',
    currentTime: 0,
    onPauseRequested: noop,
    onResumeRequested: noop,
  })

  // Determine if quiz should be shown after content ends
  // Quiz shows for all kids content regardless of profile type
  const shouldShowQuiz = content?.is_kids_content === true
  const isRTL = i18nInstance.dir() === 'rtl'
  const isAudioContent = content?.type === 'podcast' || content?.type === 'radio'

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
        let streamUrl: string | undefined

        if (content.type === 'podcast') {
          // Podcast episodes: GET /podcasts/{id} returns latestEpisode.audioUrl
          const show = await podcastService.getShow(content.id)
          streamUrl = show?.latestEpisode?.audioUrl
        } else if (content.type === 'radio') {
          const stream = await radioService.getStreamUrl(content.id)
          streamUrl = stream?.url
        } else if (content.type === 'live') {
          const stream = await liveService.getStreamUrl(content.id)
          streamUrl = stream?.url
        } else {
          const stream = await contentService.getStreamUrl(content.id)
          streamUrl = stream?.url
        }

        if (streamUrl) {
          logger.info('Stream URL resolved', 'FullscreenVideoOverlay', {
            contentId: content.id,
            contentType: content.type,
            isAudio: content.type === 'podcast' || content.type === 'radio',
          })
          setStreamUrl(streamUrl)
        } else {
          logger.error('No stream URL in response', 'FullscreenVideoOverlay', {
            contentId: content.id,
            contentType: content.type,
          })
          setError(i18n.t('errors.player.noStreamUrl'))
        }
      } catch (err: any) {
        logger.error('Failed to fetch stream URL', 'FullscreenVideoOverlay', err)

        // Handle 401 Unauthorized - user needs to sign in
        if (err?.status === 401 || err?.response?.status === 401) {
          addNotification({
            level: 'warning',
            message: t('auth.signInRequired', 'Please sign in to watch this content'),
            title: t('auth.signInRequiredTitle', 'Sign In Required'),
            duration: 5000,
          })
          closePlayer()
        } else {
          setError(i18n.t('errors.player.loadFailed'))
        }
      } finally {
        setLoading(false)
      }
    }

    fetchStream()
  }, [isOpen, content?.id, content?.type, content?.src, t, addNotification, closePlayer])

  // Fetch saved watch position for VOD content
  useEffect(() => {
    if (!isOpen || !content || content.type === 'live') {
      setSavedPosition(null)
      return
    }

    logger.info('Fetching watch history for overlay', 'FullscreenVideoOverlay', {
      contentId: content.id,
    })

    historyService
      .getContinueWatching()
      .then((response) => {
        const items = Array.isArray(response) ? response : response?.items
        logger.info('Watch history received in overlay', 'FullscreenVideoOverlay', {
          itemsCount: items?.length || 0,
        })
        if (!Array.isArray(items)) {
          logger.info('No watch history items found in overlay', 'FullscreenVideoOverlay')
          return
        }
        const saved = items.find((i) => i.id === content.id)
        if (saved?.position > 0) {
          setSavedPosition(saved.position)
          logger.info('Set saved watch position in overlay', 'FullscreenVideoOverlay', {
            contentId: content.id,
            position: saved.position,
          })
        } else {
          logger.info('No saved position found in overlay', 'FullscreenVideoOverlay', {
            contentId: content.id,
          })
        }
      })
      .catch((err) => {
        logger.error('Failed to fetch watch history in overlay', 'FullscreenVideoOverlay', {
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      })
  }, [isOpen, content?.id, content?.type])

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
  const handleProgress = useCallback(
    async (currentTime: number, duration: number) => {
      if (!content) return

      try {
        const percentage = (currentTime / duration) * 100

        // Mark complete at 90% (send duration, not 0)
        const position = percentage >= 90 ? duration : currentTime

        await historyService.updateProgress(content.id, content.type, position, duration)

        // Show completion notification once at 90%
        if (percentage >= 90 && percentage < 91) {
          addNotification({
            level: 'success',
            message: t('watch.markedAsWatched', 'Marked as watched'),
            duration: 3000,
          })
        }
      } catch (error) {
        logger.error('Failed to save watch progress in overlay', 'FullscreenVideoOverlay', {
          error: error instanceof Error ? error.message : 'Unknown error',
          contentId: content.id,
          currentTime,
          duration,
        })
        // Silent fail - don't interrupt playback
      }
    },
    [content?.id, content?.type, addNotification, t]
  )

  // Advance to next playlist item or close the player
  const advancePlaylistOrClose = useCallback(() => {
    const playbackStore = usePlaylistPlaybackStore.getState()
    if (playbackStore.isPlayAllActive) {
      const nextItem = playbackStore.playNext()
      if (nextItem) {
        const { openPlayer } = useFullscreenPlayerStore.getState()
        openPlayer({
          id: nextItem.id,
          title: nextItem.title,
          src: '',
          type: (nextItem.type as 'movie' | 'series' | 'live' | 'vod' | 'audiobook' | 'podcast' | 'radio') || 'vod',
          poster: nextItem.thumbnail,
        })
        return true
      }
    }
    return false
  }, [])

  // Fetch next episode for series auto-play
  const fetchNextEpisode = useCallback(async () => {
    if (!content?.seriesId || !content?.seasonNumber) return null
    try {
      const data = await contentService.getSeasonEpisodes(content.seriesId, content.seasonNumber)
      const episodes = data?.episodes || []
      const currentIndex = episodes.findIndex((ep: any) => ep.id === content.id)
      if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
        return episodes[currentIndex + 1]
      }
    } catch (err) {
      logger.debug('Failed to fetch next episode', 'FullscreenVideoOverlay')
    }
    return null
  }, [content?.seriesId, content?.seasonNumber, content?.id])

  // Start auto-play countdown for next episode
  const startAutoPlayCountdown = useCallback((episode: { id: string; title: string; thumbnail?: string; episode_number: number }) => {
    setNextEpisode(episode)
    setAutoPlayCountdown(10)
  }, [])

  // Cancel auto-play countdown
  const cancelAutoPlay = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    setNextEpisode(null)
    setAutoPlayCountdown(null)
  }, [])

  // Play the next episode
  const playNextEpisode = useCallback(() => {
    if (!nextEpisode || !content) return
    cancelAutoPlay()
    const { openPlayer } = useFullscreenPlayerStore.getState()
    openPlayer({
      id: nextEpisode.id,
      title: `${content.title?.split(' - ')[0]} - ${nextEpisode.title}`,
      src: '',
      poster: nextEpisode.thumbnail || content.poster,
      type: 'series',
      seriesId: content.seriesId,
      episodeId: nextEpisode.id,
      seasonNumber: content.seasonNumber,
      episodeNumber: nextEpisode.episode_number,
      is_kids_content: content.is_kids_content,
    })
  }, [nextEpisode, content, cancelAutoPlay])

  // Countdown timer effect
  useEffect(() => {
    if (autoPlayCountdown === null) return
    if (autoPlayCountdown <= 0) {
      playNextEpisode()
      return
    }
    countdownTimerRef.current = setInterval(() => {
      setAutoPlayCountdown((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }
  }, [autoPlayCountdown, playNextEpisode])

  // Clean up countdown on unmount/close
  useEffect(() => {
    if (!isOpen) cancelAutoPlay()
  }, [isOpen, cancelAutoPlay])

  // Free-form dialogue: load characters
  const handleTalkToCharacter = useCallback(async () => {
    if (!content) return
    await vodInteraction.loadCharacters()
    setShowCharacterSelect(true)
  }, [content?.id, vodInteraction.loadCharacters])

  // Free-form dialogue: start session with selected character
  const handleCharacterSelect = useCallback(async (character: ContentCharacter) => {
    setShowCharacterSelect(false)
    await vodInteraction.startFreeInteraction(character)
    setShowDialoguePanel(true)
  }, [vodInteraction.startFreeInteraction])

  // Free-form dialogue: send message
  const handleSendDialogueMessage = useCallback(async (messageText: string) => {
    await vodInteraction.sendFreeMessage(messageText)
  }, [vodInteraction.sendFreeMessage])

  // Free-form dialogue: close panel
  const handleCloseDialogue = useCallback(async () => {
    await vodInteraction.endFreeInteraction()
    setShowDialoguePanel(false)
  }, [vodInteraction.endFreeInteraction])

  // Get video element for volume ducking in dialogue panel
  const getVideoElement = useCallback((): HTMLVideoElement | null => {
    return containerRef.current?.querySelector('video') || null
  }, [])

  // Handle video ended
  const handleEnded = useCallback(() => {
    if (!content) return

    // Show quiz for kids content - quiz handlers will advance playlist after
    if (shouldShowQuiz) {
      setShowQuiz(true)
      return
    }

    // If playlist "Play All" is active, advance to next item
    if (!advancePlaylistOrClose()) {
      // Auto-play next episode for series content
      if (content.type === 'series' && content.seriesId) {
        fetchNextEpisode().then((ep) => {
          if (ep) {
            startAutoPlayCountdown(ep)
          } else {
            logger.debug('No next episode available', 'FullscreenVideoOverlay')
          }
        })
      } else {
        logger.debug('Content ended, no playlist active', 'FullscreenVideoOverlay')
      }
    }
  }, [content?.id, content?.type, content?.seriesId, shouldShowQuiz, advancePlaylistOrClose, fetchNextEpisode, startAutoPlayCountdown])

  // Handle restart complete
  const handleRestartComplete = useCallback(() => {
    setSavedPosition(null)
    logger.info('Watch position cleared after restart in overlay', 'FullscreenVideoOverlay', {
      contentId: content?.id,
    })
  }, [content?.id])

  // Handle quiz close - after quiz, check for next playlist item
  const handleQuizClose = useCallback(() => {
    setShowQuiz(false)
    if (!advancePlaylistOrClose()) {
      closePlayer()
    }
  }, [closePlayer, advancePlaylistOrClose])

  // Handle quiz complete - same as quiz close
  const handleQuizComplete = useCallback(() => {
    setShowQuiz(false)
    if (!advancePlaylistOrClose()) {
      closePlayer()
    }
  }, [closePlayer, advancePlaylistOrClose])

  // Handle manual player close (ESC key, close button, etc.)
  // Resets playlist play-all state if active
  const handleManualClose = useCallback(() => {
    vodInteraction.endFreeInteraction()
    setShowDialoguePanel(false)
    setShowCharacterSelect(false)
    usePlaylistPlaybackStore.getState().stopPlayAll()
    closePlayer()
  }, [closePlayer, vodInteraction.endFreeInteraction])

  // Handle close with ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleManualClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleManualClose])

  // Request fullscreen on open (skip for audio-only content like podcasts/radio)
  useEffect(() => {
    if (isOpen && containerRef.current && !isAudioContent) {
      containerRef.current.requestFullscreen?.().catch(() => {
        // Fullscreen request may fail, continue anyway
      })
    }
  }, [isOpen, isAudioContent])

  if (!isOpen || !content) return null

  const overlay = (
    <div
      ref={containerRef}
      style={webStyles.container}
      onClick={(e) => e.stopPropagation()}
    >
      <Pressable onPress={handleManualClose} style={styles.closeButton}>
        <X size={24} color={colors.text} />
      </Pressable>

      {loading && (
        <View style={styles.loadingContainer}>
          <GlassLoadingSpinner size="large" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={handleManualClose} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      )}

      {/* Audio Player for podcast/radio content */}
      {streamUrl && !loading && !error && isAudioContent && (
        <View style={styles.audioPlayerContainer}>
          <AudioPlayer
            src={streamUrl}
            title={content.title}
            cover={content.poster}
            isLive={content.type === 'radio'}
            autoPlay={true}
            onEnded={handleEnded}
            onProgress={handleProgress}
          />
        </View>
      )}

      {/* Video Player - YouTube iframe or native player */}
      {streamUrl && !loading && !error && !isAudioContent && (
        isYouTubeUrl(streamUrl) ? (
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
          (() => {
            const isHLS = streamUrl.toLowerCase().includes('.m3u8');

            logger.info('Rendering VideoPlayer with initial subtitle', 'FullscreenVideoOverlay', {
              contentId: content.id,
              initialSubtitleLang: content.initialSubtitleLang,
              savedPosition,
              isHLS,
            });
            return (
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
                savedPosition={savedPosition}
                onRestartComplete={handleRestartComplete}
                initialSubtitleLang={content.initialSubtitleLang}
                isHLS={isHLS}
              />
            );
          })()
        )
      )}

      {/* Next Episode Auto-Play Overlay */}
      {nextEpisode && autoPlayCountdown !== null && (
        <View style={styles.nextEpisodeOverlay}>
          <View style={styles.nextEpisodeCard}>
            {nextEpisode.thumbnail && (
              <Image
                source={{ uri: nextEpisode.thumbnail }}
                style={styles.nextEpisodeThumbnail}
                resizeMode="cover"
              />
            )}
            <View style={styles.nextEpisodeInfo}>
              <Text style={styles.nextEpisodeLabel}>
                {t('player.nextEpisode', 'Next Episode')}
              </Text>
              <Text style={styles.nextEpisodeTitle} numberOfLines={2}>
                {t('content.episode')} {nextEpisode.episode_number}: {nextEpisode.title}
              </Text>
              <Text style={styles.nextEpisodeCountdown}>
                {t('player.playingIn', { seconds: autoPlayCountdown })}
              </Text>
            </View>
            <View style={styles.nextEpisodeActions}>
              <Pressable onPress={playNextEpisode} style={styles.nextEpisodePlayBtn}>
                <Text style={styles.nextEpisodePlayText}>{t('player.playNow', 'Play Now')}</Text>
              </Pressable>
              <Pressable onPress={cancelAutoPlay} style={styles.nextEpisodeCancelBtn}>
                <Text style={styles.nextEpisodeCancelText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Talk to Character Button (VOD only, non-audio) */}
      {!loading && !error && streamUrl && !isAudioContent && content.type !== 'live' && (
        <Pressable
          onPress={handleTalkToCharacter}
          style={[
            styles.talkButton,
            vodInteraction.isFreeDialogueActive && styles.talkButtonActive,
          ]}
        >
          <MessageCircle size={20} color={vodInteraction.isFreeDialogueActive ? '#c084fc' : colors.text} />
          <Text style={[
            styles.talkButtonText,
            vodInteraction.isFreeDialogueActive && styles.talkButtonTextActive,
          ]}>{t('player.dialogue.talkToCharacter')}</Text>
        </Pressable>
      )}

      {/* Character Selection Bar */}
      {showCharacterSelect && (
        <View style={styles.characterSelectOverlay}>
          <CharacterSelectBar
            characters={vodInteraction.availableCharacters}
            onSelect={handleCharacterSelect}
            onClose={() => setShowCharacterSelect(false)}
          />
        </View>
      )}

      {/* Free-form Dialogue Panel */}
      {showDialoguePanel && vodInteraction.selectedCharacter && (
        <AvatarDialoguePanel
          character={vodInteraction.selectedCharacter}
          avatarImageUrl={activeProfile?.avatar_url || ''}
          exchanges={vodInteraction.freeDialogueExchanges}
          isSending={vodInteraction.isSending}
          videoElement={getVideoElement()}
          onSendMessage={handleSendDialogueMessage}
          onClose={handleCloseDialogue}
        />
      )}

      {/* Quiz Overlay for Kids Content */}
      {showQuiz && activeProfile && (
        <QuizOverlay
          visible={showQuiz}
          contentId={content.id}
          profileId={activeProfile.id}
          ageGroup={content.age_group || 'elementary'}
          language={i18nInstance.language}
          isRTL={isRTL}
          onClose={handleQuizClose}
          onComplete={handleQuizComplete}
        />
      )}
    </div>
  )

  // Render via portal to ensure it's on top of everything
  return typeof document !== 'undefined'
    ? createPortal(overlay, document.body)
    : null
}

const styles = StyleSheet.create({
  closeButton: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
  },
  audioPlayerContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: spacing[4],
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  errorButton: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.DEFAULT,
  },
  errorButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  nextEpisodeOverlay: {
    position: 'absolute',
    bottom: spacing[8],
    right: spacing[8],
    zIndex: 10002,
  },
  nextEpisodeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 10, 20, 0.92)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.5)',
    maxWidth: 460,
  },
  nextEpisodeThumbnail: {
    width: 140,
    height: 80,
  },
  nextEpisodeInfo: {
    flex: 1,
    padding: spacing[3],
    justifyContent: 'center',
  },
  nextEpisodeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(168, 85, 247, 1)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  nextEpisodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  nextEpisodeCountdown: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  nextEpisodeActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  nextEpisodePlayBtn: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  nextEpisodePlayText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  nextEpisodeCancelBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  nextEpisodeCancelText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  talkButton: {
    position: 'absolute',
    top: spacing[4],
    left: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10001,
  },
  talkButtonActive: {
    backgroundColor: 'rgba(107, 33, 168, 0.6)',
  },
  talkButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  talkButtonTextActive: {
    color: '#c084fc',
  },
  characterSelectOverlay: {
    position: 'absolute',
    bottom: spacing[8],
    left: 0,
    right: 0,
    zIndex: 10003,
    alignItems: 'center',
  },
})

const webStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
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
