/**
 * QualitySelector Component
 * Video quality selection
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { z } from 'zod'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
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
    <View style={styles.container}>
      <Text style={styles.title}>{t('player.quality')}</Text>
      <View style={styles.qualityList}>
        {availableQualities.length > 0 ? (
          availableQualities.map((quality) => {
            const isActive = currentQuality === quality.quality
            const displayLabel = getQualityLabel(quality.quality)

            return (
              <Pressable
                key={quality.content_id}
                style={[
                  styles.qualityButton,
                  isActive ? styles.qualityActive : styles.qualityInactive,
                ]}
                onPress={() => onQualityChange?.(quality.quality)}
              >
                <View style={styles.qualityContent}>
                  <Text style={[styles.qualityLabel, isActive ? styles.textActive : styles.textInactive]}>
                    {displayLabel}
                  </Text>
                  {quality.resolution_height > 0 && (
                    <Text style={styles.resolutionText}>{quality.resolution_height}p</Text>
                  )}
                </View>
                {isActive && <Check size={16} color={colors.primary} />}
              </Pressable>
            )
          })
        ) : (
          <Pressable style={styles.autoButton}>
            <Text style={styles.autoText}>{t('player.auto')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  qualityList: {
    gap: spacing[1],
  },
  qualityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  qualityActive: {
    borderColor: 'rgba(168, 85, 247, 0.5)',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  qualityInactive: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  qualityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  qualityLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  textActive: {
    color: '#c084fc',
    fontWeight: '600',
  },
  textInactive: {
    color: '#9ca3af',
  },
  resolutionText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: spacing[3],
  },
  autoButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  autoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c084fc',
  },
});
