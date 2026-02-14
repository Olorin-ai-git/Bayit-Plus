/**
 * VocabularyTracker - Track vocabulary learning progress
 *
 * Displays words learned, mastery levels, practice streak,
 * and overall learning statistics for kids profiles.
 */
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassCard } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('VocabularyTracker');

interface VocabularyWord {
  word: string;
  mastery: number;
  lastPracticed: string;
}

interface VocabularyTrackerProps {
  words: VocabularyWord[];
  totalLearned: number;
  streak: number;
}

const MASTERY_LEVELS = [
  { min: 0, max: 25, label: 'beginner', color: '#EF4444' },
  { min: 25, max: 50, label: 'learning', color: '#F59E0B' },
  { min: 50, max: 75, label: 'familiar', color: '#3B82F6' },
  { min: 75, max: 100, label: 'mastered', color: '#10B981' },
] as const;

const getMasteryLevel = (mastery: number) =>
  MASTERY_LEVELS.find((l) => mastery >= l.min && mastery <= l.max) || MASTERY_LEVELS[0];

export const VocabularyTracker: React.FC<VocabularyTrackerProps> = ({
  words,
  totalLearned,
  streak,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const renderStatsBar = () => (
    <View style={[styles.statsBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <GlassCard style={styles.statItem}>
        <NativeIcon name="book" size="md" color={colors.primary} />
        <Text style={styles.statNumber}>{totalLearned}</Text>
        <Text style={styles.statText}>{t('kids.vocabulary.totalLearned')}</Text>
      </GlassCard>
      <GlassCard style={styles.statItem}>
        <NativeIcon name="flame" size="md" color="#F59E0B" />
        <Text style={styles.statNumber}>{streak}</Text>
        <Text style={styles.statText}>{t('kids.vocabulary.dayStreak')}</Text>
      </GlassCard>
      <GlassCard style={styles.statItem}>
        <NativeIcon name="star" size="md" color="#10B981" />
        <Text style={styles.statNumber}>
          {words.length > 0
            ? Math.round(words.reduce((sum, w) => sum + w.mastery, 0) / words.length)
            : 0}%
        </Text>
        <Text style={styles.statText}>{t('kids.vocabulary.avgMastery')}</Text>
      </GlassCard>
    </View>
  );

  const renderWord = ({ item }: { item: VocabularyWord }) => {
    const level = getMasteryLevel(item.mastery);
    return (
      <GlassCard
        style={styles.wordCard}
        accessibilityLabel={t('kids.vocabulary.wordLabel', {
          word: item.word,
          mastery: item.mastery,
        })}
        accessibilityRole="text"
      >
        <View style={[styles.wordRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.wordInfo}>
            <Text style={[styles.wordText, { textAlign }]}>{item.word}</Text>
            <Text style={[styles.lastPracticed, { textAlign }]}>
              {item.lastPracticed}
            </Text>
          </View>
          <View style={styles.masterySection}>
            <View style={styles.masteryBarBg}>
              <View
                style={[
                  styles.masteryBarFill,
                  { width: `${item.mastery}%`, backgroundColor: level.color },
                ]}
              />
            </View>
            <Text style={[styles.masteryLabel, { color: level.color }]}>
              {t(`kids.vocabulary.levels.${level.label}`)}
            </Text>
          </View>
        </View>
      </GlassCard>
    );
  };

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('kids.vocabulary.trackerLabel')}
      accessibilityRole="summary"
    >
      <Text style={[styles.title, { textAlign }]}>
        {t('kids.vocabulary.title')}
      </Text>

      {renderStatsBar()}

      <Text style={[styles.sectionTitle, { textAlign }]}>
        {t('kids.vocabulary.recentWords')}
      </Text>

      <FlatList
        data={words}
        renderItem={renderWord}
        keyExtractor={(item) => item.word}
        scrollEnabled={false}
        contentContainerStyle={styles.wordList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <NativeIcon name="book" size="xl" color={colors.textMuted} />
            <Text style={[styles.emptyText, { textAlign }]}>
              {t('kids.vocabulary.noWords')}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  statsBar: { gap: spacing.sm, marginBottom: spacing.lg },
  statItem: {
    flex: 1, padding: spacing.md, borderRadius: borderRadius.md,
    alignItems: 'center', gap: spacing.xs,
  },
  statNumber: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  statText: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  wordList: { gap: spacing.sm },
  wordCard: { padding: spacing.md, borderRadius: borderRadius.md },
  wordRow: { alignItems: 'center', gap: spacing.md },
  wordInfo: { flex: 1 },
  wordText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  lastPracticed: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  masterySection: { width: 100, alignItems: 'flex-end', gap: spacing.xs },
  masteryBarBg: {
    width: '100%', height: 6, backgroundColor: colors.glassMedium,
    borderRadius: borderRadius.full, overflow: 'hidden',
  },
  masteryBarFill: { height: '100%', borderRadius: borderRadius.full },
  masteryLabel: { fontSize: fontSize.xs, fontWeight: '500' },
  emptyContainer: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },
});
