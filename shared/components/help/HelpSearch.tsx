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
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
        ? 'http://localhost:8001/api/v1/support'
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
        ? 'http://localhost:8001/api/v1/support'
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
      className="items-start p-3 gap-2 border-b border-white/5"
      style={{ flexDirection }}
      onPress={() => handleResultPress(item)}
      accessibilityRole="button"
    >
      <Text className={`mt-0.5 ${isTV ? 'text-xl' : 'text-lg'}`}>
        {item.type === 'article' ? '📄' : '❓'}
      </Text>
      <View className="flex-1">
        <Text className={`text-white font-semibold mb-0.5 ${isTV ? 'text-base' : 'text-sm'}`} style={{ textAlign }} numberOfLines={1}>
          {item.title}
        </Text>
        {item.excerpt && (
          <Text className={`text-white/70 ${isTV ? 'text-[13px] leading-[18px]' : 'text-xs leading-4'}`} style={{ textAlign }} numberOfLines={2}>
            {item.excerpt}
          </Text>
        )}
        {item.category && (
          <Text className={`text-purple-500 mt-1 ${isTV ? 'text-[11px]' : 'text-[10px]'}`} style={{ textAlign }}>
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
    <View className="w-full" style={style}>
      {/* Search Input */}
      <View className={`flex-row items-center bg-white/10 rounded-lg px-3 py-2 border-2 gap-2 ${
        focused ? 'border-purple-500 bg-white/15' : 'border-transparent'
      }`}>
        <Text className={isTV ? 'text-xl' : 'text-base'}>🔍</Text>
        <TextInput
          ref={inputRef}
          className={`flex-1 text-white p-0 ${isTV ? 'text-lg' : 'text-base'} ${isRTL ? 'text-right' : 'text-left'}`}
          value={query}
          onChangeText={handleQueryChange}
          placeholder={placeholder || t('help.search.placeholder', 'Search help...')}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading && (
          <ActivityIndicator size="small" color="#a855f7" />
        )}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={handleClear} className="w-6 h-6 items-center justify-center">
            <Text className="text-white/70 text-sm">✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {results.length > 0 && (
        <View className="mt-2 bg-[rgba(30,30,40,0.98)] rounded-lg border border-white/10 max-h-[300px] overflow-hidden">
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
        <View className="mt-2 bg-[rgba(30,30,40,0.98)] rounded-lg p-3 border border-white/10">
          {showRecent && recentSearches.length > 0 && (
            <View className="mb-3">
              <Text className={`text-white/70 font-semibold mb-2 uppercase tracking-wide ${isTV ? 'text-xs' : 'text-[11px]'}`} style={{ textAlign }}>
                {t('help.search.recent', 'Recent')}
              </Text>
              <View className="flex-row flex-wrap gap-1">
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    className="bg-white/10 px-3 py-1 rounded-full"
                    onPress={() => handleSuggestionPress(search)}
                  >
                    <Text className={`text-white ${isTV ? 'text-[13px]' : 'text-xs'}`}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {showPopular && popularSearches.length > 0 && (
            <View className="mb-3">
              <Text className={`text-white/70 font-semibold mb-2 uppercase tracking-wide ${isTV ? 'text-xs' : 'text-[11px]'}`} style={{ textAlign }}>
                {t('help.search.popular', 'Popular')}
              </Text>
              <View className="flex-row flex-wrap gap-1">
                {popularSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    className="bg-white/10 px-3 py-1 rounded-full"
                    onPress={() => handleSuggestionPress(search)}
                  >
                    <Text className={`text-white ${isTV ? 'text-[13px]' : 'text-xs'}`}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* No Results */}
      {query.length >= minQueryLength && !loading && results.length === 0 && (
        <View className="mt-2 p-6 bg-[rgba(30,30,40,0.98)] rounded-lg items-center border border-white/10">
          <Text className="text-[32px] mb-2 opacity-50">🔍</Text>
          <Text className={`text-white mb-1 ${isTV ? 'text-base' : 'text-sm'}`} style={{ textAlign }}>
            {t('help.search.noResults', 'No results found for "{query}"', { query })}
          </Text>
          <Text className={`text-white/70 ${isTV ? 'text-[13px]' : 'text-xs'}`} style={{ textAlign }}>
            {t('help.search.noResultsHint', 'Try different keywords or browse categories')}
          </Text>
        </View>
      )}
    </View>
  );
};

export default HelpSearch;
