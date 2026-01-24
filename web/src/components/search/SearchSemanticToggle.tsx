/**
 * SearchSemanticToggle Component
 *
 * Toggle between keyword search and semantic (AI-powered) search
 * Semantic search provides timestamp-based results with scene understanding
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/glass';
import { colors, borderRadius } from '../../theme/colors';

// Platform-specific touch target sizes
const TOUCH_TARGET_SIZE = Platform.select({
  ios: 44,
  android: 44,
  default: Platform.isTV ? 80 : 44,
});

interface SearchSemanticToggleProps {
  /** Current semantic mode state */
  enabled: boolean;
  /** Callback when toggle changes */
  onToggle: (enabled: boolean) => void;
  /** Show info tooltip */
  showInfo?: boolean;
}

/**
 * Toggle for switching between keyword and semantic search modes
 */
export function SearchSemanticToggle({
  enabled,
  onToggle,
  showInfo = true,
}: SearchSemanticToggleProps) {
  const { t } = useTranslation('search');
  const [showTooltip, setShowTooltip] = useState(false);
  const [isSwitchFocused, setIsSwitchFocused] = useState(false);
  const [isInfoFocused, setIsInfoFocused] = useState(false);

  return (
    <View style={styles.container}>
      {/* Toggle Switch */}
      <View style={styles.toggleContainer}>
        <Text style={[styles.label, !enabled && styles.labelActive]}>{t('semantic.keyword')}</Text>

        <GlassButton
          variant="ghost"
          style={[styles.switchTrack, isSwitchFocused && Platform.isTV && styles.switchFocused]}
          onPress={() => onToggle(!enabled)}
          onFocus={() => setIsSwitchFocused(true)}
          onBlur={() => setIsSwitchFocused(false)}
          focusable={Platform.isTV}
          hasTVPreferredFocus={Platform.isTV}
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
          accessibilityLabel={t('semantic.keyword') + ' / ' + t('semantic.semantic')}
        >
          <View style={[styles.switchThumb, enabled && styles.switchThumbActive]} />
        </GlassButton>

        <Text style={[styles.label, enabled && styles.labelActive]}>{t('semantic.semantic')}</Text>

        {/* Info Button */}
        {showInfo && (
          <GlassButton
            variant="ghost"
            style={[styles.infoButton, isInfoFocused && Platform.isTV && styles.infoButtonFocused]}
            onPress={() => setShowTooltip(!showTooltip)}
            onFocus={() => setIsInfoFocused(true)}
            onBlur={() => setIsInfoFocused(false)}
            focusable={Platform.isTV}
            accessibilityLabel={t('semantic.infoTitle')}
          >
            <Text style={styles.infoIcon}>ℹ️</Text>
          </GlassButton>
        )}
      </View>

      {/* Info Tooltip */}
      {showTooltip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>{t('semantic.infoTitle')}</Text>
          <Text style={styles.tooltipText}>
            {t('semantic.info')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.cardBackground,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.text,
  },
  switchTrack: {
    minWidth: Math.max(48, TOUCH_TARGET_SIZE),
    minHeight: Math.max(26, TOUCH_TARGET_SIZE),
    borderRadius: 13,
    backgroundColor: colors.disabled,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.text,
    transform: [{ translateX: 0 }],
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
    backgroundColor: colors.primary,
  },
  switchFocused: {
    borderWidth: 2,
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  infoButton: {
    minWidth: TOUCH_TARGET_SIZE,
    minHeight: TOUCH_TARGET_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButtonFocused: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: TOUCH_TARGET_SIZE / 2,
    transform: [{ scale: 1.05 }],
  },
  infoIcon: {
    fontSize: 16,
  },
  tooltip: {
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glassBorderLight,
    borderWidth: 1,
    borderColor: colors.pillBorder,
    gap: 4,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tooltipText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
