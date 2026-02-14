/**
 * CompanionVocabularyTab - Hebrew vocabulary from current content
 *
 * Displays extracted vocabulary words with transliteration,
 * translation, and audio playback capability.
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius } from '@olorin/design-tokens';
import type { VocabularyWord } from '../../../hooks/useAICompanion';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';

const log = logger.scope('CompanionVocabularyTab');

interface CompanionVocabularyTabProps {
  contentId: string;
  words: VocabularyWord[];
  isLoading: boolean;
  error: string | null;
  onFetch: () => void;
}

export const CompanionVocabularyTab: React.FC<CompanionVocabularyTabProps> = ({
  contentId, words, isLoading, error, onFetch,
}) => {
  const { t } = useTranslation();

  useEffect(() => { if (words.length === 0 && !isLoading) onFetch(); }, [contentId]);

  const handlePlayAudio = useCallback((word: VocabularyWord) => {
    if (!word.audioUrl) return;
    log.info('Vocabulary audio play requested', { word: word.word, contentId });
  }, [contentId]);

  if (isLoading && words.length === 0) {
    return (
      <View style={styles.centered}>
        <GlassLoadingSpinner size="medium" />
        <Text style={styles.mutedText}>{t('aiCompanion.vocabularyTab.loading')}</Text>
      </View>
    );
  }

  if (error && words.length === 0) {
    return (
      <View style={styles.centered}>
        <NativeIcon name="alert-triangle" size="lg" color={Colors.Error.default} />
        <Text style={styles.errorText}>{error}</Text>
        <GlassButton variant="secondary" size="small" onPress={onFetch}
          accessibilityLabel={t('aiCompanion.vocabularyTab.retry')}
          accessibilityHint={t('aiCompanion.vocabularyTab.retryHint')} accessibilityRole="button">
          {t('aiCompanion.vocabularyTab.retry')}
        </GlassButton>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <NativeIcon name="languages" size="md" color={Colors.Primary.p400} />
        <Text style={styles.sectionTitle}>{t('aiCompanion.vocabularyTab.title')}</Text>
        <Text style={styles.wordCount}>{t('aiCompanion.vocabularyTab.count', { count: words.length })}</Text>
      </View>
      {words.map((word, idx) => (
        <View key={`${word.word}-${idx}`} style={styles.wordCard}>
          <View style={styles.wordHeader}>
            <Text style={styles.hebrewWord}>{word.word}</Text>
            {word.audioUrl && (
              <Pressable onPress={() => handlePlayAudio(word)} style={styles.playBtn}
                accessibilityLabel={t('aiCompanion.vocabularyTab.playAudio', { word: word.word })}
                accessibilityHint={t('aiCompanion.vocabularyTab.playAudioHint')} accessibilityRole="button">
                <NativeIcon name="volume-2" size="sm" color={Colors.Primary.p400} />
              </Pressable>
            )}
          </View>
          <Text style={styles.transliteration}>{word.transliteration}</Text>
          <Text style={styles.translation}>{word.translation}</Text>
        </View>
      ))}
      <GlassButton variant="secondary" size="small" onPress={onFetch} disabled={isLoading}
        style={styles.refreshBtn} accessibilityLabel={t('aiCompanion.vocabularyTab.refresh')}
        accessibilityHint={t('aiCompanion.vocabularyTab.refreshHint')} accessibilityRole="button">
        {isLoading ? t('aiCompanion.vocabularyTab.loading') : t('aiCompanion.vocabularyTab.refresh')}
      </GlassButton>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.sm },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  mutedText: { fontSize: 14, color: Colors.Text.muted },
  errorText: { fontSize: 14, color: Colors.Error.default, textAlign: 'center', marginVertical: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.Text.primary, flex: 1 },
  wordCount: { fontSize: 12, color: Colors.Text.muted, fontWeight: '500' },
  wordCard: {
    backgroundColor: Colors.Glass.whiteLight, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: Colors.Glass.borderLight,
  },
  wordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hebrewWord: { fontSize: 24, fontWeight: '700', color: Colors.Text.primary },
  playBtn: { padding: spacing.xs, borderRadius: borderRadius.full, backgroundColor: Colors.Glass.purpleLight },
  transliteration: { fontSize: 14, color: Colors.Primary.p300, fontStyle: 'italic', marginTop: spacing.xxs },
  translation: { fontSize: 14, color: Colors.Text.secondary, marginTop: spacing.xxs },
  refreshBtn: { marginTop: spacing.sm, alignSelf: 'center' },
});
