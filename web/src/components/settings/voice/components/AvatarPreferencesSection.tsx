/**
 * Avatar Preferences Section
 * Settings for Olorin wizard avatar visibility and behavior
 * Supports 4 modes: FULL, COMPACT, MINIMAL, ICON_ONLY
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@olorin/shared-icons/web';
import { colors, spacing, borderRadius, typography } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import { AvatarMode } from '@bayit/shared/types/voiceAvatar';
import {
  AVATAR_MODE_CONFIGS,
  getAvatarModeConfig,
} from '@bayit/shared/constants/voiceAvatarModes';

interface AvatarPreferencesSectionProps {
  isRTL: boolean;
}

export const AvatarPreferencesSection: React.FC<AvatarPreferencesSectionProps> = ({ isRTL }) => {
  const { t } = useTranslation();
  const { avatarVisibilityMode, setAvatarVisibilityMode } = useSupportStore();

  const handleModeSelect = (mode: AvatarMode) => {
    setAvatarVisibilityMode(mode);
  };

  // Available modes for web platform
  const webModes: AvatarMode[] = ['full', 'compact', 'minimal', 'icon_only'];

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('voice.avatarPreferences.title', 'Avatar Display')}</Text>
        <Text style={styles.description}>
          {t(
            'voice.avatarPreferences.description',
            'Choose how the Olorin wizard appears during voice interactions'
          )}
        </Text>
      </View>

      {/* Mode Cards */}
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

      {/* Mode Description */}
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

// ============================================================================
// Avatar Mode Card
// ============================================================================

interface AvatarModeCardProps {
  mode: AvatarMode;
  isSelected: boolean;
  onSelect: (mode: AvatarMode) => void;
  isRTL: boolean;
}

const AvatarModeCard: React.FC<AvatarModeCardProps> = ({ mode, isSelected, onSelect, isRTL }) => {
  const { t } = useTranslation();
  const config = getAvatarModeConfig(mode, 'web');

  return (
    <TouchableOpacity
      style={[
        styles.modeCard,
        isSelected && styles.modeCardSelected,
        isRTL && styles.modeCardRTL,
      ]}
      onPress={() => onSelect(mode)}
      activeOpacity={0.7}
    >
      {/* Mode Icon/Preview */}
      <View style={styles.modePreview}>
        <View style={[styles.modeIconContainer, { backgroundColor: getModeColor(mode) }]}>
          {getModeIconComponent(mode)}
        </View>

        {/* Dimensions Label */}
        <Text style={styles.modeDimensions}>
          {config.dimensions.web.width}x{config.dimensions.web.height}
        </Text>
      </View>

      {/* Mode Info */}
      <View style={styles.modeInfo}>
        <Text style={styles.modeName}>{t(config.nameKey)}</Text>

        {/* Features */}
        <View style={styles.modeFeatures}>
          {config.showWizard && (
            <View style={styles.featureRow}>
              <Icon name="user" size="xs" color={colors.textSecondary} />
              <Text style={styles.modeFeature}>{t('voice.features.wizard', 'Wizard')}</Text>
            </View>
          )}
          {config.showAnimations && (
            <View style={styles.featureRow}>
              <Icon name="zap" size="xs" color={colors.textSecondary} />
              <Text style={styles.modeFeature}>{t('voice.features.animations', 'Animations')}</Text>
            </View>
          )}
          {config.showWaveform && (
            <View style={styles.featureRow}>
              <Icon name="activity" size="xs" color={colors.textSecondary} />
              <Text style={styles.modeFeature}>{t('voice.features.waveform', 'Waveform')}</Text>
            </View>
          )}
          {config.showTranscript && (
            <View style={styles.featureRow}>
              <Icon name="messageCircle" size="xs" color={colors.textSecondary} />
              <Text style={styles.modeFeature}>{t('voice.features.transcript', 'Transcript')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Selection Indicator */}
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Icon name="check" size="sm" color={colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

function getModeColor(mode: AvatarMode): string {
  switch (mode) {
    case 'full':
      return colors.purple[600];
    case 'compact':
      return colors.blue[600];
    case 'minimal':
      return colors.green[600];
    case 'icon_only':
      return colors.gray[600];
    default:
      return colors.gray[500];
  }
}

function getModeIconComponent(mode: AvatarMode): React.ReactNode {
  const iconColor = '#ffffff';
  switch (mode) {
    case 'full':
      return <Icon name="user" size="xl" color={iconColor} />;
    case 'compact':
      return <Icon name="circle" size="xl" color={iconColor} />;
    case 'minimal':
      return <Icon name="activity" size="xl" color={iconColor} />;
    case 'icon_only':
      return <Icon name="star" size="xl" color={iconColor} />;
    default:
      return <Icon name="helpCircle" size="xl" color={iconColor} />;
  }
}

// ============================================================================
// Styles
// ============================================================================

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

  // Mode Grid
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
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
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  modeCardRTL: {
    // RTL-specific adjustments if needed
  },

  // Mode Preview
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

  // Mode Info
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

  // Selection Badge
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Current Mode Description
  currentModeDescription: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
