/**
 * SearchScreenMobile
 *
 * Mobile-optimized search screen
 * Features:
 * - Voice search support
 * - Search history
 * - Recent searches
 * - Search suggestions
 * - Responsive results grid
 * - Filter by content type (all, live, vod, radio, podcasts)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Platform,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { GlassView, GlassButton, GlassCategoryPill } from '@bayit/shared';
import { contentService } from '@bayit/shared-services';
import { getLocalizedName } from '@bayit/shared-utils';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { ContentCardMobile, ChannelCardMobile } from '../components';
import { spacing, colors, typography, touchTarget } from '../theme';

interface SearchResult {
  id: string;
  type: 'live' | 'vod' | 'radio' | 'podcast';
  title: string;
  title_en?: string;
  title_es?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  number?: string; // For live channels
  currentShow?: string; // For live channels
  author?: string; // For podcasts
}

interface SearchRoute {
  params?: {
    query?: string;
  };
}

const CONTENT_TYPE_FILTERS = [
  { id: 'all', label: 'search.all', icon: '🔍' },
  { id: 'live', label: 'search.liveTV', icon: '📺' },
  { id: 'vod', label: 'search.vod', icon: '🎬' },
  { id: 'radio', label: 'search.radio', icon: '📻' },
  { id: 'podcast', label: 'search.podcasts', icon: '🎙️' },
];

export const SearchScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<SearchRoute>();
  const { orientation } = useResponsive();

  const [query, setQuery] = useState(route.params?.query || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const currentLang = i18n.language;

  // Responsive column count
  const numColumns = getGridColumns({
    phone: 2,
    tablet: orientation === 'landscape' ? 5 : 3,
  });

  useEffect(() => {
    loadRecentSearches();
    if (route.params?.query) {
      handleSearch(route.params.query);
    }
  }, []);

  useEffect(() => {
    filterResults();
  }, [selectedFilter, results]);

  useEffect(() => {
    if (query.length >= 2) {
      loadSuggestions(query);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const loadRecentSearches = async () => {
    // TODO: Load from AsyncStorage
    setRecentSearches(['Channel 13', 'Comedy movies', 'News', 'Jewish content']);
  };

  const saveRecentSearch = async (searchQuery: string) => {
    // TODO: Save to AsyncStorage
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
    setRecentSearches(updated);
  };

  const loadSuggestions = async (searchQuery: string) => {
    try {
      const response = await contentService.getSearchSuggestions(searchQuery);
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    Keyboard.dismiss();
    setIsSearching(true);
    setShowResults(true);
    saveRecentSearch(searchQuery);

    try {
      const response = await contentService.search(searchQuery);
      const searchResults: SearchResult[] = [
        ...(response.live || []).map((item: any) => ({
          ...item,
          type: 'live' as const,
          thumbnailUrl: item.thumbnail || item.logo,
        })),
        ...(response.vod || []).map((item: any) => ({
          ...item,
          type: 'vod' as const,
          posterUrl: item.poster || item.thumbnail,
        })),
        ...(response.radio || []).map((item: any) => ({
          ...item,
          type: 'radio' as const,
          thumbnailUrl: item.logo || item.thumbnail,
        })),
        ...(response.podcasts || []).map((item: any) => ({
          ...item,
          type: 'podcast' as const,
          posterUrl: item.cover || item.thumbnail,
        })),
      ];

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const filterResults = () => {
    if (selectedFilter === 'all') {
      setFilteredResults(results);
    } else {
      setFilteredResults(results.filter(item => item.type === selectedFilter));
    }
  };

  const handleResultPress = (item: SearchResult) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedName(item, currentLang),
      type: item.type,
    });
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleRecentSearchPress = (recent: string) => {
    setQuery(recent);
    handleSearch(recent);
  };

  const handleClearSearch = () => {
    setQuery('');
    setShowResults(false);
    setResults([]);
    setFilteredResults([]);
    inputRef.current?.focus();
  };

  const handleVoiceSearch = () => {
    // TODO: Integrate with voice search
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    console.log('Voice search triggered');
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    if (item.type === 'live') {
      return (
        <ChannelCardMobile
          channel={{
            id: item.id,
            number: item.number || '',
            name: getLocalizedName(item, currentLang),
            thumbnailUrl: item.thumbnailUrl,
            currentShow: item.currentShow,
            isLive: true,
          }}
          onPress={() => handleResultPress(item)}
        />
      );
    }

    return (
      <ContentCardMobile
        content={{
          id: item.id,
          title: getLocalizedName(item, currentLang),
          posterUrl: item.posterUrl || item.thumbnailUrl,
        }}
        onPress={() => handleResultPress(item)}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <GlassView style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch(query)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={handleClearSearch} style={styles.clearButton}>
              <Text style={styles.clearIcon}>✕</Text>
            </Pressable>
          )}
          <Pressable onPress={handleVoiceSearch} style={styles.voiceButton}>
            <Text style={styles.voiceIcon}>🎤</Text>
          </Pressable>
        </View>
      </GlassView>

      {/* Content */}
      {!showResults ? (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
          {/* Suggestions (when typing) */}
          {suggestions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('search.suggestions')}</Text>
              {suggestions.map((suggestion, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSuggestionPress(suggestion)}
                  style={styles.suggestionItem}
                >
                  <GlassView style={styles.suggestionContent}>
                    <Text style={styles.suggestionIcon}>🔍</Text>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                    <Text style={styles.suggestionArrow}>↖</Text>
                  </GlassView>
                </Pressable>
              ))}
            </View>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && suggestions.length === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('search.recent')}</Text>
              {recentSearches.map((recent, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleRecentSearchPress(recent)}
                  style={styles.recentItem}
                >
                  <GlassView style={styles.recentContent}>
                    <Text style={styles.recentIcon}>🕐</Text>
                    <Text style={styles.recentText}>{recent}</Text>
                  </GlassView>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.resultsContainer}>
          {/* Content Type Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
            style={styles.filtersSection}
          >
            {CONTENT_TYPE_FILTERS.map((filter) => (
              <GlassCategoryPill
                key={filter.id}
                category={{
                  id: filter.id,
                  name: `${filter.icon} ${t(filter.label)}`,
                }}
                selected={selectedFilter === filter.id}
                onPress={() => setSelectedFilter(filter.id)}
              />
            ))}
          </ScrollView>

          {/* Results Grid */}
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('search.searching')}</Text>
            </View>
          ) : filteredResults.length > 0 ? (
            <FlatList
              key={`grid-${numColumns}`}
              data={filteredResults}
              renderItem={renderResult}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              numColumns={numColumns}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.gridContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>{t('search.noResults')}</Text>
              <Text style={styles.emptyHint}>
                {t('search.tryDifferentKeywords')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.minHeight,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearIcon: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  voiceButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  voiceIcon: {
    fontSize: 20,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  suggestionItem: {
    marginBottom: spacing.sm,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    minHeight: touchTarget.minHeight,
  },
  suggestionIcon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  suggestionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  suggestionArrow: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  recentItem: {
    marginBottom: spacing.sm,
  },
  recentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    minHeight: touchTarget.minHeight,
  },
  recentIcon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  recentText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
  },
  filtersSection: {
    maxHeight: 60,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  gridContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyHint: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
