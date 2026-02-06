/**
 * TV Avatar Preferences Component (tvOS)
 * Settings for Olorin wizard avatar display on Apple TV
 * TV-optimized with large focus targets and 10-foot UI
 * Supports 3 modes for TV: FULL, COMPACT, ICON_ONLY (no MINIMAL - too small for 10-foot viewing)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import { AvatarMode } from '@bayit/shared/types/voiceAvatar';
import { PLATFORM_AVATAR_MODES } from '@bayit/shared/constants/voiceAvatarModes';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import {
  TVAvatarModeCard, getModeDisplayName, getModeDescription, getFeatures,
} from './TVAvatarModeCard';

export const TVAvatarPreferences: React.FC = () => {
  const { t } = useTranslation();
  const { avatarVisibilityMode, setAvatarVisibilityMode } = useSupportStore();
  const tvModes: AvatarMode[] = PLATFORM_AVATAR_MODES.tvos;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.voice.avatar.title')}</Text>
        <Text style={styles.description}>{t('settings.voice.avatar.description')}</Text>
      </View>

      <View style={styles.modeGrid}>
        {tvModes.map((mode) => (
          <TVAvatarModeCard
            key={mode} mode={mode}
            isSelected={avatarVisibilityMode === mode}
            onSelect={setAvatarVisibilityMode}
          />
        ))}
      </View>

      <View style={styles.currentModeInfo}>
        <View style={styles.currentModeHeader}>
          <Text style={styles.currentModeLabel}>{t('settings.voice.avatar.currentMode')}:</Text>
          <Text style={styles.currentModeName}>{t(getModeDisplayName(avatarVisibilityMode))}</Text>
        </View>
        <Text style={styles.currentModeDescription}>
          {t(getModeDescription(avatarVisibilityMode))}
        </Text>
        <View style={styles.featuresList}>
          {getFeatures(avatarVisibilityMode).map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureText}>{t(feature.textKey)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.xl * 1.4, gap: spacing.xl * 1.4 },
  header: { paddingHorizontal: spacing.xl * 1.4, gap: spacing.md },
  title: { fontSize: 28 * 1.4, fontWeight: '700', color: colors.text },
  description: { fontSize: 18 * 1.4, color: colors.textSecondary, lineHeight: 26 * 1.4 },
  modeGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.xl * 1.4, gap: spacing.xl * 1.4, justifyContent: 'center',
  },
  currentModeInfo: {
    marginHorizontal: spacing.xl * 1.4, backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg, padding: spacing.lg * 1.4,
    borderLeftWidth: 6, borderLeftColor: colors.primary, gap: spacing.md * 1.4,
  },
  currentModeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm * 1.4 },
  currentModeLabel: {
    fontSize: 14 * 1.4, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.4,
  },
  currentModeName: { fontSize: 18 * 1.4, fontWeight: '700', color: colors.primary },
  currentModeDescription: { fontSize: 16 * 1.4, color: colors.textSecondary, lineHeight: 22 * 1.4 },
  featuresList: { gap: spacing.sm * 1.4, marginTop: spacing.sm * 1.4 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md * 1.4 },
  featureIcon: { fontSize: 18 * 1.4 },
  featureText: { fontSize: 14 * 1.4, color: colors.text },
});

export default TVAvatarPreferences;
