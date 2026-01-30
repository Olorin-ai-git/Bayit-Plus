/**
 * EPGRecordSeriesScope
 * Series recording scope selector (episode/season/all)
 */

import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Repeat } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

type SeriesScope = 'episode' | 'season' | 'all_seasons'

interface EPGRecordSeriesScopeProps {
  scope: SeriesScope
  onScopeChange: (scope: SeriesScope) => void
  flexDirection: 'row' | 'row-reverse'
  textAlign: 'left' | 'right'
}

const SCOPE_KEYS: Record<SeriesScope, string> = {
  episode: 'recordings.thisEpisode',
  season: 'recordings.thisSeason',
  all_seasons: 'recordings.allSeasons',
}

export const EPGRecordSeriesScope: React.FC<EPGRecordSeriesScopeProps> = ({
  scope, onScopeChange, flexDirection, textAlign,
}) => {
  const { t } = useTranslation()

  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { flexDirection }]}>
        <Repeat size={16} color={colors.textMuted} />
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('recordings.seriesRecording')}</Text>
      </View>
      <View style={styles.scopeGrid}>
        {(['episode', 'season', 'all_seasons'] as const).map((s) => (
          <Pressable
            key={s}
            style={[styles.scopeButton, scope === s && styles.scopeButtonSelected]}
            onPress={() => onScopeChange(s)}
          >
            <Text style={[styles.scopeText, scope === s && styles.scopeTextSelected]}>
              {t(SCOPE_KEYS[s])}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '500', color: colors.text },
  scopeGrid: { flexDirection: 'row', gap: spacing.sm },
  scopeButton: {
    flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md, backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center',
  },
  scopeButtonSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: colors.primary.DEFAULT,
  },
  scopeText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  scopeTextSelected: { color: colors.text },
})
