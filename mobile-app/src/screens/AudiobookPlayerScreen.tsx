import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Alert, Modal } from 'react-native'
import { GlassCard, GlassButton } from '../components/glass'
import { theme } from '../theme'
import { useRoute, useNavigation } from '@react-navigation/native'
import TrackPlayer, { State, usePlaybackState, useProgress } from 'react-native-track-player'
import Slider from '@react-native-community/slider'
import { log } from '@bayit/shared-services/logger.native'

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]
const SLEEP_TIMER_OPTIONS = [5, 10, 15, 30, 45, 60] // minutes

export default function AudiobookPlayerScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const { audiobookId, audiobook, startChapter } = route.params as any

  const playbackState = usePlaybackState()
  const { position, duration } = useProgress()

  const [currentChapter, setCurrentChapter] = useState(startChapter || 0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [seeking, setSeeking] = useState(false)
  const [showChapters, setShowChapters] = useState(false)
  const [showSleepTimer, setShowSleepTimer] = useState(false)
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null)

  useEffect(() => {
    setupPlayer()
    return () => {
      TrackPlayer.reset()
    }
  }, [])

  useEffect(() => {
    if (sleepTimerMinutes !== null) {
      const timer = setTimeout(() => {
        handleSleepTimerExpire()
      }, sleepTimerMinutes * 60 * 1000)
      return () => clearTimeout(timer)
    }
  }, [sleepTimerMinutes])

  const setupPlayer = async () => {
    try {
      await TrackPlayer.reset()
      const chapter = audiobook.chapters[currentChapter]
      await TrackPlayer.add({
        id: audiobook.id,
        url: audiobook.audioUrl,
        title: `${audiobook.title} - ${chapter.title}`,
        artist: audiobook.author,
        artwork: audiobook.cover,
        duration: audiobook.duration,
      })
      await TrackPlayer.seekTo(chapter.startTime)
      await TrackPlayer.play()
      log.info('Audiobook player initialized', { audiobookId, chapter: currentChapter })
    } catch (err: unknown) {
      log.error('Failed to setup audiobook player', { error: err })
      Alert.alert('Error', 'Failed to load audiobook')
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

  const handleChapterChange = async (chapterIndex: number) => {
    setCurrentChapter(chapterIndex)
    const chapter = audiobook.chapters[chapterIndex]
    await TrackPlayer.seekTo(chapter.startTime)
    setShowChapters(false)
    log.info('Chapter changed', { chapter: chapterIndex })
  }

  const handlePreviousChapter = async () => {
    if (currentChapter > 0) {
      await handleChapterChange(currentChapter - 1)
    }
  }

  const handleNextChapter = async () => {
    if (currentChapter < audiobook.chapters.length - 1) {
      await handleChapterChange(currentChapter + 1)
    }
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

  const handleSleepTimer = (minutes: number) => {
    setSleepTimerMinutes(minutes)
    setShowSleepTimer(false)
    log.info('Sleep timer set', { minutes })
  }

  const handleCancelSleepTimer = () => {
    setSleepTimerMinutes(null)
  }

  const handleSleepTimerExpire = async () => {
    await TrackPlayer.pause()
    setSleepTimerMinutes(null)
    log.info('Sleep timer expired, pausing playback')
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
  const currentChapterData = audiobook.chapters[currentChapter]

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Album Art */}
        <View style={styles.artworkContainer}>
          {audiobook.cover ? (
            <Image source={{ uri: audiobook.cover }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.artworkPlaceholder]}>
              <Text style={styles.artworkPlaceholderText}>📖</Text>
            </View>
          )}
        </View>

        {/* Audiobook Info */}
        <Text style={styles.title} numberOfLines={2}>
          {audiobook.title}
        </Text>
        <Text style={styles.author}>by {audiobook.author}</Text>
        <Text style={styles.narrator}>Narrated by {audiobook.narrator}</Text>

        {/* Current Chapter */}
        <Pressable style={styles.chapterBadge} onPress={() => setShowChapters(true)}>
          <Text style={styles.chapterBadgeText}>
            Chapter {currentChapter + 1}/{audiobook.chapters.length}: {currentChapterData.title}
          </Text>
        </Pressable>

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
          <Pressable
            style={styles.controlButton}
            onPress={handlePreviousChapter}
            disabled={currentChapter === 0}
          >
            <Text style={[styles.controlText, currentChapter === 0 && styles.controlTextDisabled]}>
              ⏮️
            </Text>
          </Pressable>

          <Pressable style={styles.controlButton} onPress={() => handleSkip(-15)}>
            <Text style={styles.controlText}>⏪ 15</Text>
          </Pressable>

          <Pressable style={styles.playButton} onPress={handlePlayPause}>
            <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </Pressable>

          <Pressable style={styles.controlButton} onPress={() => handleSkip(30)}>
            <Text style={styles.controlText}>30 ⏩</Text>
          </Pressable>

          <Pressable
            style={styles.controlButton}
            onPress={handleNextChapter}
            disabled={currentChapter === audiobook.chapters.length - 1}
          >
            <Text style={[styles.controlText, currentChapter === audiobook.chapters.length - 1 && styles.controlTextDisabled]}>
              ⏭️
            </Text>
          </Pressable>
        </View>

        {/* Speed & Sleep Timer */}
        <View style={styles.optionsContainer}>
          <GlassCard style={styles.optionCard}>
            <Text style={styles.optionLabel}>Speed</Text>
            <Pressable style={styles.optionButton} onPress={handleSpeedChange}>
              <Text style={styles.optionButtonText}>{playbackSpeed}x</Text>
            </Pressable>
          </GlassCard>

          <GlassCard style={styles.optionCard}>
            <Text style={styles.optionLabel}>Sleep Timer</Text>
            {sleepTimerMinutes ? (
              <Pressable style={styles.optionButton} onPress={handleCancelSleepTimer}>
                <Text style={styles.optionButtonText}>{sleepTimerMinutes}m ✕</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.optionButton} onPress={() => setShowSleepTimer(true)}>
                <Text style={styles.optionButtonText}>Set</Text>
              </Pressable>
            )}
          </GlassCard>
        </View>

        {/* Chapters Modal */}
        <Modal
          visible={showChapters}
          transparent
          animationType="slide"
          onRequestClose={() => setShowChapters(false)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.modalContent}>
              <Text style={styles.modalTitle}>Chapters</Text>
              <ScrollView style={styles.chapterList}>
                {audiobook.chapters.map((chapter: any, index: number) => (
                  <Pressable
                    key={chapter.id}
                    style={[styles.chapterItem, index === currentChapter && styles.chapterItemActive]}
                    onPress={() => handleChapterChange(index)}
                  >
                    <Text style={styles.chapterNumber}>{index + 1}</Text>
                    <Text style={styles.chapterTitle}>{chapter.title}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <GlassButton title="Close" onPress={() => setShowChapters(false)} variant="secondary" />
            </GlassCard>
          </View>
        </Modal>

        {/* Sleep Timer Modal */}
        <Modal
          visible={showSleepTimer}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSleepTimer(false)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sleep Timer</Text>
              <View style={styles.sleepTimerOptions}>
                {SLEEP_TIMER_OPTIONS.map(minutes => (
                  <Pressable
                    key={minutes}
                    style={styles.sleepTimerOption}
                    onPress={() => handleSleepTimer(minutes)}
                  >
                    <Text style={styles.sleepTimerOptionText}>{minutes} min</Text>
                  </Pressable>
                ))}
              </View>
              <GlassButton title="Cancel" onPress={() => setShowSleepTimer(false)} variant="secondary" />
            </GlassCard>
          </View>
        </Modal>
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
  author: {
    ...theme.typography.titleMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  narrator: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  chapterBadge: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: theme.spacing.xl,
  },
  chapterBadgeText: {
    ...theme.typography.labelMedium,
    color: theme.colors.primary,
    textAlign: 'center',
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
    gap: theme.spacing.sm,
  },
  controlButton: {
    padding: theme.spacing.sm,
  },
  controlText: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
  },
  controlTextDisabled: {
    opacity: 0.3,
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
  optionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  optionCard: {
    flex: 1,
    padding: theme.spacing.md,
  },
  optionLabel: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  optionButton: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingVertical: theme.spacing.sm,
    borderRadius: 12,
  },
  optionButtonText: {
    ...theme.typography.titleMedium,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  chapterList: {
    maxHeight: 400,
    marginBottom: theme.spacing.lg,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chapterItemActive: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
  },
  chapterNumber: {
    ...theme.typography.titleMedium,
    color: theme.colors.primary,
    marginRight: theme.spacing.md,
    fontWeight: '600',
    width: 30,
  },
  chapterTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    flex: 1,
  },
  sleepTimerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  sleepTimerOption: {
    flex: 0,
    minWidth: '30%',
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    padding: theme.spacing.md,
    borderRadius: 12,
  },
  sleepTimerOptionText: {
    ...theme.typography.titleMedium,
    color: theme.colors.primary,
    textAlign: 'center',
  },
})
