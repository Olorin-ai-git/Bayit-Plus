/**
 * AudioPlayer Component
 * Two layout modes:
 * - Hero: Cover fills container, controls overlaid at bottom (WatchPage)
 * - Compact: Small horizontal player (widget containers)
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, Pressable, Image, StyleSheet } from 'react-native'
import { GlassLoadingSpinner } from '@bayit/shared/ui'
import { useTranslation } from 'react-i18next'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { Icon } from '@olorin/shared-icons/web'
import { colors, borderRadius, spacing } from '@olorin/design-tokens'
import { GlassView, GlassBadge, GlassSlider } from '@bayit/shared/ui'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { useDirection } from '@bayit/shared/hooks'
import { isTV } from '@bayit/shared/utils/platform'
import { useResponsive } from '@/hooks/useResponsive'
import { logger } from '@/utils/logger'
import VolumeControls from './controls/VolumeControls'

interface AudioPlayerProps {
  src: string
  title: string
  artist?: string
  cover?: string
  isLive?: boolean
  autoPlay?: boolean
  onEnded?: () => void
  onProgress?: (currentTime: number, duration: number) => void
  savedPosition?: number | null
  compact?: boolean
}

const SKIP_SECONDS = 15

export default function AudioPlayer({
  src,
  title,
  artist,
  cover,
  isLive = false,
  autoPlay = false,
  onEnded,
  onProgress,
  savedPosition,
  compact = false,
}: AudioPlayerProps) {
  const { t } = useTranslation()
  const { isRTL, flexDirection } = useDirection()
  const { isMobile } = useResponsive()
  const notifications = useNotifications()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasResumed = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const playFocus = useTVFocus({ styleType: 'button' })
  const skipBackFocus = useTVFocus({ styleType: 'button' })
  const skipForwardFocus = useTVFocus({ styleType: 'button' })

  // Size presets based on layout mode
  const sizes = useMemo(() => {
    if (compact) return { play: 32, skip: 22, iconLg: 14, iconSm: 10 }
    if (isMobile) return { play: 64, skip: 48, iconLg: 28, iconSm: 22 }
    if (isTV) return { play: 72, skip: 56, iconLg: 32, iconSm: 26 }
    return { play: 56, skip: 44, iconLg: 26, iconSm: 20 }
  }, [compact, isMobile])

  // Initialize audio element
  // Mobile Chrome restricts audio preloading (cellular, battery/data saver).
  // canplay may never fire, so we also clear loading on loadedmetadata + timeout.
  useEffect(() => {
    if (!src) {
      setLoading(false)
      return
    }

    setLoading(true)
    let loadingTimeout: ReturnType<typeof setTimeout> | null = null

    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    const audio = audioRef.current
    audio.preload = 'metadata'
    audio.src = src

    const clearLoading = () => {
      setLoading(false)
      setError(null)
      setRetryCount(0)
      if (loadingTimeout) { clearTimeout(loadingTimeout); loadingTimeout = null }
    }

    const handleCanPlay = () => clearLoading()

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      // On mobile, canplay may not fire due to preload restrictions.
      // loadedmetadata means the browser fetched enough to know the duration,
      // so we can safely let the user press play.
      setLoading(false)
      if (loadingTimeout) { clearTimeout(loadingTimeout); loadingTimeout = null }
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handlePlay = () => { setIsPlaying(true); setLoading(false) }
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    const handleError = (event: any) => {
      setLoading(false)
      setIsPlaying(false)
      if (loadingTimeout) { clearTimeout(loadingTimeout); loadingTimeout = null }

      const mediaError = audio.error
      let errorMessage = t('player.errors.streamFailed', 'Stream failed to load')

      if (mediaError) {
        switch (mediaError.code) {
          case mediaError.MEDIA_ERR_ABORTED:
            errorMessage = t('player.errors.loadAborted', 'Loading was aborted')
            break
          case mediaError.MEDIA_ERR_NETWORK:
            errorMessage = t('player.errors.networkError', 'Network error - stream may be unavailable')
            break
          case mediaError.MEDIA_ERR_DECODE:
            errorMessage = t('player.errors.decodeError', 'Cannot decode audio stream')
            break
          case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = t('player.errors.unsupportedFormat', 'Audio format not supported')
            break
          default:
            errorMessage = t('player.errors.unknown', 'Unknown playback error')
        }
      }

      setError(errorMessage)

      if (retryCount < 2) {
        const backoffDelays = [0, 1000, 2000]
        const delayMs = backoffDelays[retryCount]
        setTimeout(() => {
          setRetryCount(retryCount + 1)
          audio.load()
        }, delayMs)
      }
    }

    // Fallback timeout: if mobile Chrome never fires canplay/loadedmetadata,
    // clear loading so the user can tap play (which forces the browser to load).
    loadingTimeout = setTimeout(() => {
      setLoading(false)
      loadingTimeout = null
    }, 8000)

    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    // Auto-play when triggered from overlay/playlist (user gesture already happened)
    if (autoPlay) {
      audio.play().catch((err) => {
        if (err.name !== 'AbortError') {
          logger.debug('Auto-play blocked, user can press play', 'AudioPlayer')
        }
      })
    }
    audio.addEventListener('error', (e) => handleError(e))

    return () => {
      if (loadingTimeout) clearTimeout(loadingTimeout)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [src, autoPlay, onEnded])

  // Progress reporting: 10-second interval while playing
  useEffect(() => {
    if (!onProgress || isLive) return

    let intervalId: ReturnType<typeof setTimeout> | null = null

    if (isPlaying) {
      intervalId = setInterval(() => {
        const audio = audioRef.current
        if (audio && audio.duration && isFinite(audio.duration)) {
          onProgress(audio.currentTime, audio.duration)
        }
      }, 10000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
      const audio = audioRef.current
      if (audio && audio.duration && isFinite(audio.duration) && audio.currentTime > 0) {
        onProgress(audio.currentTime, audio.duration)
      }
    }
  }, [isPlaying, isLive, onProgress])

  // Auto-resume from saved position
  useEffect(() => {
    if (!savedPosition || isLive || hasResumed.current) return
    if (savedPosition < 30) {
      hasResumed.current = true
      return
    }

    const audio = audioRef.current
    if (!audio) return

    const handleCanPlay = () => {
      if (hasResumed.current) return
      try {
        audio.currentTime = savedPosition
        hasResumed.current = true

        const minutes = Math.floor(savedPosition / 60)
        const seconds = Math.floor(savedPosition % 60)
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

        notifications.show({
          level: 'info',
          title: t('player.resumedFrom', { time: timeStr }, `Resumed from ${timeStr}`),
          dismissable: true,
        })
      } catch (err) {
        logger.error('Failed to seek to saved position', 'AudioPlayer', {
          error: err instanceof Error ? err.message : 'Unknown error',
          savedPosition,
        })
      }
    }

    if (audio.readyState >= 3) {
      handleCanPlay()
    } else {
      audio.addEventListener('canplay', handleCanPlay, { once: true })
    }

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [savedPosition, isLive, notifications, t])

  useEffect(() => {
    hasResumed.current = false
  }, [src])

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        if (!src || src.trim() === '') {
          setError(t('player.errors.noSource', 'No stream available'))
          setLoading(false)
          return
        }
        // On mobile, pressing play forces the browser to start buffering
        setLoading(true)
        audioRef.current.play().catch((err) => {
          // NotAllowedError = user gesture required (already handled by tap)
          // AbortError = src changed during play attempt (safe to ignore)
          if (err.name !== 'AbortError') {
            setLoading(false)
          }
        })
      }
    }
  }, [isPlaying, src, t])

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
      setIsMuted(newVolume === 0)
    }
  }, [])

  const handleSeek = useCallback((newTime: number) => {
    if (!isFinite(newTime) || newTime < 0) return
    if (audioRef.current && audioRef.current.duration && isFinite(audioRef.current.duration)) {
      const clampedTime = Math.min(Math.max(0, newTime), audioRef.current.duration)
      audioRef.current.currentTime = clampedTime
      setCurrentTime(clampedTime)
    }
  }, [])

  const skip = useCallback((seconds: number) => {
    if (audioRef.current && audioRef.current.duration && isFinite(audioRef.current.duration)) {
      const newTime = audioRef.current.currentTime + seconds
      const clampedTime = Math.min(Math.max(0, newTime), audioRef.current.duration)
      audioRef.current.currentTime = clampedTime
    }
  }, [])

  const formatTime = useCallback((time: number): string => {
    if (!time || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  const renderPlayIcon = useCallback(() => {
    if (loading) return <GlassLoadingSpinner size="small" />
    if (isPlaying) return <Pause size={sizes.iconLg} fill={colors.background} color={colors.background} />
    return <Play size={sizes.iconLg} fill={colors.background} color={colors.background} style={styles.playIcon} />
  }, [loading, isPlaying, sizes.iconLg])

  // ── Hero Layout (WatchPage - cover fills container) ──
  if (!compact) {
    return (
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: cover || '/placeholder-audio.png' }}
          style={styles.heroCover as any}
          resizeMode="cover"
          accessibilityLabel={t('player.albumArt', { title })}
        />

        <View style={styles.heroScrim as any}>
          {isMobile ? (
            /* Mobile: centered play controls over poster, progress at bottom */
            <>
              {/* Title at top */}
              <View style={styles.mobileTitleSection}>
                {isLive && (
                  <GlassBadge variant="danger" size="sm">
                    {t('player.live')}
                  </GlassBadge>
                )}
                <Text
                  style={[styles.heroTitle, isRTL && styles.textRTL]}
                  numberOfLines={1}
                  accessibilityRole="header"
                >
                  {title}
                </Text>
                {artist && (
                  <Text
                    style={[styles.heroArtist, isRTL && styles.textRTL]}
                    numberOfLines={1}
                  >
                    {artist}
                  </Text>
                )}
              </View>

              {/* Centered play/skip buttons */}
              <View style={styles.mobileCenterControls}>
                <View style={[styles.mobileCenterRow, { flexDirection }]}>
                  {!isLive && (
                    <Pressable
                      onPress={() => skip(-SKIP_SECONDS)}
                      style={[styles.heroSkipBtn, { width: sizes.skip, height: sizes.skip, borderRadius: sizes.skip / 2 }]}
                      accessibilityLabel={t('player.skipBack', { seconds: SKIP_SECONDS })}
                      accessibilityRole="button"
                    >
                      <SkipBack size={sizes.iconSm} color={colors.text} />
                    </Pressable>
                  )}

                  <Pressable
                    onPress={togglePlay}
                    disabled={!src}
                    style={[styles.heroPlayBtn, { width: sizes.play, height: sizes.play, borderRadius: sizes.play / 2 }]}
                    accessibilityLabel={isPlaying ? t('player.pause') : t('player.play')}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !src }}
                  >
                    {renderPlayIcon()}
                  </Pressable>

                  {!isLive && (
                    <Pressable
                      onPress={() => skip(SKIP_SECONDS)}
                      style={[styles.heroSkipBtn, { width: sizes.skip, height: sizes.skip, borderRadius: sizes.skip / 2 }]}
                      accessibilityLabel={t('player.skipForward', { seconds: SKIP_SECONDS })}
                      accessibilityRole="button"
                    >
                      <SkipForward size={sizes.iconSm} color={colors.text} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Progress bar at bottom */}
              {!isLive && duration > 0 && (
                <View style={styles.mobileBottomProgress}>
                  <GlassSlider
                    value={currentTime}
                    min={0}
                    max={duration}
                    step={1}
                    onValueChange={handleSeek}
                    accessibilityLabel={t('player.seekBar')}
                    testID="audio-progress-slider"
                  />
                  <View style={[styles.timeLabels, { flexDirection }]}>
                    <Text style={styles.mobileTimeText}>{formatTime(currentTime)}</Text>
                    <Text style={styles.mobileTimeText}>{formatTime(duration)}</Text>
                  </View>
                </View>
              )}
            </>
          ) : (
              /* Desktop/tvOS: progress bar then controls row */
              <>
                <View style={styles.heroSpacer} />

                <View style={styles.heroControlsArea}>
                  {/* Title & Artist */}
                  <View style={styles.heroTitleSection}>
                    {isLive && (
                      <GlassBadge variant="danger" size="sm">
                        {t('player.live')}
                      </GlassBadge>
                    )}
                    <Text
                      style={[styles.heroTitle, isRTL && styles.textRTL]}
                      numberOfLines={1}
                      accessibilityRole="header"
                    >
                      {title}
                    </Text>
                    {artist && (
                      <Text
                        style={[styles.heroArtist, isRTL && styles.textRTL]}
                        numberOfLines={1}
                      >
                        {artist}
                      </Text>
                    )}
                  </View>

                {!isLive && duration > 0 && (
                  <View style={styles.progressSection}>
                    <GlassSlider
                      value={currentTime}
                      min={0}
                      max={duration}
                      step={1}
                      onValueChange={handleSeek}
                      accessibilityLabel={t('player.seekBar')}
                      testID="audio-progress-slider"
                    />
                    <View style={[styles.timeLabels, { flexDirection }]}>
                      <Text style={styles.heroTimeText}>{formatTime(currentTime)}</Text>
                      <Text style={styles.heroTimeText}>{formatTime(duration)}</Text>
                    </View>
                  </View>
                )}

                <View style={[styles.desktopControlsRow, { flexDirection }]}>
                  <View style={[styles.playbackBtns, { flexDirection }]}>
                    {!isLive && (
                      <Pressable
                        onPress={() => skip(-SKIP_SECONDS)}
                        onFocus={skipBackFocus.handleFocus}
                        onBlur={skipBackFocus.handleBlur}
                        focusable={true}
                        style={[
                          styles.heroSkipBtn,
                          { width: sizes.skip, height: sizes.skip, borderRadius: sizes.skip / 2 },
                          skipBackFocus.isFocused && skipBackFocus.focusStyle,
                        ]}
                        accessibilityLabel={t('player.skipBack', { seconds: SKIP_SECONDS })}
                        accessibilityRole="button"
                      >
                        <SkipBack size={sizes.iconSm} color={colors.text} />
                      </Pressable>
                    )}

                    <Pressable
                      onPress={togglePlay}
                      onFocus={playFocus.handleFocus}
                      onBlur={playFocus.handleBlur}
                      focusable={true}
                      disabled={!src}
                      style={[
                        styles.heroPlayBtn,
                        { width: sizes.play, height: sizes.play, borderRadius: sizes.play / 2 },
                        playFocus.isFocused && playFocus.focusStyle,
                      ]}
                      accessibilityLabel={isPlaying ? t('player.pause') : t('player.play')}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !src }}
                    >
                      {renderPlayIcon()}
                    </Pressable>

                    {!isLive && (
                      <Pressable
                        onPress={() => skip(SKIP_SECONDS)}
                        onFocus={skipForwardFocus.handleFocus}
                        onBlur={skipForwardFocus.handleBlur}
                        focusable={true}
                        style={[
                          styles.heroSkipBtn,
                          { width: sizes.skip, height: sizes.skip, borderRadius: sizes.skip / 2 },
                          skipForwardFocus.isFocused && skipForwardFocus.focusStyle,
                        ]}
                        accessibilityLabel={t('player.skipForward', { seconds: SKIP_SECONDS })}
                        accessibilityRole="button"
                      >
                        <SkipForward size={sizes.iconSm} color={colors.text} />
                      </Pressable>
                    )}
                  </View>

                  <VolumeControls
                    isMuted={isMuted}
                    volume={volume}
                    onToggleMute={toggleMute}
                    onVolumeChange={handleVolumeChange}
                  />
                </View>
                </View>
              </>
            )}
        </View>

        {/* Error overlay */}
        {error && (
          <View style={styles.heroErrorBanner}>
            <View style={styles.errorContent}>
              <Text style={styles.errorText}>{error}</Text>
              {retryCount > 0 && (
                <Text style={styles.retryText}>
                  {t('player.retrying', 'Retry attempt')} {retryCount}/2
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => setError(null)}
              style={styles.closeErrorButton}
              accessibilityLabel={t('common.close', 'Close')}
            >
              <Icon name="x" size="md" color={colors.error.DEFAULT} />
            </Pressable>
          </View>
        )}
      </View>
    )
  }

  // ── Compact Layout (Widget containers) ──
  return (
    <GlassView style={styles.compactContainer}>
      {/* Top row: cover art + title/artist */}
      <View style={[styles.compactTopRow, { flexDirection }]}>
        <View style={styles.compactCoverArea}>
          <View style={styles.compactCoverWrap}>
            <Image
              source={{ uri: cover || '/placeholder-audio.png' }}
              style={styles.compactCoverImg}
              resizeMode="cover"
              accessibilityLabel={t('player.albumArt', { title })}
            />
          </View>
          <View style={[styles.compactCoverControls, { flexDirection }]}>
            {!isLive && (
              <Pressable
                onPress={() => skip(-SKIP_SECONDS)}
                style={[styles.compactSkipBtn, { width: sizes.skip, height: sizes.skip, borderRadius: sizes.skip / 2 }]}
                accessibilityLabel={t('player.skipBack', { seconds: SKIP_SECONDS })}
                accessibilityRole="button"
              >
                <SkipBack size={sizes.iconSm} color={colors.text} />
              </Pressable>
            )}
            <Pressable
              onPress={togglePlay}
              disabled={!src}
              style={[styles.compactPlayBtn, { width: sizes.play, height: sizes.play, borderRadius: sizes.play / 2 }]}
              accessibilityLabel={isPlaying ? t('player.pause') : t('player.play')}
              accessibilityRole="button"
              accessibilityState={{ disabled: !src }}
            >
              {renderPlayIcon()}
            </Pressable>
            {!isLive && (
              <Pressable
                onPress={() => skip(SKIP_SECONDS)}
                style={[styles.compactSkipBtn, { width: sizes.skip, height: sizes.skip, borderRadius: sizes.skip / 2 }]}
                accessibilityLabel={t('player.skipForward', { seconds: SKIP_SECONDS })}
                accessibilityRole="button"
              >
                <SkipForward size={sizes.iconSm} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.compactMeta}>
          {isLive && (
            <GlassBadge variant="danger" size="sm" style={styles.liveBadge}>
              {t('player.live')}
            </GlassBadge>
          )}
          <Text
            style={[styles.compactTitle, isRTL && styles.textRTL]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {artist && (
            <Text
              style={[styles.compactArtist, isRTL && styles.textRTL]}
              numberOfLines={1}
            >
              {artist}
            </Text>
          )}
        </View>
      </View>

      {/* Full-width progress bar */}
      {!isLive && duration > 0 && (
        <View style={styles.compactProgressSection}>
          <GlassSlider
            value={currentTime}
            min={0}
            max={duration}
            step={1}
            onValueChange={handleSeek}
            accessibilityLabel={t('player.seekBar')}
            testID="audio-progress-slider"
          />
          <View style={[styles.timeLabels, { flexDirection }]}>
            <Text style={styles.compactTimeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.compactTimeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorBanner}>
          <View style={styles.errorContent}>
            <Text style={styles.errorText}>{error}</Text>
            {retryCount > 0 && (
              <Text style={styles.retryText}>
                {t('player.retrying', 'Retry attempt')} {retryCount}/2
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => setError(null)}
            style={styles.closeErrorButton}
            accessibilityLabel={t('common.close', 'Close')}
          >
            <Icon name="x" size="md" color={colors.error.DEFAULT} />
          </Pressable>
        </View>
      )}
    </GlassView>
  )
}

const styles = StyleSheet.create({
  // ── Hero Layout (WatchPage) ──
  heroContainer: {
    flex: 1,
    position: 'relative' as any,
    overflow: 'hidden',
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.glassLight,
  },
  heroCover: {
    ...StyleSheet.absoluteFillObject,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage:
      'linear-gradient(to top, rgba(10, 10, 20, 0.95) 0%, rgba(10, 10, 20, 0.7) 30%, rgba(10, 10, 20, 0.15) 60%, transparent 100%)' as any,
    padding: spacing.lg,
  },
  heroSpacer: {
    flex: 1,
  },
  heroControlsArea: {
    gap: spacing.md,
  },
  heroTitleSection: {
    gap: spacing.xs,
  },
  heroTitle: {
    fontSize: isTV ? 28 : 22,
    fontWeight: '700',
    color: colors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroArtist: {
    fontSize: isTV ? 18 : 15,
    color: colors.textSecondary,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroSkipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroPlayBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.DEFAULT,
  },
  heroTimeText: {
    fontSize: isTV ? 14 : 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  desktopControlsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ── Mobile Hero ──
  mobileTitleSection: {
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  mobileCenterControls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCenterRow: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  mobileBottomProgress: {
    gap: 2,
    paddingBottom: spacing.xs,
  },
  mobileTimeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // ── Shared ──
  progressSection: {
    gap: 2,
  },
  timeLabels: {
    justifyContent: 'space-between',
  },
  playbackBtns: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  playIcon: {
    marginLeft: 2,
  },
  textRTL: {
    textAlign: 'right',
  },

  // ── Compact Layout (Widgets) ──
  compactContainer: {
    flex: 1,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  compactTopRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactCoverArea: {
    width: 80,
    height: 80,
    flexShrink: 0,
  },
  compactCoverWrap: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.glassLight,
  },
  compactCoverImg: {
    width: '100%',
    height: '100%',
  },
  compactCoverControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: borderRadius.md,
  },
  compactMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  liveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePulse: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error.DEFAULT,
    shadowColor: colors.error.DEFAULT as any,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  compactArtist: {
    fontSize: 12,
    color: colors.textMuted,
  },
  compactProgressSection: {
    width: '100%',
    gap: 2,
  },
  compactTimeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  compactSkipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassLight,
  },
  compactPlayBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.DEFAULT,
  },

  // ── Error ──
  heroErrorBanner: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.error.DEFAULT,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    zIndex: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.error.DEFAULT,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  errorContent: {
    flex: 1,
    gap: spacing.xs,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: 14,
    fontWeight: '500',
  },
  retryText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  closeErrorButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
