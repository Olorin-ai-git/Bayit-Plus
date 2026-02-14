/**
 * EpisodeGenerator
 *
 * Episode creation form with story theme selection,
 * character customization, and length picker.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassButton, GlassCard } from '@olorin/glass-ui/native';
import { NativeIcon, IconName } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('EpisodeGenerator');

interface EpisodeGeneratorProps {
  profileId: string;
  onGenerate: (params: {
    theme: string;
    vocabulary: string[];
    length: 'short' | 'medium' | 'long';
  }) => void;
  isGenerating: boolean;
}

interface ThemeOption {
  id: string;
  icon: IconName;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'adventure', icon: 'compass' },
  { id: 'friendship', icon: 'heart' },
  { id: 'space', icon: 'star' },
  { id: 'nature', icon: 'tree' },
  { id: 'music', icon: 'music' },
  { id: 'animals', icon: 'paw' },
];

interface LengthOption {
  id: 'short' | 'medium' | 'long';
  durationKey: string;
}

const LENGTH_OPTIONS: LengthOption[] = [
  { id: 'short', durationKey: 'starStory.length.shortDuration' },
  { id: 'medium', durationKey: 'starStory.length.mediumDuration' },
  { id: 'long', durationKey: 'starStory.length.longDuration' },
];

export const EpisodeGenerator: React.FC<EpisodeGeneratorProps> = ({
  profileId,
  onGenerate,
  isGenerating,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const [selectedTheme, setSelectedTheme] = useState<string>(THEME_OPTIONS[0].id);
  const [selectedLength, setSelectedLength] = useState<LengthOption['id']>('medium');

  const handleGenerate = useCallback(() => {
    moduleLogger.info('Generating episode', {
      profileId,
      theme: selectedTheme,
      length: selectedLength,
    });

    onGenerate({
      theme: selectedTheme,
      vocabulary: [],
      length: selectedLength,
    });
  }, [profileId, selectedTheme, selectedLength, onGenerate]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('starStory.chooseTheme')}
        </Text>
        <View style={styles.themeGrid}>
          {THEME_OPTIONS.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeOption,
                selectedTheme === theme.id && styles.themeOptionActive,
              ]}
              onPress={() => setSelectedTheme(theme.id)}
              accessibilityLabel={t(`starStory.theme.${theme.id}`)}
              accessibilityHint={t('starStory.selectThemeHint')}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedTheme === theme.id }}
            >
              <NativeIcon
                name={theme.icon}
                size="lg"
                color={selectedTheme === theme.id ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.themeLabel,
                  selectedTheme === theme.id && styles.themeLabelActive,
                ]}
              >
                {t(`starStory.theme.${theme.id}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('starStory.episodeLength')}
        </Text>
        <View style={styles.lengthOptions}>
          {LENGTH_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.lengthOption,
                selectedLength === option.id && styles.lengthOptionActive,
              ]}
              onPress={() => setSelectedLength(option.id)}
              accessibilityLabel={t(`starStory.length.${option.id}`)}
              accessibilityHint={t(option.durationKey)}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedLength === option.id }}
            >
              <Text
                style={[
                  styles.lengthLabel,
                  selectedLength === option.id && styles.lengthLabelActive,
                ]}
              >
                {t(`starStory.length.${option.id}`)}
              </Text>
              <Text style={styles.lengthDuration}>
                {t(option.durationKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      <GlassButton
        onPress={handleGenerate}
        disabled={isGenerating}
        style={styles.generateButton}
        accessibilityLabel={t('starStory.generateEpisode')}
        accessibilityHint={t('starStory.generateEpisodeHint')}
        accessibilityRole="button"
      >
        <View style={styles.generateContent}>
          <NativeIcon
            name={isGenerating ? 'loader' : 'sparkles'}
            size="md"
            color={colors.text}
          />
          <Text style={styles.generateText}>
            {isGenerating
              ? t('starStory.generating')
              : t('starStory.generateEpisode')}
          </Text>
        </View>
      </GlassButton>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  section: { padding: spacing.md, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  themeOption: { width: '30%', flexGrow: 1, alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 2, borderColor: 'transparent' },
  themeOptionActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  themeLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, fontWeight: '500', textAlign: 'center' },
  themeLabelActive: { color: colors.primary, fontWeight: '600' },
  lengthOptions: { flexDirection: 'row', gap: spacing.sm },
  lengthOption: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 2, borderColor: 'transparent' },
  lengthOptionActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  lengthLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  lengthLabelActive: { color: colors.primary },
  lengthDuration: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  generateButton: { marginTop: spacing.md, paddingVertical: spacing.md },
  generateContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  generateText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
});

export default EpisodeGenerator;
