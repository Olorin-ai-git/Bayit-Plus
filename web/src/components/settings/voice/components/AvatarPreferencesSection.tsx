/**
 * Avatar Preferences Section
 * Settings for Olorin wizard avatar visibility and behavior
 * Supports 4 modes: FULL, COMPACT, MINIMAL, ICON_ONLY
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import { AvatarMode } from '@bayit/shared/types/voiceAvatar';
import { getAvatarModeConfig } from '@bayit/shared/constants/voiceAvatarModes';
import { AvatarModeCard } from './AvatarModeCard';

interface AvatarPreferencesSectionProps {
  isRTL: boolean;
}

export const AvatarPreferencesSection: React.FC<AvatarPreferencesSectionProps> = ({ isRTL }) => {
  const { t } = useTranslation();
  const { avatarVisibilityMode, setAvatarVisibilityMode } = useSupportStore();

  const handleModeSelect = (mode: AvatarMode) => {
    setAvatarVisibilityMode(mode);
  };

  const webModes: AvatarMode[] = ['full', 'compact', 'minimal', 'icon_only'];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('voice.avatarPreferences.title', 'Avatar Display')}</Text>
        <Text style={styles.description}>
          {t('voice.avatarPreferences.description', 'Choose how the Olorin wizard appears during voice interactions')}
        </Text>
      </View>

      <View style={styles.modeGrid}>
        {webModes.map((mode) => (
          <AvatarModeCard
            key={mode}
            mode={mode}
            isSelected={avatarVisibilityMode === mode}
            onSelect={handleModeSelect}
            isRTL={isRTL}
          />
        ))}
      </View>

      <View style={styles.currentModeDescription}>
        <Text style={styles.currentModeLabel}>
          {t('voice.avatarPreferences.currentMode', 'Current Mode')}:
        </Text>
        <Text style={styles.currentModeName}>
          {t(getAvatarModeConfig(avatarVisibilityMode, 'web').nameKey)}
        </Text>
        <Text style={styles.currentModeDesc}>
          {t(getAvatarModeConfig(avatarVisibilityMode, 'web').descriptionKey)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.background.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  currentModeDescription: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.DEFAULT,
  },
  currentModeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentModeName: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: '600',
  },
  currentModeDesc: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default AvatarPreferencesSection;
