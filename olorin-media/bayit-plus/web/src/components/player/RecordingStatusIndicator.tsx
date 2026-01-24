/**
 * RecordingStatusIndicator Component
 * Shows recording status in top-right corner of video player
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Circle } from 'lucide-react'
import { spacing, borderRadius, colors } from '@bayit/shared/theme'

interface RecordingStatusIndicatorProps {
  isRecording: boolean
  duration: number
}

export const RecordingStatusIndicator: React.FC<RecordingStatusIndicatorProps> = ({
  isRecording,
  duration
}) => {
  if (!isRecording) return null

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <View style={styles.container}>
      <View>
        <Circle size={8} color={colors.text} fill={colors.text} />
      </View>
      <Text style={styles.text}>REC {formatDuration(duration)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    zIndex: 100,
  },
  text: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
})
