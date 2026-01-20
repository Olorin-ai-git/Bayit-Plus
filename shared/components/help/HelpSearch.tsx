/**
 * HelpSearch - Inline search component for help content
 * Can be embedded anywhere to provide quick access to docs and FAQ
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';
import { supportConfig } from '../../config/supportConfig';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  type: 'article' | 'faq';
  slug?: string;
  category?: string;
  score: number;
}

interface HelpSearchProps {
  /** Callback when a result is selected */
  onResultSelect: (result: SearchResult) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show recent searches */
  showRecent?: boolean;
  /** Whether to show popular searches */
  showPopular?: boolean;
  /** Minimum query length before searching */
  minQueryLength?: number;
  /** Maximum results to display */
  maxResults?: number;
  /** Custom styles */
  style?: object;
}

export const HelpSearch: React.FC<HelpSearchProps> = ({
  onResultSelect,
  placeholder,
  showRecent = true,
  showPopular = true,
  minQueryLength = 2,
  maxResults = 10,
  style,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<TextInput>(null);

  // Load popular searches on mount
  useEffect(() => {
    loadPopularSearches();
  }, []);

  const loadPopularSearches = async () => {
    try {
      const language = i18n.language || supportConfig.documentation.defaultLanguage;
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000/api/v1/support'
        : '/api/v1/support';

      const response = await fetch(`${apiUrl}/docs/search/popular?lang=${language}&limit=5`);
      const data = await response.json();

      if (data.popular_searches) {
        setPopularSearches(data.popular_searches.map((s: { query: string }) => s.query));
      }
    } catch (error) {
      console.error('[HelpSearch] Error loading popular searches:', error);
    }
  };

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const language = i18n.language || supportConfig.documentation.defaultLanguage;
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000/api/v1/support'
        : '/api/v1/support';

      const response = await fetch(
        `${apiUrl}/docs/search?q=${encodeURIComponent(searchQuery)}&lang=${language}&limit=${maxResults}`
      );
      const data = await response.json();

      const combinedResults: SearchResult[] = [];

      // Add article results
      if (data.articles) {
        for (const article of data.articles) {
          combinedResults.push({
            id: article.id || article.slug,
            title: article.title_key ? t(article.title_key) : article.title,
            excerpt: article.description_key ? t(article.description_key) : '',
            type: 'article',
            slug: article.slug,
            category: article.category,
            score: article.score || 0,
          });
        }
      }

      // Add FAQ results
      if (data.faq) {
        for (const faq of data.faq) {
          combinedResults.push({
            id: faq.id,
            title: faq.question,
            excerpt: faq.answer?.substring(0, 100) + '...',
            type: 'faq',
            category: faq.category,
            score: faq.score || 0,
          });
        }
      }

      // Sort by score
      combinedResults.sort((a, b) => b.score - a.score);

      setResults(combinedResults.slice(0, maxResults));
    } catch (error) {
      console.error('[HelpSearch] Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language, minQueryLength, maxResults, t]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);

    // Debounce search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      performSearch(text);
    }, 300);
  }, [performSearch]);

  const handleResultPress = useCallback((result: SearchResult) => {
    // Add to recent searches
    setRecentSearches((prev) => {
      const updated = [query, ...prev.filter((s) => s !== query)].slice(0, 5);
      return updated;
    });

    onResultSelect(result);
    setQuery('');
    setResults([]);
    Keyboard.dismiss();
  }, [query, onResultSelect]);

  const handleSuggestionPress = useCallback((suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
  }, [performSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  }, []);

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={[styles.resultItem, { flexDirection }]}
      onPress={() => handleResultPress(item)}
      accessibilityRole="button"
    >
      <Text style={styles.resultIcon}>
        {item.type === 'article' ? '📄' : '❓'}
      </Text>
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, { textAlign }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.excerpt && (
          <Text style={[styles.resultExcerpt, { textAlign }]} numberOfLines={2}>
            {item.excerpt}
          </Text>
        )}
        {item.category && (
          <Text style={[styles.resultCategory, { textAlign }]}>
            {t(`help.categories.${item.category}`, item.category)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const showSuggestions = focused && query.length < minQueryLength && (
    (showRecent && recentSearches.length > 0) ||
    (showPopular && popularSearches.length > 0)
  );

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      <View style={[styles.inputContainer, focused && styles.inputContainerFocused]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={[styles.input, isRTL && styles.inputRTL]}
          value={query}
          onChangeText={handleQueryChange}
          placeholder={placeholder || t('help.search.placeholder', 'Search help...')}
          placeholderTextColor={colors.textSecondary}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderResult}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Suggestions */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {showRecent && recentSearches.length > 0 && (
            <View style={styles.suggestionSection}>
              <Text style={[styles.suggestionHeader, { textAlign }]}>
                {t('help.search.recent', 'Recent')}
              </Text>
              <View style={styles.suggestionList}>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestionPress(search)}
                  >
                    <Text style={styles.suggestionChipText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {showPopular && popularSearches.length > 0 && (
            <View style={styles.suggestionSection}>
              <Text style={[styles.suggestionHeader, { textAlign }]}>
                {t('help.search.popular', 'Popular')}
              </Text>
              <View style={styles.suggestionList}>
                {popularSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestionPress(search)}
                  >
                    <Text style={styles.suggestionChipText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* No Results */}
      {query.length >= minQueryLength && !loading && results.length === 0 && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsIcon}>🔍</Text>
          <Text style={[styles.noResultsText, { textAlign }]}>
            {t('help.search.noResults', 'No results found for "{query}"', { query })}
          </Text>
          <Text style={[styles.noResultsHint, { textAlign }]}>
            {t('help.search.noResultsHint', 'Try different keywords or browse categories')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.sm,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchIcon: {
    fontSize: isTV ? 20 : 16,
  },
  input: {
    flex: 1,
    fontSize: isTV ? 18 : 16,
    color: colors.text,
    padding: 0,
  },
  inputRTL: {
    textAlign: 'right',
  },
  clearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resultsContainer: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(30, 30, 40, 0.98)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: 300,
    overflow: 'hidden',
  },
  resultItem: {
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  resultIcon: {
    fontSize: isTV ? 20 : 18,
    marginTop: 2,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  resultExcerpt: {
    fontSize: isTV ? 13 : 12,
    color: colors.textSecondary,
    lineHeight: isTV ? 18 : 16,
  },
  resultCategory: {
    fontSize: isTV ? 11 : 10,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  suggestionsContainer: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(30, 30, 40, 0.98)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionSection: {
    marginBottom: spacing.md,
  },
  suggestionHeader: {
    fontSize: isTV ? 12 : 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  suggestionChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  suggestionChipText: {
    fontSize: isTV ? 13 : 12,
    color: colors.text,
  },
  noResults: {
    marginTop: spacing.sm,
    padding: spacing.xl,
    backgroundColor: 'rgba(30, 30, 40, 0.98)',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noResultsIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
    opacity: 0.5,
  },
  noResultsText: {
    fontSize: isTV ? 16 : 14,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  noResultsHint: {
    fontSize: isTV ? 13 : 12,
    color: colors.textSecondary,
  },
});

export default HelpSearch;
