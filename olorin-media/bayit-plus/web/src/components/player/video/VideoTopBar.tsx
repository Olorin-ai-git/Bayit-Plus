/**
 * VideoTopBar - Title, subtitle flags, and live badge
 *
 * Migration Status: ✅ Converted to StyleSheet.create()
 * File Size: Under 200 lines ✓
 */

import { View, Text, StyleSheet } from 'react-native'
import { z } from 'zod'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassBadge } from '@bayit/shared/ui'
import { getLanguageInfo } from '@/types/subtitle'

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
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text
          style={styles.title}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Available Subtitle Languages */}
        {!isLive && availableSubtitles.length > 0 && (
          <View style={styles.subtitleFlags}>
            {availableSubtitles.slice(0, 6).map((track) => {
              const langInfo = getLanguageInfo(track.language)
              return (
                <Text
                  key={track.id}
                  style={styles.flag}
                >
                  {langInfo?.flag || '🌐'}
                </Text>
              )
            })}
            {availableSubtitles.length > 6 && (
              <Text style={styles.moreCount}>
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleFlags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  flag: {
    fontSize: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  moreCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
})
