/**
 * Avatar Mode Card (Mobile)
 * Individual mode selection card for the avatar preferences horizontal scroll
 * Shows mode icon, name, dimensions, and selection state
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AvatarMode } from '@bayit/shared/types/voiceAvatar';
import { getAvatarModeConfig } from '@bayit/shared/constants/voiceAvatarModes';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';

interface AvatarModeCardProps {
  mode: AvatarMode;
  isSelected: boolean;
  onSelect: (mode: AvatarMode) => void;
}

export function getModeColor(mode: AvatarMode): string {
  switch (mode) {
    case 'full': return colors.purple[600];
    case 'compact': return colors.blue[600];
    case 'minimal': return colors.green[600];
    case 'icon_only': return colors.gray[600];
    default: return colors.gray[500];
  }
}

export function getModeIconName(mode: AvatarMode): string {
  switch (mode) {
    case 'full': return 'profile';
    case 'compact': return 'live';
    case 'minimal': return 'podcasts';
    case 'icon_only': return 'gem';
    default: return 'search';
  }
}

export const MODE_NAME_KEYS: Record<AvatarMode, string> = {
  full: 'settings.voice.avatar.modes.full',
  compact: 'settings.voice.avatar.modes.compact',
  minimal: 'settings.voice.avatar.modes.minimal',
  icon_only: 'settings.voice.avatar.modes.iconOnly',
};

export const MODE_DESCRIPTION_KEYS: Record<AvatarMode, string> = {
  full: 'settings.voice.avatar.descriptions.full',
  compact: 'settings.voice.avatar.descriptions.compact',
  minimal: 'settings.voice.avatar.descriptions.minimal',
  icon_only: 'settings.voice.avatar.descriptions.iconOnly',
};

export function getModeDisplayName(mode: AvatarMode): string {
  return MODE_NAME_KEYS[mode] ?? mode;
}

export function getModeDescription(mode: AvatarMode): string {
  return MODE_DESCRIPTION_KEYS[mode] ?? '';
}

export const AvatarModeCard: React.FC<AvatarModeCardProps> = ({ mode, isSelected, onSelect }) => {
  const { t } = useTranslation();
  const config = getAvatarModeConfig(mode, 'mobile');
  const isRTL = I18nManager.isRTL;
  const modeName = t(getModeDisplayName(mode));
  const modeDesc = t(getModeDescription(mode));

  return (
    <TouchableOpacity
      style={[styles.modeCard, isSelected && styles.modeCardSelected]}
      onPress={() => onSelect(mode)}
      activeOpacity={0.7} accessible
      accessibilityLabel={`${modeName} avatar mode`} accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={`Select ${modeName} avatar display mode. ${modeDesc}`}
    >
      <View
        style={[styles.modeIconContainer, { backgroundColor: getModeColor(mode) }]}
        accessible accessibilityLabel={`${modeName} icon`}
      >
        <NativeIcon name={getModeIconName(mode)} size="xxl" color="#ffffff" />
      </View>
      <Text style={styles.modeName} allowFontScaling maxFontSizeMultiplier={1.3}>{modeName}</Text>
      <Text style={styles.modeDimensions} allowFontScaling maxFontSizeMultiplier={1.3}>
        {config.dimensions.mobile.width}x{config.dimensions.mobile.height}
      </Text>
      {isSelected && (
        <View
          style={[styles.selectedBadge, isRTL ? { left: spacing.xs } : { right: spacing.xs }]}
          accessible accessibilityLabel="Selected"
        >
          <NativeIcon name="check" size="sm" color={colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  modeCard: {
    width: 120,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
    position: 'relative',
  },
  modeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  modeIconContainer: {
    width: 56, height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  modeName: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' },
  modeDimensions: { fontSize: 11, color: colors.textSecondary },
  selectedBadge: {
    position: 'absolute', top: spacing.xs,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default AvatarModeCard;
