/**
 * GlossaryDetailScreenMobile
 *
 * Detailed word view with full definition, etymology,
 * usage examples, audio pronunciation, and related words.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import { api } from '@bayit/shared-services/api';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('GlossaryDetailScreenMobile');
type RouteParams = { wordId: string };

interface GlossaryWord {
  phrase: string;
  nikud?: string;
  transliteration: string;
  partOfSpeech?: string;
  translation: string;
  origin: string;
  usageExample: string;
  funFact: string;
  tags: string[];
  audioUrl?: string;
  relatedWords?: Array<{ phrase: string; transliteration: string; id: string }>;
  contextQuotes?: Array<{ text: string; source: string }>;
}

export const GlossaryDetailScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<any>();
  const { isRTL } = useDirection();
  const { wordId } = route.params;
  const [word, setWord] = useState<GlossaryWord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchWord(); }, [wordId]);

  const fetchWord = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get(`/cultural/glossary/${encodeURIComponent(wordId)}`);
      setWord(data as unknown as GlossaryWord);
    } catch (err) {
      moduleLogger.error('Failed to fetch glossary word', { wordId, error: err instanceof Error ? err.message : String(err) });
    } finally { setIsLoading(false); }
  }, [wordId]);

  const handlePronunciation = useCallback(() => {
    if (word?.audioUrl) { moduleLogger.info('Playing pronunciation audio', { wordId }); }
  }, [word, wordId]);

  const handleRelatedWordPress = useCallback((relatedId: string) => {
    navigation.push('GlossaryDetail', { wordId: relatedId });
  }, [navigation]);

  const align = isRTL ? 'right' : 'left';

  if (isLoading) {
    return (<SafeAreaView style={styles.loadWrap}><GlassLoadingSpinner size="large" /></SafeAreaView>);
  }

  if (!word) {
    return (
      <SafeAreaView style={styles.errWrap}>
        <NativeIcon name="alertCircle" size="xxxl" color={colors.error} />
        <Text style={styles.errText}>{t('glossary.loadError')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.mainCard}>
          <Text style={[styles.phrase, { textAlign: align }]} accessibilityRole="header">{word.phrase}</Text>
          {word.nikud && <Text style={[styles.nikud, { textAlign: align }]}>{word.nikud}</Text>}
          <Text style={[styles.translit, { textAlign: align }]}>{word.transliteration}</Text>
          {word.partOfSpeech && (
            <View style={styles.posBadge}><Text style={styles.posText}>{word.partOfSpeech}</Text></View>
          )}
          <TouchableOpacity style={styles.audioBtn} onPress={handlePronunciation}
            accessibilityLabel={t('glossary.playPronunciation')} accessibilityHint={t('glossary.playPronunciationHint')} accessibilityRole="button">
            <NativeIcon name="volume2" size="md" color={colors.primary} />
            <Text style={styles.audioBtnText}>{t('glossary.listenPronunciation')}</Text>
          </TouchableOpacity>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={[styles.secTitle, { textAlign: align }]}>{t('glossary.definition')}</Text>
          <Text style={[styles.secBody, { textAlign: align }]}>{word.translation}</Text>
        </GlassCard>

        {word.origin ? (
          <GlassCard style={styles.section}>
            <Text style={[styles.secTitle, { textAlign: align }]}>{t('glossary.etymology')}</Text>
            <Text style={[styles.secBody, { textAlign: align }]}>{word.origin}</Text>
          </GlassCard>
        ) : null}

        {word.usageExample ? (
          <GlassCard style={styles.section}>
            <Text style={[styles.secTitle, { textAlign: align }]}>{t('glossary.usageExample')}</Text>
            <Text style={[styles.exampleText, { textAlign: align }]}>{word.usageExample}</Text>
          </GlassCard>
        ) : null}

        {word.funFact ? (
          <GlassCard style={styles.section}>
            <View style={[styles.funFactHdr, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <NativeIcon name="sparkles" size="sm" color={colors.warning} />
              <Text style={styles.funFactTitle}>{t('glossary.funFact')}</Text>
            </View>
            <Text style={[styles.secBody, { textAlign: align }]}>{word.funFact}</Text>
          </GlassCard>
        ) : null}

        {word.contextQuotes && word.contextQuotes.length > 0 ? (
          <GlassCard style={styles.section}>
            <Text style={[styles.secTitle, { textAlign: align }]}>{t('glossary.usageInContext')}</Text>
            {word.contextQuotes.map((quote, i) => (
              <View key={i} style={styles.quoteWrap}>
                <Text style={[styles.quoteText, { textAlign: align }]}>{quote.text}</Text>
                <Text style={[styles.quoteSrc, { textAlign: align }]}>{quote.source}</Text>
              </View>
            ))}
          </GlassCard>
        ) : null}

        {word.relatedWords && word.relatedWords.length > 0 ? (
          <GlassCard style={styles.section}>
            <Text style={[styles.secTitle, { textAlign: align }]}>{t('glossary.relatedWords')}</Text>
            {word.relatedWords.map((related) => (
              <TouchableOpacity key={related.id}
                style={[styles.relatedItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => handleRelatedWordPress(related.id)}
                accessibilityLabel={`${related.phrase} - ${related.transliteration}`}
                accessibilityHint={t('glossary.tapForDetails')} accessibilityRole="link">
                <View style={styles.relatedText}>
                  <Text style={styles.relatedPhrase}>{related.phrase}</Text>
                  <Text style={styles.relatedTranslit}>{related.transliteration}</Text>
                </View>
                <NativeIcon name={isRTL ? 'chevronLeft' : 'chevronRight'} size="xs" color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </GlassCard>
        ) : null}

        {word.tags.length > 0 && (
          <View style={[styles.tagsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {word.tags.map((tag) => (
              <View key={tag} style={styles.tagBadge}><Text style={styles.tagText}>{tag}</Text></View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadWrap: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  errWrap: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errText: { color: colors.error, fontSize: fontSize.md, marginTop: spacing.md },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  mainCard: { padding: spacing.lg, marginBottom: spacing.md },
  phrase: { fontSize: fontSize.xxxl, fontWeight: '700', color: colors.text },
  nikud: { fontSize: fontSize.xl, color: colors.textSecondary, marginTop: spacing.xs },
  translit: { fontSize: fontSize.md, fontStyle: 'italic', color: colors.primary, marginTop: spacing.xs },
  posBadge: { marginTop: spacing.sm, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full, backgroundColor: `${colors.primary}20` },
  posText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  audioBtn: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.lg, backgroundColor: `${colors.primary}15`, alignSelf: 'flex-start', gap: spacing.sm },
  audioBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  section: { padding: spacing.md, marginBottom: spacing.md },
  secTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  secBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: fontSize.sm * 1.6 },
  exampleText: { fontSize: fontSize.sm, color: colors.textSecondary, fontStyle: 'italic', lineHeight: fontSize.sm * 1.6 },
  funFactHdr: { alignItems: 'center', marginBottom: spacing.sm, gap: spacing.xs },
  funFactTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.warning },
  quoteWrap: { marginBottom: spacing.md, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.primary },
  quoteText: { fontSize: fontSize.sm, color: colors.textSecondary, fontStyle: 'italic', lineHeight: fontSize.sm * 1.5 },
  quoteSrc: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  relatedItem: { alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  relatedText: { flex: 1 },
  relatedPhrase: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  relatedTranslit: { fontSize: fontSize.xs, color: colors.primary, fontStyle: 'italic' },
  tagsWrap: { flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, paddingHorizontal: spacing.xs },
  tagBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: `${colors.primary}20` },
  tagText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '500' },
});

export default GlossaryDetailScreenMobile;
