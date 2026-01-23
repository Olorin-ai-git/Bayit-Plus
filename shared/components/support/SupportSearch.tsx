/**
 * Support Search
 * Search component for documentation and FAQ
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';
import { supportConfig } from '../../config/supportConfig';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  type: 'doc' | 'faq';
  path?: string;
}

export const SupportSearch: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const { docSearchQuery, setDocSearchQuery, setCurrentDocPath, setActiveTab } = useSupportStore();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    setDocSearchQuery(query);

    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);

      const language = i18n.language || supportConfig.documentation.defaultLanguage;
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8001/api/v1/support'
        : '/api/v1/support';

      // Search both docs and FAQ
      const [docsResponse, faqResponse] = await Promise.all([
        fetch(`${apiUrl}/docs?language=${language}`),
        fetch(`${apiUrl}/faq?language=${language}`),
      ]);

      const docsData = await docsResponse.json();
      const faqData = await faqResponse.json();

      const queryLower = query.toLowerCase();
      const searchResults: SearchResult[] = [];

      // Search in docs
      if (docsData.articles) {
        for (const article of docsData.articles) {
          if (
            article.title?.toLowerCase().includes(queryLower) ||
            article.excerpt?.toLowerCase().includes(queryLower)
          ) {
            searchResults.push({
              id: article.id,
              title: article.title,
              excerpt: article.excerpt || '',
              type: 'doc',
              path: article.slug,
            });
          }
        }
      }

      // Search in FAQ
      if (faqData.items) {
        for (const item of faqData.items) {
          if (
            item.question?.toLowerCase().includes(queryLower) ||
            item.answer?.toLowerCase().includes(queryLower)
          ) {
            searchResults.push({
              id: item.id,
              title: item.question,
              excerpt: item.answer.substring(0, 100) + '...',
              type: 'faq',
            });
          }
        }
      }

      setResults(searchResults.slice(0, 10));
    } catch (err) {
      console.error('[SupportSearch] Error searching:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language, setDocSearchQuery]);

  const handleResultPress = (result: SearchResult) => {
    if (result.type === 'doc' && result.path) {
      setCurrentDocPath(result.path);
    } else if (result.type === 'faq') {
      setActiveTab('faq');
    }
    setResults([]);
    setDocSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <GlassView
        style={[
          styles.searchContainer,
          isFocused && styles.searchContainerFocused,
        ]}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[
            styles.searchInput,
            isRTL && styles.searchInputRTL,
          ]}
          value={docSearchQuery}
          onChangeText={handleSearch}
          placeholder={t('support.search.placeholder', 'Search documentation...')}
          placeholderTextColor={colors.textSecondary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {loading && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </GlassView>

      {/* Search Results */}
      {results.length > 0 && (
        <GlassView style={styles.resultsContainer}>
          {results.map((result) => (
            <TouchableOpacity
              key={result.id}
              style={styles.resultItem}
              onPress={() => handleResultPress(result)}
            >
              <View style={styles.resultHeader}>
                <Text style={styles.resultTypeIcon}>
                  {result.type === 'doc' ? '📄' : '❓'}
                </Text>
                <Text style={[styles.resultTitle, { textAlign }]} numberOfLines={1}>
                  {result.title}
                </Text>
              </View>
              <Text style={[styles.resultExcerpt, { textAlign }]} numberOfLines={2}>
                {result.excerpt}
              </Text>
            </TouchableOpacity>
          ))}
        </GlassView>
      )}

      {/* No Results */}
      {docSearchQuery.length >= 2 && !loading && results.length === 0 && (
        <View style={styles.noResults}>
          <Text style={[styles.noResultsText, { textAlign }]}>
            {t('support.search.noResults', 'No results found')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    borderColor: colors.primary,
  },
  searchIcon: {
    fontSize: isTV ? 20 : 16,
  },
  searchInput: {
    flex: 1,
    fontSize: isTV ? 18 : 16,
    color: colors.text,
    padding: 0,
  },
  searchInputRTL: {
    textAlign: 'right',
  },
  resultsContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  resultItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  resultTypeIcon: {
    fontSize: isTV ? 16 : 14,
  },
  resultTitle: {
    flex: 1,
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  resultExcerpt: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    lineHeight: isTV ? 20 : 18,
  },
  noResults: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
});

export default SupportSearch;
