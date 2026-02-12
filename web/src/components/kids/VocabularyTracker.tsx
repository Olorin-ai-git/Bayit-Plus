/**
 * VocabularyTracker
 * Parent dashboard showing Hebrew learning progress for the Bilingual Bridge feature
 */

import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassCard, GlassView } from '@bayit/shared/ui';
import { LanguageRatioIndicator } from '../player/LanguageRatioIndicator';
import { useBilingualDubbingStore } from '@/stores/bilingualDubbingStore';

interface VocabularyTrackerProps {
  profileId: string;
}

const LEVEL_ORDER = ['beginner', 'elementary', 'intermediate', 'advanced'] as const;

export default function VocabularyTracker({ profileId }: VocabularyTrackerProps) {
  const { t } = useTranslation();
  const { proficiency, loading, fetchProficiency } = useBilingualDubbingStore();

  useEffect(() => {
    if (profileId) {
      fetchProficiency(profileId);
    }
  }, [profileId, fetchProficiency]);

  const levelIndex = useMemo(() => {
    if (!proficiency?.level) return 0;
    const idx = LEVEL_ORDER.indexOf(proficiency.level as typeof LEVEL_ORDER[number]);
    return idx >= 0 ? idx : 0;
  }, [proficiency?.level]);

  const progressToNext = useMemo(() => {
    if (!proficiency) return 0;
    return Math.min(proficiency.overall_score / 100, 1);
  }, [proficiency?.overall_score]);

  if (loading && !proficiency) {
    return (
      <GlassCard style={styles.card}>
        <Text style={styles.loadingText}>
          {t('common.loading', 'Loading...')}
        </Text>
      </GlassCard>
    );
  }

  if (!proficiency) return null;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <GlassCard style={styles.card}>
        <Text style={styles.title}>
          {t('bilingual.tracker.title', 'Hebrew Learning Progress')}
        </Text>

        {/* Total Words */}
        <View style={styles.statRow}>
          <Text style={styles.statValue}>{proficiency.total_words_learned}</Text>
          <Text style={styles.statLabel}>
            {t('bilingual.tracker.totalWords', 'Total Words Learned')}
          </Text>
        </View>

        {/* Known vs Learning */}
        <View style={styles.countsRow}>
          <View style={styles.countBlock}>
            <Text style={styles.countValue}>{proficiency.vocabulary_known_count}</Text>
            <Text style={styles.countLabel}>
              {t('bilingual.tracker.known', 'Known')}
            </Text>
          </View>
          <View style={styles.countDivider} />
          <View style={styles.countBlock}>
            <Text style={styles.countValue}>{proficiency.vocabulary_learning_count}</Text>
            <Text style={styles.countLabel}>
              {t('bilingual.tracker.learning', 'Learning')}
            </Text>
          </View>
        </View>

        {/* Level Progression */}
        <View style={styles.levelSection}>
          <Text style={styles.sectionTitle}>
            {t('bilingual.tracker.levelProgress', 'Level Progress')}
          </Text>
          <View style={styles.levelTrack}>
            {LEVEL_ORDER.map((level, idx) => (
              <View key={level} style={styles.levelStep}>
                <View
                  style={[
                    styles.levelDot,
                    idx <= levelIndex && styles.levelDotActive,
                    idx === levelIndex && styles.levelDotCurrent,
                  ]}
                />
                <Text
                  style={[
                    styles.levelName,
                    idx <= levelIndex && styles.levelNameActive,
                  ]}
                >
                  {t(`bilingual.level.${level}`, level)}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.progressBarOuter}>
            <View
              style={[styles.progressBarInner, { width: `${progressToNext * 100}%` }]}
            />
          </View>
        </View>

        {/* Hebrew Ratio */}
        <View style={styles.ratioSection}>
          <Text style={styles.sectionTitle}>
            {t('bilingual.tracker.hebrewRatio', 'Hebrew Ratio')}
          </Text>
          <LanguageRatioIndicator hebrewRatio={proficiency.hebrew_ratio} />
        </View>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.md },
  card: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  statRow: { alignItems: 'center', gap: spacing.xs },
  statValue: { color: colors.text, fontSize: 36, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 13 },
  countsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  countBlock: { alignItems: 'center', flex: 1 },
  countValue: { color: '#3B82F6', fontSize: 24, fontWeight: '700' },
  countLabel: { color: colors.textSecondary, fontSize: 12 },
  countDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'stretch' },
  levelSection: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  levelTrack: { flexDirection: 'row', justifyContent: 'space-between' },
  levelStep: { alignItems: 'center', gap: spacing.xs },
  levelDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  levelDotActive: { backgroundColor: 'rgba(139, 92, 246, 0.6)', borderColor: 'rgba(139, 92, 246, 0.8)' },
  levelDotCurrent: { backgroundColor: '#7E22CE', borderColor: '#A855F7' },
  levelName: { color: colors.textMuted, fontSize: 10, textTransform: 'capitalize' },
  levelNameActive: { color: colors.text },
  progressBarOuter: {
    height: 4, borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  progressBarInner: { height: 4, backgroundColor: '#7E22CE', borderRadius: borderRadius.full },
  ratioSection: { gap: spacing.sm },
});
