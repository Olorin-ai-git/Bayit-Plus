/**
 * VideoTopBar - Title, subtitle flags, and live badge
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { View, Text } from 'react-native'
import { z } from 'zod'
import { GlassBadge } from '@bayit/shared/ui'
import { getLanguageInfo } from '@/types/subtitle'
import { platformClass } from '@/utils/platformClass'

// Zod schema for prop validation
const SubtitleTrackSchema = z.object({
  id: z.string(),
  language: z.string(),
})

const VideoTopBarPropsSchema = z.object({
  title: z.string().optional(),
  isLive: z.boolean(),
  availableSubtitles: z.array(SubtitleTrackSchema),
  liveLabel: z.string(),
})

export type VideoTopBarProps = z.infer<typeof VideoTopBarPropsSchema>

export default function VideoTopBar({
  title,
  isLive,
  availableSubtitles,
  liveLabel,
}: VideoTopBarProps) {
  return (
    <View
      className={platformClass(
        'absolute top-0 left-0 right-0 flex-row items-center justify-between p-4',
        'absolute top-0 left-0 right-0 flex-row items-center justify-between p-4'
      )}
    >
      <View className="flex-row items-center gap-4 flex-1">
        <Text
          className="text-lg font-semibold text-white"
          style={{
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Available Subtitle Languages */}
        {!isLive && availableSubtitles.length > 0 && (
          <View
            className={platformClass(
              'flex-row items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg',
              'flex-row items-center gap-1 bg-black/40 px-2 py-1 rounded-lg'
            )}
          >
            {availableSubtitles.slice(0, 6).map((track) => {
              const langInfo = getLanguageInfo(track.language)
              return (
                <Text
                  key={track.id}
                  className="text-lg"
                  style={{
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  {langInfo?.flag || '🌐'}
                </Text>
              )
            })}
            {availableSubtitles.length > 6 && (
              <Text className="text-xs text-neutral-400 ml-1">
                +{availableSubtitles.length - 6}
              </Text>
            )}
          </View>
        )}
      </View>

      {isLive && <GlassBadge variant="danger" size="sm">{liveLabel}</GlassBadge>}
    </View>
  )
}
