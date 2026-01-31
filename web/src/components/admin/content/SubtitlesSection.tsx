import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { GlassView, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { FlagWithSparkle, getLanguageName } from '@/components/common/FlagWithSparkle'
import { subtitlesService } from '@/services/api'
import logger from '@/utils/logger'

interface SubtitleTrack {
  id: string
  content_id: string
  language: string
  language_name: string
  format: string
  has_nikud_version: boolean
  has_shoresh_version: boolean
  has_heblish_version: boolean
  has_grammar_flip_version?: boolean
  has_slang_synthesis_version?: boolean
  is_default: boolean
  is_auto_generated: boolean
  cue_count: number
}

interface SubtitlesSectionProps {
  contentId: string
  disabled?: boolean
}

export default function SubtitlesSection({ contentId, disabled }: SubtitlesSectionProps) {
  const { t } = useTranslation()
  const [tracks, setTracks] = useState<SubtitleTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settingDefault, setSettingDefault] = useState<string | null>(null)

  useEffect(() => {
    if (contentId) {
      loadTracks()
    }
  }, [contentId])

  const loadTracks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await subtitlesService.getTracks(contentId)
      setTracks(response.data.tracks || [])
      logger.info(`Loaded ${response.data.tracks?.length || 0} subtitle tracks for ${contentId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load subtitles'
      logger.error(`Failed to load subtitle tracks: ${msg}`)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetDefault = async (track: SubtitleTrack) => {
    if (track.is_default || disabled) return

    try {
      setSettingDefault(track.id)
      await subtitlesService.setDefault(contentId, track.language)
      setTracks(prev => prev.map(t => ({
        ...t,
        is_default: t.id === track.id
      })))
      logger.info(`Set default subtitle: ${track.language}`)
    } catch (err) {
      logger.error(`Failed to set default subtitle: ${err}`)
    } finally {
      setSettingDefault(null)
    }
  }

  const hasAIEnhancement = (track: SubtitleTrack): boolean => {
    if (track.language === 'he') {
      return track.has_nikud_version || track.has_shoresh_version
    }
    if (track.language === 'en') {
      return track.has_heblish_version ||
             (track.has_grammar_flip_version ?? false) ||
             (track.has_slang_synthesis_version ?? false)
    }
    return false
  }

  const getAIFeatures = (track: SubtitleTrack): string[] => {
    const features: string[] = []
    if (track.language === 'he') {
      if (track.has_nikud_version) features.push(t('player.subtitles.modes.nikud', 'Nikud'))
      if (track.has_shoresh_version) features.push(t('player.subtitles.modes.shoresh', 'Shoresh'))
    }
    if (track.language === 'en') {
      if (track.has_heblish_version) features.push(t('player.subtitles.modes.heblish', 'Heblish'))
      if (track.has_grammar_flip_version) features.push(t('player.subtitles.modes.grammarFlip', 'Grammar Flip'))
      if (track.has_slang_synthesis_version) features.push(t('player.subtitles.modes.slangSynthesis', 'Slang Synthesis'))
    }
    return features
  }

  if (isLoading) {
    return (
      <GlassView style={styles.section} intensity="high">
        <Text style={styles.sectionTitle}>
          {t('admin.content.editor.sections.subtitles', 'Subtitles')}
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>
            {t('common.loading', 'Loading...')}
          </Text>
        </View>
      </GlassView>
    )
  }

  return (
    <GlassView style={styles.section} intensity="high">
      <Text style={styles.sectionTitle}>
        {t('admin.content.editor.sections.subtitles', 'Subtitles')}
      </Text>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {tracks.length === 0 ? (
        <Text style={styles.emptyText}>
          {t('admin.content.subtitles.noTracks', 'No subtitle tracks available')}
        </Text>
      ) : (
        <View style={styles.trackList}>
          <Text style={styles.label}>
            {t('admin.content.subtitles.availableTracks', 'Available Tracks')}
          </Text>

          {tracks.map((track) => {
            const aiFeatures = getAIFeatures(track)
            const hasAI = hasAIEnhancement(track)

            return (
              <View key={track.id} style={styles.trackRow}>
                <View style={styles.trackInfo}>
                  <FlagWithSparkle
                    language={track.language}
                    hasAI={hasAI}
                    size="large"
                    showTooltip={false}
                  />
                  <View style={styles.trackDetails}>
                    <Text style={styles.trackLanguage}>
                      {getLanguageName(track.language)}
                    </Text>
                    <Text style={styles.trackMeta}>
                      {track.cue_count} {t('admin.content.subtitles.cues', 'cues')}
                      {track.is_auto_generated && ` • ${t('admin.content.subtitles.autoGenerated', 'Auto')}`}
                      {aiFeatures.length > 0 && ` • AI: ${aiFeatures.join(', ')}`}
                    </Text>
                  </View>
                </View>

                <GlassButton
                  title={track.is_default
                    ? t('admin.content.subtitles.default', 'Default')
                    : t('admin.content.subtitles.setDefault', 'Set Default')
                  }
                  onPress={() => handleSetDefault(track)}
                  variant={track.is_default ? 'primary' : 'outline'}
                  disabled={disabled || track.is_default || settingDefault === track.id}
                  loading={settingDefault === track.id}
                  style={styles.defaultButton}
                />
              </View>
            )
          })}
        </View>
      )}

      <View style={styles.refreshContainer}>
        <GlassButton
          title={t('admin.content.subtitles.refresh', 'Refresh')}
          onPress={loadTracks}
          variant="ghost"
          disabled={disabled || isLoading}
          style={styles.refreshButton}
        />
      </View>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  section: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error.DEFAULT,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  trackList: {
    gap: spacing.sm,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  trackDetails: {
    flex: 1,
  },
  trackLanguage: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  trackMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  defaultButton: {
    minWidth: 100,
  },
  refreshContainer: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  refreshButton: {
    minWidth: 80,
  },
})
