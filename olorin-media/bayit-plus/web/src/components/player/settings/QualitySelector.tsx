/**
 * QualitySelector Component
 * Video quality selection
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { z } from 'zod'
import { colors } from '@bayit/shared/theme'
import type { QualityOption } from '../types'

// Validation schema
export const QualitySelectorPropsSchema = z.object({
  availableQualities: z.array(z.object({
    quality: z.string(),
    resolution_height: z.number(),
    content_id: z.string(),
    label: z.string().optional(),
  })),
  currentQuality: z.string().optional(),
  onQualityChange: z.function().args(z.string()).returns(z.void()).optional(),
})

export type QualitySelectorProps = z.infer<typeof QualitySelectorPropsSchema>

// Quality label mapping
function getQualityLabel(quality: string): string {
  const qualityMap: Record<string, string> = {
    '4k': '4K Ultra HD',
    '1080p': '1080p Full HD',
    '720p': '720p HD',
    '480p': '480p SD',
  }
  return qualityMap[quality] || quality.toUpperCase()
}

export default function QualitySelector({
  availableQualities,
  currentQuality,
  onQualityChange,
}: QualitySelectorProps) {
  const { t } = useTranslation()

  return (
    <View className="mb-6">
      <Text className="text-sm font-semibold text-white mb-2">
        {t('player.quality')}
      </Text>
      <View className="gap-1">
        {availableQualities.length > 0 ? (
          availableQualities.map((quality) => {
            const isActive = currentQuality === quality.quality
            const displayLabel = getQualityLabel(quality.quality)

            return (
              <Pressable
                key={quality.content_id}
                className="flex-row items-center justify-between p-4 rounded-xl border"
                style={[isActive ? styles.qualityActive : styles.qualityInactive]}
                onPress={() => onQualityChange?.(quality.quality)}
              >
                <View className="flex-row items-center flex-1">
                  <Text
                    className="text-sm font-medium"
                    style={[isActive ? styles.textActive : styles.textInactive]}
                  >
                    {displayLabel}
                  </Text>
                  {quality.resolution_height > 0 && (
                    <Text className="text-xs text-gray-500 ml-3">
                      {quality.resolution_height}p
                    </Text>
                  )}
                </View>
                {isActive && (
                  <Check size={16} color={colors.primary} />
                )}
              </Pressable>
            )
          })
        ) : (
          <Pressable
            className="py-2 px-4 rounded-xl border border-purple-500/50 bg-purple-500/10"
          >
            <Text className="text-sm font-semibold text-purple-400">
              {t('player.auto')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  qualityActive: {
    borderColor: 'rgba(168, 85, 247, 0.5)',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  qualityInactive: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  textActive: {
    color: '#c084fc',
    fontWeight: '600',
  },
  textInactive: {
    color: '#9ca3af',
  },
});
