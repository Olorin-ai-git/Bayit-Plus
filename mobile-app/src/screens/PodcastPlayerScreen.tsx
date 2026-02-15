import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Alert } from 'react-native'
import { GlassCard, GlassButton } from '../components/glass'
import { theme } from '../theme'
import { useRoute, useNavigation } from '@react-navigation/native'
import TrackPlayer, { State, usePlaybackState, useProgress } from 'react-native-track-player'
import Slider from '@react-native-community/slider'
import { log } from '@bayit/shared-services/logger.native'

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]

export default function PodcastPlayerScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const { episodeId, episode } = route.params as any

  const playbackState = usePlaybackState()
  const { position, duration } = useProgress()

  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [seeking, setSeeking] = useState(false)

  useEffect(() => {
    setupPlayer()
    return () => {
      TrackPlayer.reset()
    }
  }, [])

  const setupPlayer = async () => {
    try {
      await TrackPlayer.reset()
      await TrackPlayer.add({
        id: episode.id,
        url: episode.audioUrl,
        title: episode.title,
        artist: episode.podcastTitle || 'Podcast',
        artwork: episode.cover,
        duration: episode.duration,
      })
      await TrackPlayer.play()
      log.info('Podcast player initialized', { episodeId })
    } catch (err: unknown) {
      log.error('Failed to setup player', { error: err })
      Alert.alert('Error', 'Failed to load podcast episode')
    }
  }

  const handlePlayPause = async () => {
    const state = await TrackPlayer.getState()
    if (state === State.Playing) {
      await TrackPlayer.pause()
    } else {
      await TrackPlayer.play()
    }
  }

  const handleSkip = async (seconds: number) => {
    const currentPosition = await TrackPlayer.getPosition()
    await TrackPlayer.seekTo(Math.max(0, currentPosition + seconds))
  }

  const handleSeekStart = () => {
    setSeeking(true)
  }

  const handleSeekComplete = async (value: number) => {
    await TrackPlayer.seekTo(value)
    setSeeking(false)
  }

  const handleSpeedChange = async () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed)
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length
    const newSpeed = PLAYBACK_SPEEDS[nextIndex]
    setPlaybackSpeed(newSpeed)
    await TrackPlayer.setRate(newSpeed)
    log.info('Playback speed changed', { speed: newSpeed })
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const isPlaying = playbackState === State.Playing

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Album Art */}
        <View style={styles.artworkContainer}>
          {episode.cover ? (
            <Image source={{ uri: episode.cover }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.artworkPlaceholder]}>
              <Text style={styles.artworkPlaceholderText}>🎙️</Text>
            </View>
          )}
        </View>

        {/* Episode Info */}
        <Text style={styles.title} numberOfLines={2}>
          {episode.title}
        </Text>
        <Text style={styles.podcast}>{episode.podcastTitle || 'Podcast'}</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Slider
            style={styles.progressSlider}
            value={seeking ? undefined : position}
            minimumValue={0}
            maximumValue={duration || 1}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
            thumbTintColor={theme.colors.primary}
            onSlidingStart={handleSeekStart}
            onSlidingComplete={handleSeekComplete}
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Playback Controls */}
        <View style={styles.controls}>
          <Pressable style={styles.controlButton} onPress={() => handleSkip(-15)}>
            <Text style={styles.controlText}>⏪ 15</Text>
          </Pressable>

          <Pressable style={styles.playButton} onPress={handlePlayPause}>
            <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </Pressable>

          <Pressable style={styles.controlButton} onPress={() => handleSkip(30)}>
            <Text style={styles.controlText}>30 ⏩</Text>
          </Pressable>
        </View>

        {/* Speed Control */}
        <GlassCard style={styles.speedCard}>
          <View style={styles.speedContainer}>
            <Text style={styles.speedLabel}>Playback Speed</Text>
            <Pressable style={styles.speedButton} onPress={handleSpeedChange}>
              <Text style={styles.speedButtonText}>{playbackSpeed}x</Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* Episode Description */}
        {episode.description && (
          <GlassCard style={styles.descriptionCard}>
            <Text style={styles.descriptionTitle}>About This Episode</Text>
            <Text style={styles.descriptionText}>{episode.description}</Text>
          </GlassCard>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  artworkContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  artwork: {
    width: 280,
    height: 280,
    borderRadius: 16,
  },
  artworkPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkPlaceholderText: {
    fontSize: 96,
  },
  title: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  podcast: {
    ...theme.typography.titleMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  progressContainer: {
    marginBottom: theme.spacing.xl,
  },
  progressSlider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  controlButton: {
    padding: theme.spacing.md,
  },
  controlText: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 32,
  },
  speedCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  speedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speedLabel: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
  },
  speedButton: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 12,
  },
  speedButtonText: {
    ...theme.typography.titleMedium,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  descriptionCard: {
    padding: theme.spacing.md,
  },
  descriptionTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  descriptionText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
})
