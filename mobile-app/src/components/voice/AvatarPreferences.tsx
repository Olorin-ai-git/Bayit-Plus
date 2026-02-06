/**
 * Avatar Preferences Component (Mobile)
 * Settings for Olorin wizard avatar display on mobile devices
 * Supports 4 modes: FULL, COMPACT, MINIMAL, ICON_ONLY
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import { AvatarMode } from '@bayit/shared/types/voiceAvatar';
import { AVATAR_MODE_CONFIGS, PLATFORM_AVATAR_MODES } from '@bayit/shared/constants/voiceAvatarModes';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '@bayit/shared/hooks/useDirection';
import { NativeIcon } from '@olorin/shared-icons/native';
import { AvatarModeCard, getModeDisplayName, getModeDescription } from './AvatarModeCard';

function getFeatures(mode: AvatarMode): Array<{ iconName: string; textKey: string }> {
  const config = AVATAR_MODE_CONFIGS[mode];
  const features: Array<{ iconName: string; textKey: string }> = [];
  if (config.showWizard) features.push({ iconName: 'profile', textKey: 'settings.voice.avatar.features.wizard' });
  if (config.showAnimations) features.push({ iconName: 'sparkle', textKey: 'settings.voice.avatar.features.animations' });
  if (config.showWaveform) features.push({ iconName: 'podcasts', textKey: 'settings.voice.avatar.features.waveform' });
  if (config.showTranscript) features.push({ iconName: 'vod', textKey: 'settings.voice.avatar.features.transcript' });
  return features;
}

export const AvatarPreferences: React.FC = () => {
  const { t } = useTranslation();
  const { avatarVisibilityMode, setAvatarVisibilityMode } = useSupportStore();
  const { isRTL, flexDirection, textAlign } = useDirection();
  const mobileModes: AvatarMode[] = PLATFORM_AVATAR_MODES.ios;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling maxFontSizeMultiplier={1.3}>
          {t('settings.voice.avatar.title')}
        </Text>
        <Text style={styles.description} allowFontScaling maxFontSizeMultiplier={1.3}>
          {t('settings.voice.avatar.description')}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeScroll}>
        {mobileModes.map((mode) => (
          <AvatarModeCard
            key={mode} mode={mode}
            isSelected={avatarVisibilityMode === mode}
            onSelect={setAvatarVisibilityMode}
          />
        ))}
      </ScrollView>

      <View style={styles.currentModeInfo}>
        <View style={[styles.currentModeHeader, { flexDirection }]}>
          <Text style={[styles.currentModeLabel, { textAlign }]} allowFontScaling maxFontSizeMultiplier={1.3}>
            {t('settings.voice.avatar.currentMode')}:
          </Text>
          <Text style={[styles.currentModeName, { textAlign }]} allowFontScaling maxFontSizeMultiplier={1.3}>
            {t(getModeDisplayName(avatarVisibilityMode))}
          </Text>
        </View>
        <Text style={[styles.currentModeDescription, { textAlign }]} allowFontScaling maxFontSizeMultiplier={1.3}>
          {t(getModeDescription(avatarVisibilityMode))}
        </Text>
        <View style={styles.featuresList}>
          {getFeatures(avatarVisibilityMode).map((feature, index) => (
            <View key={index} style={[styles.featureItem, { flexDirection }]}>
              <View style={styles.featureIconContainer}>
                <NativeIcon name={feature.iconName} size="sm" color={colors.text} />
              </View>
              <Text style={[styles.featureText, { textAlign }]} allowFontScaling maxFontSizeMultiplier={1.3}>
                {t(feature.textKey)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.lg, gap: spacing.lg },
  header: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  modeScroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  currentModeInfo: {
    marginHorizontal: spacing.lg, backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md, padding: spacing.md,
    borderLeftWidth: 4, borderLeftColor: colors.primary, gap: spacing.sm,
  },
  currentModeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  currentModeLabel: { fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  currentModeName: { fontSize: 14, fontWeight: '700', color: colors.primary },
  currentModeDescription: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  featuresList: { gap: spacing.xs, marginTop: spacing.xs },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureIconContainer: { width: 20, alignItems: 'center' },
  featureText: { fontSize: 12, color: colors.text },
});

export default AvatarPreferences;
