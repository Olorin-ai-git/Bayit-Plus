/**
 * Video Timeline with Moment Markers
 *
 * Interactive timeline showing moment positions on video.
 */
import { RefObject } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { GlassView } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { InteractiveMoment } from '@/stores/avatarStudioStore'

interface VideoTimelineProps {
  videoRef: RefObject<HTMLVideoElement>
  moments: InteractiveMoment[]
  selectedMoment: InteractiveMoment | null
  onMomentClick: (moment: InteractiveMoment) => void
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function VideoTimeline({
  videoRef,
  moments,
  selectedMoment,
  onMomentClick,
}: VideoTimelineProps) {
  const duration = videoRef.current?.duration || 0
  const currentTime = videoRef.current?.currentTime || 0

  const handleTimelineClick = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration

    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
  }

  return (
    <GlassView style={styles.container}>
      <View style={styles.timeDisplay}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        <Text style={styles.timeSeparator}>/</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      <Pressable style={styles.timeline} onPress={handleTimelineClick}>
        <View style={styles.track}>
          <View
            style={[
              styles.progress,
              { width: `${(currentTime / duration) * 100}%` },
            ]}
          />
        </View>

        {moments.map((moment) => {
          const position = (moment.timestamp / duration) * 100
          const isSelected = selectedMoment?.id === moment.id

          return (
            <Pressable
              key={moment.id}
              style={[
                styles.marker,
                { left: `${position}%` },
                isSelected && styles.markerSelected,
              ]}
              onPress={(e) => {
                e.stopPropagation()
                onMomentClick(moment)
              }}
            >
              <View style={[styles.markerDot, isSelected && styles.markerDotSelected]} />
              {isSelected && (
                <Text style={styles.markerLabel}>{moment.character_name || 'Unnamed'}</Text>
              )}
            </Pressable>
          )
        })}

        <View
          style={[
            styles.playhead,
            { left: `${(currentTime / duration) * 100}%` },
          ]}
        />
      </Pressable>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  timeText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  timeSeparator: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  timeline: {
    position: 'relative',
    height: 40,
    marginTop: spacing.sm,
  },
  track: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  progress: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 2,
  },
  marker: {
    position: 'absolute',
    top: 8,
    marginLeft: -8,
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.warning.DEFAULT,
    borderWidth: 2,
    borderColor: colors.white,
  },
  markerSelected: {
    zIndex: 10,
  },
  markerDotSelected: {
    backgroundColor: colors.primary.DEFAULT,
    transform: [{ scale: 1.25 }],
  },
  markerLabel: {
    position: 'absolute',
    top: -24,
    left: -20,
    width: 80,
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.text,
    backgroundColor: colors.glassDark,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  playhead: {
    position: 'absolute',
    top: 10,
    width: 2,
    height: 12,
    backgroundColor: colors.white,
    marginLeft: -1,
  },
})
