/**
 * SearchSemanticToggle Component
 *
 * Toggle between keyword search and semantic (AI-powered) search
 * Semantic search provides timestamp-based results with scene understanding
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

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

        <TouchableOpacity
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
        </TouchableOpacity>

        <Text style={[styles.label, enabled && styles.labelActive]}>{t('semantic.semantic')}</Text>

        {/* Info Button */}
        {showInfo && (
          <TouchableOpacity
            style={[styles.infoButton, isInfoFocused && Platform.isTV && styles.infoButtonFocused]}
            onPress={() => setShowTooltip(!showTooltip)}
            onFocus={() => setIsInfoFocused(true)}
            onBlur={() => setIsInfoFocused(false)}
            focusable={Platform.isTV}
            accessibilityLabel={t('semantic.infoTitle')}
          >
            <Text style={styles.infoIcon}>ℹ️</Text>
          </TouchableOpacity>
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
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    transition: 'color 0.2s',
  },
  labelActive: {
    color: '#fff',
  },
  switchTrack: {
    minWidth: Math.max(48, TOUCH_TARGET_SIZE),
    minHeight: Math.max(26, TOUCH_TARGET_SIZE),
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    transform: [{ translateX: 0 }],
    transition: 'transform 0.2s, background-color 0.2s',
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
    backgroundColor: 'rgba(168,85,247,1)',
  },
  switchFocused: {
    borderWidth: 2,
    borderColor: 'rgba(168,85,247,1)',
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
    borderColor: 'rgba(168,85,247,1)',
    borderRadius: TOUCH_TARGET_SIZE / 2,
    transform: [{ scale: 1.05 }],
  },
  infoIcon: {
    fontSize: 16,
  },
  tooltip: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    gap: 4,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  tooltipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
});
