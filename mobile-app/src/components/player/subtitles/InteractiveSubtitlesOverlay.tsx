/**
 * InteractiveSubtitlesOverlay - Tap-to-translate subtitle words
 *
 * Renders subtitle text as individually tappable words. When a word
 * is tapped, it highlights and shows a translation popover.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { subtitlesService } from '@bayit/shared-services/api';
import { spacing, borderRadius } from '@olorin/design-tokens';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';

const log = logger.scope('InteractiveSubtitlesOverlay');
const RTL_LANGUAGES = ['he', 'ar', 'fa', 'ur'];

interface TranslationPopover { word: string; translation: string; transliteration: string; }

interface InteractiveSubtitlesOverlayProps {
  text: string;
  language: string;
  onWordTap?: (word: string) => void;
}

export const InteractiveSubtitlesOverlay: React.FC<InteractiveSubtitlesOverlayProps> = ({
  text, language, onWordTap,
}) => {
  const { t } = useTranslation();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [popover, setPopover] = useState<TranslationPopover | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const isRTL = RTL_LANGUAGES.includes(language);

  const handleWordTap = useCallback(async (word: string) => {
    const clean = word.replace(/[^\p{L}\p{N}]/gu, '');
    if (!clean) return;
    setSelectedWord(clean);
    setIsTranslating(true);
    onWordTap?.(clean);
    try {
      const result = await subtitlesService.translateWord(clean, language, language === 'he' ? 'en' : 'he');
      setPopover({ word: clean, translation: result.translation, transliteration: result.transliteration });
      log.info('Word translated', { word: clean, language });
    } catch (err) {
      log.error('Word translation failed', { word: clean, error: err });
      setPopover(null);
    } finally { setIsTranslating(false); }
  }, [language, onWordTap]);

  const dismissPopover = useCallback(() => { setSelectedWord(null); setPopover(null); }, []);

  if (!text) return null;
  const words = text.split(/\s+/);

  return (
    <View style={styles.container}>
      <Pressable onPress={dismissPopover} style={styles.backdrop}>
        <View style={styles.subtitleRow}>
          <View style={[styles.wordsContainer, isRTL && styles.rtl]}>
            {words.map((word, idx) => {
              const clean = word.replace(/[^\p{L}\p{N}]/gu, '');
              const isSel = clean === selectedWord;
              return (
                <Pressable key={`${word}-${idx}`} onPress={() => handleWordTap(word)}
                  style={[styles.wordBtn, isSel && styles.wordBtnSel]}
                  accessibilityLabel={t('subtitles.interactive.tapWord', { word: clean })}
                  accessibilityHint={t('subtitles.interactive.tapWordHint')} accessibilityRole="button">
                  <Text style={[styles.wordText, isSel && styles.wordTextSel]}>{word}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Pressable>
      {isTranslating && <View style={styles.popoverPos}><GlassLoadingSpinner size="small" /></View>}
      {popover && !isTranslating && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.popoverPos}>
          <View style={styles.popover}>
            <Text style={styles.popWord}>{popover.word}</Text>
            <Text style={styles.popTranslit}>{popover.transliteration}</Text>
            <Text style={styles.popTranslation}>{popover.translation}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: spacing.xl, left: spacing.md, right: spacing.md, alignItems: 'center' },
  backdrop: { alignItems: 'center' },
  subtitleRow: {
    backgroundColor: Colors.Glass.bgStrong, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, maxWidth: '90%',
  },
  wordsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 2 },
  rtl: { flexDirection: 'row-reverse' },
  wordBtn: { paddingHorizontal: 3, paddingVertical: 1, borderRadius: 3 },
  wordBtnSel: { backgroundColor: Colors.Primary.p600 },
  wordText: { fontSize: 16, color: Colors.Text.primary, fontWeight: '500' },
  wordTextSel: { fontWeight: '700' },
  popoverPos: { position: 'absolute', bottom: 50, alignSelf: 'center' },
  popover: {
    backgroundColor: Colors.Glass.bgStrong, borderRadius: borderRadius.md,
    padding: spacing.sm, borderWidth: 1, borderColor: Colors.Primary.p600, alignItems: 'center', minWidth: 120,
  },
  popWord: { fontSize: 20, fontWeight: '700', color: Colors.Text.primary },
  popTranslit: { fontSize: 13, color: Colors.Primary.p300, fontStyle: 'italic', marginTop: 2 },
  popTranslation: { fontSize: 14, color: Colors.Text.secondary, marginTop: spacing.xxs },
});
