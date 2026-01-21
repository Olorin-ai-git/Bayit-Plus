/**
 * RecordingStatusIndicator Component
 * Shows recording status in top-right corner of video player
 */

import React from 'react'
import { View, Text } from 'react-native'
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
    <View className="absolute top-4 right-4 flex-row items-center gap-2 bg-red-500/90 backdrop-blur-[40px] px-3 py-2 rounded-full z-[100]">
      <View>
        <Circle size={8} color="white" fill="white" />
      </View>
      <Text className="text-white text-xs font-bold tracking-wide">REC {formatDuration(duration)}</Text>
    </View>
  )
}
