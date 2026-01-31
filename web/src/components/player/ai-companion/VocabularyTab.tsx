/**
 * VocabularyTab Component
 *
 * Displays vocabulary words with Hebrew, transliteration, and translations.
 * Used within the AI Companion Sidebar.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Volume2 } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import type { VocabularyWord } from './useAICompanion';

interface VocabularyTabProps {
  vocabulary: VocabularyWord[];
  isRTL: boolean;
}

const TOUCH_TARGET_SIZE = 44;

export function VocabularyTab({ vocabulary, isRTL }: VocabularyTabProps) {
  const { t } = useTranslation();

  if (vocabulary.length === 0) {
    return <Text style={styles.emptyText}>{t('aiCompanion.noVocabulary')}</Text>;
  }

  return (
    <View style={styles.vocabularyList}>
      {vocabulary.map((word, index) => (
        <View key={index} style={styles.vocabularyCard}>
          <View style={[styles.vocabularyHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.hebrewWord}>{word.hebrew}</Text>
            <Pressable
              style={styles.audioButton}
              accessibilityLabel={t('aiCompanion.playPronunciation', 'Play pronunciation')}
              accessibilityRole="button"
            >
              <Volume2 size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.transliteration}>{word.transliteration}</Text>
          <Text style={styles.translation}>{word.english}</Text>
          {word.spanish && <Text style={styles.translationSecondary}>{word.spanish}</Text>}
          {word.context && <Text style={styles.wordContext}>{word.context}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  vocabularyList: {
    gap: spacing.sm,
  },
  vocabularyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  vocabularyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hebrewWord: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  audioButton: {
    width: TOUCH_TARGET_SIZE,
    height: TOUCH_TARGET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOUCH_TARGET_SIZE / 2,
  },
  transliteration: {
    fontSize: fontSize.sm,
    color: colors.primary.light,
    marginTop: 2,
  },
  translation: {
    fontSize: fontSize.base,
    color: colors.text,
    marginTop: spacing.xs,
  },
  translationSecondary: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  wordContext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});

export default VocabularyTab;
