/**
 * LiveSubtitleOverlay Component
 * Displays live subtitle cues with automatic expiration
 */

import { View, Text } from 'react-native'
import { LiveSubtitleCue } from '@/services/liveSubtitleService'

interface LiveSubtitleOverlayProps {
  cues: LiveSubtitleCue[]
}

export default function LiveSubtitleOverlay({ cues }: LiveSubtitleOverlayProps) {
  if (cues.length === 0) return null

  return (
    <View className="absolute bottom-24 left-4 right-4 items-center z-[100]">
      {cues.map((cue, idx) => (
        <View key={`${cue.timestamp}-${idx}`} className="bg-black/85 px-4 py-2 rounded-lg my-1 max-w-[90%] border border-white/10">
          <Text
            className="text-white text-2xl font-bold text-center leading-8"
            style={{
              textShadowColor: 'rgba(0, 0, 0, 1)',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 4,
            }}
          >
            {cue.text}
          </Text>
        </View>
      ))}
    </View>
  )
}
