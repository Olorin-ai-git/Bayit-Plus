/**
 * SearchViewModeToggle Component
 *
 * Three-button toggle for switching between grid, list, and cards view modes
 * Syncs with localStorage and URL parameters via useSearchViewMode hook
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ViewMode } from '../../hooks/useSearchViewMode';

// Platform-specific touch target sizes
const TOUCH_TARGET_SIZE = Platform.select({
  ios: 44,
  android: 44,
  default: Platform.isTV ? 80 : 44,
});

interface SearchViewModeToggleProps {
  /** Current view mode */
  value: ViewMode;
  /** Callback when view mode changes */
  onChange: (mode: ViewMode) => void;
}

const VIEW_MODE_OPTIONS: { mode: ViewMode; icon: string; label: string }[] = [
  { mode: 'grid', icon: '⊞', label: 'Grid' },
  { mode: 'list', icon: '☰', label: 'List' },
  { mode: 'cards', icon: '▢', label: 'Cards' },
];

/**
 * Toggle component for switching search result view modes
 */
export function SearchViewModeToggle({ value, onChange }: SearchViewModeToggleProps) {
  const { t } = useTranslation('search');
  const [focusedMode, setFocusedMode] = React.useState<ViewMode | null>(null);

  return (
    <View style={styles.container}>
      {VIEW_MODE_OPTIONS.map(({ mode, icon, label }) => {
        const isSelected = value === mode;
        const isFocused = focusedMode === mode;

        return (
          <TouchableOpacity
            key={mode}
            style={[
              styles.button,
              isSelected && styles.buttonActive,
              isFocused && Platform.isTV && styles.buttonFocused,
            ]}
            onPress={() => onChange(mode)}
            onFocus={() => setFocusedMode(mode)}
            onBlur={() => setFocusedMode(null)}
            focusable={Platform.isTV}
            hasTVPreferredFocus={isSelected && Platform.isTV}
            accessibilityRole="button"
            accessibilityLabel={t(`viewMode.${mode}`)}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.icon, isSelected && styles.iconActive]}>{icon}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  button: {
    minWidth: TOUCH_TARGET_SIZE,
    minHeight: TOUCH_TARGET_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
    transition: 'background-color 0.2s',
  },
  buttonActive: {
    backgroundColor: 'rgba(168,85,247,0.3)',
  },
  buttonFocused: {
    borderWidth: 2,
    borderColor: 'rgba(168,85,247,1)',
    transform: [{ scale: 1.05 }],
  },
  icon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.6)',
    transition: 'color 0.2s',
  },
  iconActive: {
    color: '#fff',
  },
});
