/**
 * Avatar Preferences Component (Mobile)
 * Settings for Olorin wizard avatar display on mobile devices
 * Supports 4 modes: FULL, COMPACT, MINIMAL, ICON_ONLY
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  I18nManager,
} from 'react-native';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import { AvatarMode } from '@bayit/shared/types/voiceAvatar';
import {
  AVATAR_MODE_CONFIGS,
  getAvatarModeConfig,
  PLATFORM_AVATAR_MODES,
} from '@bayit/shared/constants/voiceAvatarModes';
import { colors, spacing, borderRadius, typography } from '@olorin/design-tokens';
import { useDirection } from '@bayit/shared/hooks/useDirection';

export const AvatarPreferences: React.FC = () => {
  const { avatarVisibilityMode, setAvatarVisibilityMode } = useSupportStore();
  const { isRTL, flexDirection, textAlign } = useDirection();

  // Available modes for mobile (iOS/Android)
  const mobileModes: AvatarMode[] = PLATFORM_AVATAR_MODES.ios;

  const handleModeSelect = (mode: AvatarMode) => {
    setAvatarVisibilityMode(mode);
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text
          style={styles.title}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          Avatar Display
        </Text>
        <Text
          style={styles.description}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          Choose how the Olorin wizard appears during voice interactions
        </Text>
      </View>

      {/* Mode Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeScroll}
      >
        {mobileModes.map((mode) => (
          <AvatarModeCard
            key={mode}
            mode={mode}
            isSelected={avatarVisibilityMode === mode}
            onSelect={handleModeSelect}
          />
        ))}
      </ScrollView>

      {/* Current Mode Info */}
      <View style={styles.currentModeInfo}>
        <View style={[styles.currentModeHeader, { flexDirection }]}>
          <Text
            style={[styles.currentModeLabel, { textAlign }]}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            Current Mode:
          </Text>
          <Text
            style={[styles.currentModeName, { textAlign }]}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            {getModeDisplayName(avatarVisibilityMode)}
          </Text>
        </View>
        <Text
          style={[styles.currentModeDescription, { textAlign }]}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          {getModeDescription(avatarVisibilityMode)}
        </Text>

        {/* Features List */}
        <View style={styles.featuresList}>
          {getFeatures(avatarVisibilityMode).map((feature, index) => (
            <View key={index} style={[styles.featureItem, { flexDirection }]}>
              <Text
                style={styles.featureIcon}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
              >
                {feature.icon}
              </Text>
              <Text
                style={[styles.featureText, { textAlign }]}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
              >
                {feature.text}
              </Text>
            </View>
          ))}
        </View>
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
}

const AvatarModeCard: React.FC<AvatarModeCardProps> = ({ mode, isSelected, onSelect }) => {
  const config = getAvatarModeConfig(mode, 'mobile');
  const isRTL = I18nManager.isRTL;

  return (
    <TouchableOpacity
      style={[styles.modeCard, isSelected && styles.modeCardSelected]}
      onPress={() => onSelect(mode)}
      activeOpacity={0.7}
      accessible
      accessibilityLabel={`${getModeDisplayName(mode)} avatar mode`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={`Select ${getModeDisplayName(mode)} avatar display mode. ${getModeDescription(mode)}`}
    >
      {/* Mode Icon */}
      <View
        style={[styles.modeIconContainer, { backgroundColor: getModeColor(mode) }]}
        accessible
        accessibilityLabel={`${getModeDisplayName(mode)} icon`}
      >
        <Text
          style={styles.modeIcon}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          {getModeIcon(mode)}
        </Text>
      </View>

      {/* Mode Name */}
      <Text
        style={styles.modeName}
        allowFontScaling={true}
        maxFontSizeMultiplier={1.3}
      >
        {getModeDisplayName(mode)}
      </Text>

      {/* Dimensions */}
      <Text
        style={styles.modeDimensions}
        allowFontScaling={true}
        maxFontSizeMultiplier={1.3}
      >
        {config.dimensions.mobile.width}×{config.dimensions.mobile.height}
      </Text>

      {/* Selection Indicator - RTL aware positioning */}
      {isSelected && (
        <View
          style={[
            styles.selectedBadge,
            isRTL ? { left: spacing.xs } : { right: spacing.xs }
          ]}
          accessible
          accessibilityLabel="Selected"
        >
          <Text
            style={styles.selectedBadgeText}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            ✓
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

function getModeDisplayName(mode: AvatarMode): string {
  switch (mode) {
    case 'full':
      return 'Full Screen';
    case 'compact':
      return 'Compact';
    case 'minimal':
      return 'Minimal';
    case 'icon_only':
      return 'Icon Only';
    default:
      return mode;
  }
}

function getModeDescription(mode: AvatarMode): string {
  switch (mode) {
    case 'full':
      return 'Complete wizard with animations, transcript, and full voice interaction';
    case 'compact':
      return 'Floating circular wizard panel with animations';
    case 'minimal':
      return 'Waveform bar with status indicator only';
    case 'icon_only':
      return 'Hidden - only microphone button visible';
    default:
      return '';
  }
}

function getFeatures(mode: AvatarMode): Array<{ icon: string; text: string }> {
  const config = AVATAR_MODE_CONFIGS[mode];
  const features = [];

  if (config.showWizard) {
    features.push({ icon: '🧙', text: 'Wizard character' });
  }
  if (config.showAnimations) {
    features.push({ icon: '✨', text: 'Animated gestures' });
  }
  if (config.showWaveform) {
    features.push({ icon: '〰️', text: 'Audio waveform' });
  }
  if (config.showTranscript) {
    features.push({ icon: '💬', text: 'Live transcript' });
  }

  return features;
}

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

function getModeIcon(mode: AvatarMode): string {
  switch (mode) {
    case 'full':
      return '🧙‍♂️';
    case 'compact':
      return '⭕';
    case 'minimal':
      return '〰️';
    case 'icon_only':
      return '🎩';
    default:
      return '❓';
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Mode Scroll
  modeScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  // Mode Card
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
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIcon: {
    fontSize: 28,
  },
  modeName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  modeDimensions: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.xs,
    // right/left set dynamically based on RTL
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Current Mode Info
  currentModeInfo: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: spacing.sm,
  },
  currentModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  currentModeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentModeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  currentModeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Features List
  featuresList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureIcon: {
    fontSize: 14,
  },
  featureText: {
    fontSize: 12,
    color: colors.text,
  },
});

export default AvatarPreferences;
