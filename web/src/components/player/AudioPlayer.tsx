/**
 * AudioPlayer Component
 * Podcast/audio playback with glassmorphism styling
 *
 * Features:
 * - Play/pause, skip forward/back controls
 * - Progress bar using GlassSlider
 * - Volume controls using VolumeControls component
 * - RTL support via useDirection hook
 * - TV focus states via useTVFocus hook
 * - Cross-platform support (web, iOS, tvOS, Android)
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, Image, ActivityIndicator, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { colors, borderRadius, spacing } from '@olorin/design-tokens'
import { GlassView, GlassBadge, GlassSlider } from '@bayit/shared/ui'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { useDirection } from '@bayit/shared/hooks'
import { isTV } from '@bayit/shared/utils/platform'
import VolumeControls from './controls/VolumeControls'

interface AudioPlayerProps {
  src: string
  title: string
  artist?: string
  cover?: string
  isLive?: boolean
  onEnded?: () => void
}

const COVER_SIZE = isTV ? 160 : 128
const PLAY_BUTTON_SIZE = isTV ? 72 : 56
const SKIP_BUTTON_SIZE = isTV ? 56 : 44
const ICON_SIZE_LARGE = isTV ? 32 : 28
const ICON_SIZE_SMALL = isTV ? 26 : 22
const SKIP_SECONDS = 15

export default function AudioPlayer({
  src,
  title,
  artist,
  cover,
  isLive = false,
  onEnded,
}: AudioPlayerProps) {
  const { t } = useTranslation()
  const { isRTL, flexDirection } = useDirection()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)

  // Focus states for TV navigation
  const playFocus = useTVFocus({ styleType: 'button' })
  const skipBackFocus = useTVFocus({ styleType: 'button' })
  const skipForwardFocus = useTVFocus({ styleType: 'button' })

  // Initialize audio element
  useEffect(() => {
    if (!src) return

    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    const audio = audioRef.current
    audio.src = src

    const handleCanPlay = () => setLoading(false)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [src, onEnded])

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }, [isPlaying])

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
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }, [])

  const skip = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds
    }
  }, [])

  const formatTime = useCallback((time: number): string => {
    if (!time || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  return (
    <GlassView style={styles.container}>
      <View style={[styles.mainContent, { flexDirection }]}>
        {/* Cover Art */}
        <View style={styles.coverArtContainer}>
          <Image
            source={{ uri: cover || '/placeholder-audio.png' }}
            style={styles.coverImage}
            resizeMode="cover"
            accessibilityLabel={t('player.albumArt', { title })}
          />
          {isLive && (
            <View style={styles.liveOverlay}>
              <View style={styles.livePulse} />
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* Title & Artist */}
          <View style={styles.titleSection}>
            {isLive && (
              <GlassBadge variant="danger" size="sm" style={styles.liveBadge}>
                {t('player.live')}
              </GlassBadge>
            )}
            <Text
              style={[styles.title, isRTL && styles.textRTL]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title}
            </Text>
            {artist && (
              <Text
                style={[styles.artist, isRTL && styles.textRTL]}
                numberOfLines={1}
              >
                {artist}
              </Text>
            )}
          </View>

          {/* Progress Bar (not for live) */}
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
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>
          )}

          {/* Controls */}
          <View style={[styles.controlsRow, { flexDirection }]}>
            {/* Playback Controls */}
            <View style={[styles.playbackControls, { flexDirection }]}>
              {!isLive && (
                <Pressable
                  onPress={() => skip(-SKIP_SECONDS)}
                  onFocus={skipBackFocus.handleFocus}
                  onBlur={skipBackFocus.handleBlur}
                  focusable={true}
                  style={[
                    styles.skipButton,
                    skipBackFocus.isFocused && skipBackFocus.focusStyle,
                  ]}
                  accessibilityLabel={t('player.skipBack', { seconds: SKIP_SECONDS })}
                  accessibilityRole="button"
                >
                  <SkipBack size={ICON_SIZE_SMALL} color={colors.text} />
                </Pressable>
              )}

              <Pressable
                onPress={togglePlay}
                onFocus={playFocus.handleFocus}
                onBlur={playFocus.handleBlur}
                focusable={true}
                disabled={loading}
                style={[
                  styles.playButton,
                  playFocus.isFocused && playFocus.focusStyle,
                ]}
                accessibilityLabel={isPlaying ? t('player.pause') : t('player.play')}
                accessibilityRole="button"
                accessibilityState={{ disabled: loading }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : isPlaying ? (
                  <Pause
                    size={ICON_SIZE_LARGE}
                    fill={colors.background}
                    color={colors.background}
                  />
                ) : (
                  <Play
                    size={ICON_SIZE_LARGE}
                    fill={colors.background}
                    color={colors.background}
                    style={styles.playIcon}
                  />
                )}
              </Pressable>

              {!isLive && (
                <Pressable
                  onPress={() => skip(SKIP_SECONDS)}
                  onFocus={skipForwardFocus.handleFocus}
                  onBlur={skipForwardFocus.handleBlur}
                  focusable={true}
                  style={[
                    styles.skipButton,
                    skipForwardFocus.isFocused && skipForwardFocus.focusStyle,
                  ]}
                  accessibilityLabel={t('player.skipForward', { seconds: SKIP_SECONDS })}
                  accessibilityRole="button"
                >
                  <SkipForward size={ICON_SIZE_SMALL} color={colors.text} />
                </Pressable>
              )}
            </View>

            {/* Volume Controls */}
            <VolumeControls
              isMuted={isMuted}
              volume={volume}
              onToggleMute={toggleMute}
              onVolumeChange={handleVolumeChange}
            />
          </View>
        </View>
      </View>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  mainContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  coverArtContainer: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.glassLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  coverImage: {
    width: '100%',
    height: '100%',
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
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  infoSection: {
    flex: 1,
    minWidth: 0,
    gap: spacing.md,
  },
  titleSection: {
    gap: spacing.xs,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: isTV ? 24 : 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  artist: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  textRTL: {
    textAlign: 'right',
  },
  progressSection: {
    gap: spacing.xs,
  },
  timeLabels: {
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textMuted,
  },
  controlsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  playbackControls: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  skipButton: {
    width: SKIP_BUTTON_SIZE,
    height: SKIP_BUTTON_SIZE,
    borderRadius: SKIP_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassLight,
  },
  playButton: {
    width: PLAY_BUTTON_SIZE,
    height: PLAY_BUTTON_SIZE,
    borderRadius: PLAY_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.DEFAULT,
  },
  playIcon: {
    marginLeft: 2,
  },
})
