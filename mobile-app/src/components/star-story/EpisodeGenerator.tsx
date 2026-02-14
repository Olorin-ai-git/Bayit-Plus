/**
 * EpisodeGenerator
 *
 * Episode creation form with story theme selection,
 * character customization, and length picker.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassButton, GlassCard } from '@olorin/glass-ui/native';
import { NativeIcon, IconName } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('EpisodeGenerator');

interface EpisodeGeneratorProps {
  profileId: string;
  onGenerate: (params: { theme: string; vocabulary: string[]; length: 'short' | 'medium' | 'long' }) => void;
  isGenerating: boolean;
}

interface ThemeOption { id: string; icon: IconName }

const THEMES: ThemeOption[] = [
  { id: 'adventure', icon: 'compass' }, { id: 'friendship', icon: 'heart' },
  { id: 'space', icon: 'star' }, { id: 'nature', icon: 'tree' },
  { id: 'music', icon: 'music' }, { id: 'animals', icon: 'paw' },
];

const LENGTHS: Array<{ id: 'short' | 'medium' | 'long'; durKey: string }> = [
  { id: 'short', durKey: 'starStory.length.shortDuration' },
  { id: 'medium', durKey: 'starStory.length.mediumDuration' },
  { id: 'long', durKey: 'starStory.length.longDuration' },
];

export const EpisodeGenerator: React.FC<EpisodeGeneratorProps> = ({ profileId, onGenerate, isGenerating }) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [theme, setTheme] = useState<string>(THEMES[0].id);
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');

  const handleGenerate = useCallback(() => {
    moduleLogger.info('Generating episode', { profileId, theme, length });
    onGenerate({ theme, vocabulary: [], length });
  }, [profileId, theme, length, onGenerate]);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <GlassCard style={styles.section}>
        <Text style={[styles.secTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('starStory.chooseTheme')}</Text>
        <View style={styles.themeGrid}>
          {THEMES.map((th) => (
            <TouchableOpacity key={th.id} style={[styles.themeOpt, theme === th.id && styles.themeOptActive]}
              onPress={() => setTheme(th.id)} accessibilityLabel={t(`starStory.theme.${th.id}`)}
              accessibilityHint={t('starStory.selectThemeHint')} accessibilityRole="radio" accessibilityState={{ selected: theme === th.id }}>
              <NativeIcon name={th.icon} size="lg" color={theme === th.id ? colors.primary : colors.textSecondary} />
              <Text style={[styles.themeLabel, theme === th.id && styles.themeLabelActive]}>{t(`starStory.theme.${th.id}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={[styles.secTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('starStory.episodeLength')}</Text>
        <View style={styles.lenOpts}>
          {LENGTHS.map((opt) => (
            <TouchableOpacity key={opt.id} style={[styles.lenOpt, length === opt.id && styles.lenOptActive]}
              onPress={() => setLength(opt.id)} accessibilityLabel={t(`starStory.length.${opt.id}`)}
              accessibilityHint={t(opt.durKey)} accessibilityRole="radio" accessibilityState={{ selected: length === opt.id }}>
              <Text style={[styles.lenLabel, length === opt.id && styles.lenLabelActive]}>{t(`starStory.length.${opt.id}`)}</Text>
              <Text style={styles.lenDur}>{t(opt.durKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      <GlassButton onPress={handleGenerate} disabled={isGenerating} style={styles.genBtn}
        accessibilityLabel={t('starStory.generateEpisode')} accessibilityHint={t('starStory.generateEpisodeHint')} accessibilityRole="button">
        <View style={styles.genContent}>
          <NativeIcon name={isGenerating ? 'loader' : 'sparkles'} size="md" color={colors.text} />
          <Text style={styles.genText}>{isGenerating ? t('starStory.generating') : t('starStory.generateEpisode')}</Text>
        </View>
      </GlassButton>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  section: { padding: spacing.md, marginBottom: spacing.md },
  secTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  themeOpt: { width: '30%', flexGrow: 1, alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 2, borderColor: 'transparent' },
  themeOptActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  themeLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, fontWeight: '500', textAlign: 'center' },
  themeLabelActive: { color: colors.primary, fontWeight: '600' },
  lenOpts: { flexDirection: 'row', gap: spacing.sm },
  lenOpt: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 2, borderColor: 'transparent' },
  lenOptActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  lenLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  lenLabelActive: { color: colors.primary },
  lenDur: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  genBtn: { marginTop: spacing.md, paddingVertical: spacing.md },
  genContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  genText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
});

export default EpisodeGenerator;
