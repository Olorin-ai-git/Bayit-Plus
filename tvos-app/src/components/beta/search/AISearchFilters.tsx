/**
 * AISearchFilters - Horizontal filter pills for content type selection
 *
 * Provides focusable filter buttons for narrowing AI search results
 * by content type. Designed for Siri Remote horizontal navigation.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';

interface AISearchFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

interface FilterOption {
  key: string;
  labelKey: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'all', labelKey: 'tvos.aiSearch.filters.all' },
  { key: 'movie', labelKey: 'tvos.aiSearch.filters.movies' },
  { key: 'series', labelKey: 'tvos.aiSearch.filters.series' },
  { key: 'live_tv', labelKey: 'tvos.aiSearch.filters.liveTV' },
  { key: 'radio', labelKey: 'tvos.aiSearch.filters.radio' },
  { key: 'podcast', labelKey: 'tvos.aiSearch.filters.podcasts' },
];

export const AISearchFilters: React.FC<AISearchFiltersProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const { t } = useTranslation();
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTER_OPTIONS.map((option) => {
          const isActive = activeFilter === option.key;
          const isFocused = focusedKey === option.key;

          return (
            <Pressable
              key={option.key}
              onPress={() => onFilterChange(option.key)}
              onFocus={() => setFocusedKey(option.key)}
              onBlur={() => setFocusedKey(null)}
              style={[
                styles.pill,
                isActive && styles.pillActive,
                isFocused && styles.pillFocused,
              ]}
              accessible
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={t(option.labelKey)}
            >
              <Text
                style={[
                  styles.pillText,
                  isActive && styles.pillTextActive,
                  isFocused && styles.pillTextFocused,
                ]}
              >
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[8],
  },
  scrollContent: {
    gap: spacing[3],
    paddingRight: spacing[8],
  },
  pill: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pillActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderColor: '#A855F7',
  },
  pillFocused: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    transform: [{ scale: 1.06 }],
  },
  pillText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 24,
    fontWeight: '500',
  },
  pillTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  pillTextFocused: {
    color: colors.white,
  },
});
