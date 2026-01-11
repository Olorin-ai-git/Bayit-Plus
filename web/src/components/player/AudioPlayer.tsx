import { useRef, useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView, GlassBadge } from '@bayit/shared/ui'

interface AudioPlayerProps {
  src: string
  title: string
  artist?: string
  cover?: string
  isLive?: boolean
  onEnded?: () => void
}

export default function AudioPlayer({
  src,
  title,
  artist,
  cover,
  isLive = false,
  onEnded,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!src) return

    // Create audio element if it doesn't exist
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
      if (onEnded) onEnded()
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

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
      setIsMuted(newVolume === 0)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds
    }
  }

  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <GlassView style={styles.container}>
      <View style={styles.content}>
        {/* Cover Art */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: cover || '/placeholder-audio.png' }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          {isLive && (
            <View style={styles.liveOverlay}>
              <View style={styles.liveDot} />
            </View>
          )}
        </View>

        {/* Info & Controls */}
        <View style={styles.infoContainer}>
          {/* Title & Artist */}
          <View style={styles.titleContainer}>
            {isLive && (
              <GlassBadge variant="danger" size="sm" style={styles.liveBadge}>
                LIVE
              </GlassBadge>
            )}
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {artist && <Text style={styles.artist} numberOfLines={1}>{artist}</Text>}
          </View>

          {/* Progress Bar (not for live) */}
          {!isLive && duration > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                style={styles.progressInput as any}
              />
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>
          )}

          {/* Controls */}
          <View style={styles.controlsContainer}>
            {!isLive && (
              <Pressable
                onPress={() => skip(-15)}
                style={({ hovered }) => [
                  styles.controlButton,
                  hovered && styles.controlButtonHovered,
                ]}
              >
                <SkipBack size={22} color={colors.text} />
              </Pressable>
            )}

            <Pressable
              onPress={togglePlay}
              disabled={loading}
              style={({ hovered }) => [
                styles.playButton,
                hovered && styles.playButtonHovered,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : isPlaying ? (
                <Pause size={28} fill={colors.background} color={colors.background} />
              ) : (
                <Play size={28} fill={colors.background} color={colors.background} style={{ marginLeft: 2 }} />
              )}
            </Pressable>

            {!isLive && (
              <Pressable
                onPress={() => skip(15)}
                style={({ hovered }) => [
                  styles.controlButton,
                  hovered && styles.controlButtonHovered,
                ]}
              >
                <SkipForward size={22} color={colors.text} />
              </Pressable>
            )}

            <View style={styles.volumeContainer}>
              <Pressable
                onPress={toggleMute}
                style={({ hovered }) => [
                  styles.volumeButton,
                  hovered && styles.volumeButtonHovered,
                ]}
              >
                {isMuted ? (
                  <VolumeX size={18} color={colors.textSecondary} />
                ) : (
                  <Volume2 size={18} color={colors.textSecondary} />
                )}
              </Pressable>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={styles.volumeSlider as any}
              />
            </View>
          </View>
        </View>
      </View>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  coverContainer: {
    position: 'relative',
    width: 128,
    height: 128,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  liveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 46, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  titleContainer: {
    marginBottom: spacing.md,
  },
  liveBadge: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  artist: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  progressContainer: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressInput: {
    position: 'absolute',
    top: -6,
    left: 0,
    right: 0,
    width: '100%',
    height: 16,
    opacity: 0,
    cursor: 'pointer',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonHovered: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 'auto' as any,
  },
  volumeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  volumeSlider: {
    width: 96,
    accentColor: colors.primary,
  },
})
