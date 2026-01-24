/**
 * SearchSuggestionsPanel Component
 *
 * Displays when no query entered - shows trending searches, category chips,
 * recent searches, and personalized suggestions
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sanitizeText, sanitizeCategory } from '../../utils/sanitize';
import { colors, borderRadius, spacing } from '../../theme/colors';

export interface Category {
  name: string;
  emoji: string;
  filters?: Record<string, any>;
}

interface SearchSuggestionsPanelProps {
  /** Recent searches from localStorage */
  recentSearches?: string[];
  /** Trending searches from API */
  trendingSearches?: string[];
  /** Category suggestions from API */
  categories?: Category[];
  /** Callback when search selected */
  onSearchSelect: (query: string) => void;
  /** Callback to clear recent searches */
  onClearRecent?: () => void;
}

/**
 * Suggestions panel shown when search is empty
 */
export function SearchSuggestionsPanel({
  recentSearches = [],
  trendingSearches = [],
  categories = [],
  onSearchSelect,
  onClearRecent,
}: SearchSuggestionsPanelProps) {
  const { t } = useTranslation('search');

  // Sanitize all untrusted inputs to prevent XSS
  const sanitizedRecent = useMemo(() =>
    recentSearches.map(sanitizeText).filter(text => text.length > 0),
    [recentSearches]
  );

  const sanitizedTrending = useMemo(() =>
    trendingSearches.map(sanitizeText).filter(text => text.length > 0),
    [trendingSearches]
  );

  const sanitizedCategories = useMemo(() =>
    categories.map(sanitizeCategory),
    [categories]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Trending Searches */}
      {sanitizedTrending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('suggestions.trendingTitle')}</Text>
          <View style={styles.itemsContainer}>
            {sanitizedTrending.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={styles.trendingItem}
                onPress={() => onSearchSelect(search)}
                accessibilityLabel={`Search for ${search}`}
                accessibilityRole="button"
              >
                <Text style={styles.trendingText}>{search}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Category Chips */}
      {sanitizedCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('suggestions.categoriesTitle')}</Text>
          <View style={styles.categoriesGrid}>
            {sanitizedCategories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={styles.categoryChip}
                onPress={() => onSearchSelect(category.name)}
                accessibilityLabel={`Browse ${category.name}`}
                accessibilityRole="button"
              >
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Recent Searches */}
      {sanitizedRecent.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('suggestions.recentTitle')}</Text>
            {onClearRecent && (
              <TouchableOpacity
                onPress={onClearRecent}
                accessibilityLabel={t('suggestions.clearRecent')}
              >
                <Text style={styles.clearButton}>{t('suggestions.clearRecent')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.itemsContainer}>
            {sanitizedRecent.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentItem}
                onPress={() => onSearchSelect(search)}
                accessibilityLabel={`Search for ${search}`}
                accessibilityRole="button"
              >
                <Text style={styles.recentIcon}>🕐</Text>
                <Text style={styles.recentText}>{search}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  clearButton: {
    fontSize: 14,
    color: 'rgba(168,85,247,1)',
    fontWeight: '500',
  },
  itemsContainer: {
    gap: 8,
  },
  trendingItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trendingText: {
    fontSize: 15,
    color: '#fff',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    gap: 8,
    minWidth: 120,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  recentIcon: {
    fontSize: 18,
  },
  recentText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
  },
});
