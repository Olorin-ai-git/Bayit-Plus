/**
 * RecordingStatusIndicator Component
 * Shows recording status in top-right corner of video player
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Circle } from 'lucide-react'

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
      <View style={styles.pulse}>
        <Circle size={8} color="white" fill="white" />
      </View>
      <Text style={styles.text}>REC {formatDuration(duration)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)', // red-500
    backdropFilter: 'blur(40px)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    zIndex: 100,
  },
  pulse: {
    // Animation would be added via Animated API or CSS animation
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  }
})
