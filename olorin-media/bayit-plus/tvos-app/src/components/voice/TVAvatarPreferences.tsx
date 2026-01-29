/**
 * TV Avatar Preferences Component (tvOS)
 * Settings for Olorin wizard avatar display on Apple TV
 * TV-optimized with large focus targets and 10-foot UI
 * Supports 3 modes for TV: FULL, COMPACT, ICON_ONLY (no MINIMAL - too small for 10-foot viewing)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import { AvatarMode } from '@bayit/shared/types/voiceAvatar';
import {
  AVATAR_MODE_CONFIGS,
  getAvatarModeConfig,
  PLATFORM_AVATAR_MODES,
} from '@bayit/shared/constants/voiceAvatarModes';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

export const TVAvatarPreferences: React.FC = () => {
  const { avatarVisibilityMode, setAvatarVisibilityMode } = useSupportStore();

  // Available modes for tvOS (no MINIMAL - too small for 10-foot viewing)
  const tvModes: AvatarMode[] = PLATFORM_AVATAR_MODES.tvos;

  const handleModeSelect = (mode: AvatarMode) => {
    setAvatarVisibilityMode(mode);
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Avatar Display</Text>
        <Text style={styles.description}>
          Choose how the Olorin wizard appears during voice interactions
        </Text>
      </View>

      {/* Mode Cards - Grid Layout for TV */}
      <View style={styles.modeGrid}>
        {tvModes.map((mode) => (
          <TVAvatarModeCard
            key={mode}
            mode={mode}
            isSelected={avatarVisibilityMode === mode}
            onSelect={handleModeSelect}
          />
        ))}
      </View>

      {/* Current Mode Info */}
      <View style={styles.currentModeInfo}>
        <View style={styles.currentModeHeader}>
          <Text style={styles.currentModeLabel}>Current Mode:</Text>
          <Text style={styles.currentModeName}>
            {getModeDisplayName(avatarVisibilityMode)}
          </Text>
        </View>
        <Text style={styles.currentModeDescription}>
          {getModeDescription(avatarVisibilityMode)}
        </Text>

        {/* Features List */}
        <View style={styles.featuresList}>
          {getFeatures(avatarVisibilityMode).map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// TV Avatar Mode Card (TV-Optimized)
// ============================================================================

interface TVAvatarModeCardProps {
  mode: AvatarMode;
  isSelected: boolean;
  onSelect: (mode: AvatarMode) => void;
}

const TVAvatarModeCard: React.FC<TVAvatarModeCardProps> = ({ mode, isSelected, onSelect }) => {
  const config = getAvatarModeConfig(mode, 'tvos');

  return (
    <TouchableOpacity
      style={[styles.modeCard, isSelected && styles.modeCardSelected]}
      onPress={() => onSelect(mode)}
      activeOpacity={0.7}
      // TV focus handling
      hasTVPreferredFocus={isSelected}
    >
      {/* Mode Icon */}
      <View style={[styles.modeIconContainer, { backgroundColor: getModeColor(mode) }]}>
        <Text style={styles.modeIcon}>{getModeIcon(mode)}</Text>
      </View>

      {/* Mode Name */}
      <Text style={styles.modeName}>{getModeDisplayName(mode)}</Text>

      {/* Dimensions */}
      <Text style={styles.modeDimensions}>
        {config.dimensions.tv.width}×{config.dimensions.tv.height}
      </Text>

      {/* Selection Indicator */}
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>✓</Text>
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
// Styles - TV-Optimized (10-foot UI)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xl * 1.4, // TV: 1.4x multiplier
    gap: spacing.xl * 1.4,
  },
  header: {
    paddingHorizontal: spacing.xl * 1.4,
    gap: spacing.md,
  },
  title: {
    fontSize: 28 * 1.4, // TV: Scaled 1.4x for readability
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 18 * 1.4,
    color: colors.textSecondary,
    lineHeight: 26 * 1.4,
  },

  // Mode Grid - TV Layout (2 columns)
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl * 1.4,
    gap: spacing.xl * 1.4,
    justifyContent: 'center',
  },

  // Mode Card - TV-Optimized (Large Focus Targets)
  modeCard: {
    width: 180, // Larger for TV (vs 120 mobile)
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    borderWidth: 4, // TV: Enhanced 4px border
    borderColor: colors.border,
    padding: spacing.lg * 1.4,
    gap: spacing.md * 1.4,
    alignItems: 'center',
    position: 'relative',
  },
  modeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
    // TV: Enhanced focus ring
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  modeIconContainer: {
    width: 80, // Larger for TV (vs 56 mobile)
    height: 80,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIcon: {
    fontSize: 40, // Larger for TV (vs 28 mobile)
  },
  modeName: {
    fontSize: 16 * 1.4,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  modeDimensions: {
    fontSize: 13 * 1.4,
    color: colors.textSecondary,
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm * 1.4,
    right: spacing.sm * 1.4,
    width: 28, // Larger for TV
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Current Mode Info - TV-Optimized
  currentModeInfo: {
    marginHorizontal: spacing.xl * 1.4,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg * 1.4,
    borderLeftWidth: 6, // TV: Enhanced 6px border
    borderLeftColor: colors.primary,
    gap: spacing.md * 1.4,
  },
  currentModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm * 1.4,
  },
  currentModeLabel: {
    fontSize: 14 * 1.4,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  currentModeName: {
    fontSize: 18 * 1.4,
    fontWeight: '700',
    color: colors.primary,
  },
  currentModeDescription: {
    fontSize: 16 * 1.4,
    color: colors.textSecondary,
    lineHeight: 22 * 1.4,
  },

  // Features List - TV-Optimized
  featuresList: {
    gap: spacing.sm * 1.4,
    marginTop: spacing.sm * 1.4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md * 1.4,
  },
  featureIcon: {
    fontSize: 18 * 1.4,
  },
  featureText: {
    fontSize: 14 * 1.4,
    color: colors.text,
  },
});

export default TVAvatarPreferences;
