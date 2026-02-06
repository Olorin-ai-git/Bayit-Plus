/**
 * TV Avatar Mode Card (tvOS)
 * Individual mode selection card with TV-optimized focus targets
 * Large focus areas for 10-foot viewing distance
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AvatarMode } from '@bayit/shared/types/voiceAvatar';
import { getAvatarModeConfig, AVATAR_MODE_CONFIGS } from '@bayit/shared/constants/voiceAvatarModes';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface TVAvatarModeCardProps {
  mode: AvatarMode;
  isSelected: boolean;
  onSelect: (mode: AvatarMode) => void;
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

export function getFeatures(mode: AvatarMode): Array<{ icon: string; textKey: string }> {
  const config = AVATAR_MODE_CONFIGS[mode];
  const features: Array<{ icon: string; textKey: string }> = [];
  if (config.showWizard) features.push({ icon: 'W', textKey: 'settings.voice.avatar.features.wizard' });
  if (config.showAnimations) features.push({ icon: 'A', textKey: 'settings.voice.avatar.features.animations' });
  if (config.showWaveform) features.push({ icon: '~', textKey: 'settings.voice.avatar.features.waveform' });
  if (config.showTranscript) features.push({ icon: 'T', textKey: 'settings.voice.avatar.features.transcript' });
  return features;
}

function getModeColor(mode: AvatarMode): string {
  switch (mode) {
    case 'full': return colors.purple[600];
    case 'compact': return colors.blue[600];
    case 'minimal': return colors.green[600];
    case 'icon_only': return colors.gray[600];
    default: return colors.gray[500];
  }
}

function getModeIcon(mode: AvatarMode): string {
  switch (mode) {
    case 'full': return 'F';
    case 'compact': return 'C';
    case 'minimal': return 'M';
    case 'icon_only': return 'I';
    default: return '?';
  }
}

export const TVAvatarModeCard: React.FC<TVAvatarModeCardProps> = ({ mode, isSelected, onSelect }) => {
  const { t } = useTranslation();
  const config = getAvatarModeConfig(mode, 'tv');

  return (
    <TouchableOpacity
      style={[styles.modeCard, isSelected && styles.modeCardSelected]}
      onPress={() => onSelect(mode)} activeOpacity={0.7}
      hasTVPreferredFocus={isSelected}
    >
      <View style={[styles.modeIconContainer, { backgroundColor: getModeColor(mode) }]}>
        <Text style={styles.modeIcon}>{getModeIcon(mode)}</Text>
      </View>
      <Text style={styles.modeName}>{t(getModeDisplayName(mode))}</Text>
      <Text style={styles.modeDimensions}>{config.dimensions.tv.width}x{config.dimensions.tv.height}</Text>
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>OK</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  modeCard: {
    width: 180, backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg, borderWidth: 4, borderColor: colors.border,
    padding: spacing.lg * 1.4, gap: spacing.md * 1.4,
    alignItems: 'center', position: 'relative',
  },
  modeCardSelected: {
    borderColor: colors.primary, backgroundColor: `${colors.primary}20`,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 12,
  },
  modeIconContainer: {
    width: 80, height: 80, borderRadius: borderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  modeIcon: { fontSize: 40 },
  modeName: { fontSize: 16 * 1.4, fontWeight: '600', color: colors.text, textAlign: 'center' },
  modeDimensions: { fontSize: 13 * 1.4, color: colors.textSecondary },
  selectedBadge: {
    position: 'absolute', top: spacing.sm * 1.4, right: spacing.sm * 1.4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  selectedBadgeText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
});

export default TVAvatarModeCard;
