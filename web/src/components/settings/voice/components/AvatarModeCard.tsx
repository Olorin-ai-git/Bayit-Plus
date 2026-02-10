/**
 * Avatar Mode Card
 * Individual mode selection card for the avatar preferences grid
 * Shows mode preview icon, features list, and selection state
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@olorin/shared-icons/web';
import { colors, spacing, borderRadius, typography } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { AvatarMode } from '@bayit/shared/types/voiceAvatar';
import { getAvatarModeConfig } from '@bayit/shared/constants/voiceAvatarModes';

interface AvatarModeCardProps {
  mode: AvatarMode;
  isSelected: boolean;
  onSelect: (mode: AvatarMode) => void;
  isRTL: boolean;
}

function getModeColor(mode: AvatarMode): string {
  switch (mode) {
    case 'full': return colors.primary[600];
    case 'compact': return colors.info[600];
    case 'minimal': return colors.success[600];
    case 'icon_only': return colors.dark[600];
    default: return colors.dark[500];
  }
}

function getModeIconComponent(mode: AvatarMode): React.ReactNode {
  const iconColor = '#ffffff';
  switch (mode) {
    case 'full': return <Icon name="user" size="xl" color={iconColor} />;
    case 'compact': return <Icon name="circle" size="xl" color={iconColor} />;
    case 'minimal': return <Icon name="activity" size="xl" color={iconColor} />;
    case 'icon_only': return <Icon name="star" size="xl" color={iconColor} />;
    default: return <Icon name="helpCircle" size="xl" color={iconColor} />;
  }
}

export const AvatarModeCard: React.FC<AvatarModeCardProps> = ({ mode, isSelected, onSelect, isRTL }) => {
  const { t } = useTranslation();
  const modeConfig = getAvatarModeConfig(mode, 'web');

  return (
    <TouchableOpacity
      style={[styles.modeCard, isSelected && styles.modeCardSelected, isRTL && styles.modeCardRTL]}
      onPress={() => onSelect(mode)}
      activeOpacity={0.7}
    >
      <View style={styles.modePreview}>
        <View style={[styles.modeIconContainer, { backgroundColor: getModeColor(mode) }]}>
          {getModeIconComponent(mode)}
        </View>
        <Text style={styles.modeDimensions}>
          {modeConfig.dimensions.web.width}x{modeConfig.dimensions.web.height}
        </Text>
      </View>

      <View style={styles.modeInfo}>
        <Text style={styles.modeName}>{t(modeConfig.nameKey)}</Text>
        <View style={styles.modeFeatures}>
          {modeConfig.showWizard && (
            <View style={styles.featureRow}>
              <Icon name="user" size="xs" color={colors.textSecondary} />
              <Text style={styles.modeFeature}>{t('voice.features.wizard', 'Wizard')}</Text>
            </View>
          )}
          {modeConfig.showAnimations && (
            <View style={styles.featureRow}>
              <Icon name="zap" size="xs" color={colors.textSecondary} />
              <Text style={styles.modeFeature}>{t('voice.features.animations', 'Animations')}</Text>
            </View>
          )}
          {modeConfig.showWaveform && (
            <View style={styles.featureRow}>
              <Icon name="activity" size="xs" color={colors.textSecondary} />
              <Text style={styles.modeFeature}>{t('voice.features.waveform', 'Waveform')}</Text>
            </View>
          )}
          {modeConfig.showTranscript && (
            <View style={styles.featureRow}>
              <Icon name="messageCircle" size="xs" color={colors.textSecondary} />
              <Text style={styles.modeFeature}>{t('voice.features.transcript', 'Transcript')}</Text>
            </View>
          )}
        </View>
      </View>

      {isSelected && (
        <View style={styles.selectedBadge}>
          <Icon name="check" size="sm" color={colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  modeCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    position: 'relative',
  },
  modeCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: `${colors.primary}15`,
  },
  modeCardRTL: {},
  modePreview: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  modeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeDimensions: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  modeInfo: {
    gap: spacing.xs,
  },
  modeName: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: '600',
  },
  modeFeatures: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modeFeature: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AvatarModeCard;
