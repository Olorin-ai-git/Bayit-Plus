import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Search, Film, Tv, Radio, Podcast, Grid, Clock, X } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { VoiceSearchButton } from '@bayit/shared';
import { contentService, chatService } from '@/services/api';
import logger from '@/utils/logger';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

interface SearchResult {
  id: string;
  title: string;
  thumbnail?: string;
  type?: string;
  duration?: string;
  year?: string;
  category?: string;
  description?: string;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

const FILTERS = [
  { id: 'all', icon: Grid, labelKey: 'search.filters.all' },
  { id: 'vod', icon: Film, labelKey: 'search.filters.vod' },
  { id: 'live', icon: Tv, labelKey: 'search.filters.live' },
  { id: 'radio', icon: Radio, labelKey: 'search.filters.radio' },
  { id: 'podcast', icon: Podcast, labelKey: 'search.filters.podcast' },
];

export default function SearchPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(searchParams.get('type') || 'all');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (e) {}
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const newSearch: RecentSearch = { query: searchQuery, timestamp: Date.now() };
    const updated = [newSearch, ...recentSearches.filter(s => s.query !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (e) {}
  }, [recentSearches]);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await contentService.search(searchQuery, {
        type: activeFilter !== 'all' ? activeFilter : undefined,
      });
      setResults(data.results || []);
      saveRecentSearch(searchQuery);
    } catch (error) {
      logger.error('Search failed', 'SearchPage', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, saveRecentSearch]);

  // React to URL changes
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  // Handle search submit
  const handleSubmit = () => {
    if (query.trim()) {
      searchParams.set('q', query);
      setSearchParams(searchParams);
    }
  };

  // Handle filter change
  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId);
    if (filterId === 'all') {
      searchParams.delete('type');
    } else {
      searchParams.set('type', filterId);
    }
    setSearchParams(searchParams);
    if (query.trim()) performSearch(query);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    searchParams.delete('q');
    setSearchParams(searchParams);
    inputRef.current?.focus();
  };

  // Handle voice result
  const handleVoiceResult = (text: string) => {
    if (text.trim()) {
      setQuery(text);
      searchParams.set('q', text);
      setSearchParams(searchParams);
    }
  };

  // Handle recent search click
  const handleRecentClick = (searchQuery: string) => {
    setQuery(searchQuery);
    searchParams.set('q', searchQuery);
    setSearchParams(searchParams);
  };

  // Handle result click
  const handleResultClick = (item: SearchResult) => {
    navigate(`/watch/${item.id}`);
  };

  const hasQuery = searchParams.get('q');
  const showInitialState = !hasQuery && !loading && results.length === 0;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={[styles.searchInputContainer, focusedItem === 'input' && styles.searchInputFocused]}>
          <Search size={IS_TV_BUILD ? 28 : 22} color={colors.textMuted} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            onFocus={() => setFocusedItem('input')}
            onBlur={() => setFocusedItem(null)}
            placeholder={t('search.placeholder')}
            autoFocus={!IS_TV_BUILD}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: IS_TV_BUILD ? 24 : 18,
              color: colors.text,
              padding: IS_TV_BUILD ? 20 : 16,
              direction: isRTL ? 'rtl' : 'ltr',
            }}
          />
          {query && (
            <Pressable
              onPress={clearSearch}
              onFocus={() => setFocusedItem('clear')}
              onBlur={() => setFocusedItem(null)}
              style={[styles.clearBtn, focusedItem === 'clear' && styles.clearBtnFocused]}
            >
              <X size={IS_TV_BUILD ? 24 : 20} color={colors.textMuted} />
            </Pressable>
          )}
          <VoiceSearchButton
            onResult={handleVoiceResult}
            transcribeAudio={chatService.transcribeAudio}
            tvMode={IS_TV_BUILD}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;
          const isFocused = focusedItem === `filter-${filter.id}`;
          return (
            <Pressable
              key={filter.id}
              onPress={() => handleFilterChange(filter.id)}
              onFocus={() => setFocusedItem(`filter-${filter.id}`)}
              onBlur={() => setFocusedItem(null)}
              style={[
                styles.filterBtn,
                isActive && styles.filterBtnActive,
                isFocused && styles.filterBtnFocused,
              ]}
            >
              <Icon size={IS_TV_BUILD ? 24 : 18} color={isActive ? colors.text : colors.textSecondary} />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {t(filter.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('search.searching')}</Text>
        </View>
      ) : results.length > 0 ? (
        <View style={styles.results}>
          <Text style={styles.resultsCount}>
            {t('search.resultsFound', { count: results.length, query: hasQuery })}
          </Text>
          <View style={styles.grid}>
            {results.map((item) => {
              const isFocused = focusedItem === `result-${item.id}`;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleResultClick(item)}
                  onFocus={() => setFocusedItem(`result-${item.id}`)}
                  onBlur={() => setFocusedItem(null)}
                  style={[styles.card, isFocused && styles.cardFocused]}
                >
                  <View style={styles.cardThumb}>
                    {item.thumbnail ? (
                      <Image source={{ uri: item.thumbnail }} style={styles.cardImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.cardPlaceholder}>
                        <Film size={IS_TV_BUILD ? 48 : 32} color={colors.textMuted} />
                      </View>
                    )}
                    {item.duration && (
                      <View style={styles.duration}>
                        <Text style={styles.durationText}>{item.duration}</Text>
                      </View>
                    )}
                    {item.type && (
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{item.type}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, isRTL && { textAlign: 'right' }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.year && (
                      <Text style={[styles.cardMeta, isRTL && { textAlign: 'right' }]}>
                        {item.year}{item.category ? ` • ${item.category}` : ''}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : hasQuery ? (
        <View style={styles.centered}>
          <Search size={IS_TV_BUILD ? 100 : 64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('search.noResults')}</Text>
          <Text style={styles.emptyText}>{t('search.noResultsHint')}</Text>
        </View>
      ) : showInitialState ? (
        <View style={styles.initial}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clock size={IS_TV_BUILD ? 24 : 18} color={colors.textSecondary} />
                <Text style={styles.sectionTitle}>{t('search.recentSearches')}</Text>
              </View>
              <View style={styles.chips}>
                {recentSearches.map((item, idx) => {
                  const isFocused = focusedItem === `recent-${idx}`;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => handleRecentClick(item.query)}
                      onFocus={() => setFocusedItem(`recent-${idx}`)}
                      onBlur={() => setFocusedItem(null)}
                      style={[styles.chip, isFocused && styles.chipFocused]}
                    >
                      <Text style={styles.chipText}>{item.query}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Prompt */}
          <View style={styles.prompt}>
            <Search size={IS_TV_BUILD ? 80 : 56} color={colors.textMuted} />
            <Text style={styles.promptTitle}>{t('search.promptTitle')}</Text>
            <Text style={styles.promptText}>{t('search.promptDescription')}</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageContent: {
    padding: IS_TV_BUILD ? spacing.xl : spacing.lg,
    maxWidth: IS_TV_BUILD ? '100%' : 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  searchBar: {
    marginBottom: IS_TV_BUILD ? spacing.xl : spacing.lg,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: IS_TV_BUILD ? 16 : 12,
    paddingHorizontal: IS_TV_BUILD ? spacing.lg : spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchInputFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.1)',
  },
  clearBtn: {
    padding: spacing.sm,
    borderRadius: 8,
  },
  clearBtnFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filters: {
    flexDirection: 'row',
    gap: IS_TV_BUILD ? spacing.md : spacing.sm,
    marginBottom: IS_TV_BUILD ? spacing.xl : spacing.lg,
    flexWrap: 'wrap',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: IS_TV_BUILD ? spacing.lg : spacing.md,
    paddingVertical: IS_TV_BUILD ? spacing.md : spacing.sm,
    borderRadius: IS_TV_BUILD ? 12 : 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
  },
  filterBtnFocused: {
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: IS_TV_BUILD ? 20 : 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: IS_TV_BUILD ? 100 : 60,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: IS_TV_BUILD ? 20 : 16,
    color: colors.textSecondary,
  },
  results: {
    flex: 1,
  },
  resultsCount: {
    fontSize: IS_TV_BUILD ? 18 : 14,
    color: colors.textMuted,
    marginBottom: IS_TV_BUILD ? spacing.lg : spacing.md,
  },
  grid: {
    // @ts-ignore - CSS Grid for web
    display: 'grid',
    gridTemplateColumns: IS_TV_BUILD
      ? 'repeat(auto-fill, minmax(300px, 1fr))'
      : 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: IS_TV_BUILD ? spacing.lg : spacing.md,
  } as any,
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: IS_TV_BUILD ? 16 : 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.15)',
    transform: [{ scale: 1.03 }],
    // @ts-ignore
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
  },
  cardThumb: {
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    overflow: 'hidden',
    borderTopLeftRadius: IS_TV_BUILD ? 14 : 10,
    borderTopRightRadius: IS_TV_BUILD ? 14 : 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  duration: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: IS_TV_BUILD ? 14 : 12,
    color: colors.text,
    fontWeight: '500',
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: IS_TV_BUILD ? 12 : 10,
    color: colors.text,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardInfo: {
    padding: IS_TV_BUILD ? spacing.md : spacing.sm,
    paddingTop: IS_TV_BUILD ? spacing.sm : spacing.xs,
  },
  cardTitle: {
    fontSize: IS_TV_BUILD ? 18 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    lineHeight: IS_TV_BUILD ? 24 : 18,
  },
  cardMeta: {
    fontSize: IS_TV_BUILD ? 14 : 12,
    color: colors.textMuted,
  },
  emptyTitle: {
    fontSize: IS_TV_BUILD ? 32 : 24,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: IS_TV_BUILD ? 20 : 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  initial: {
    flex: 1,
  },
  section: {
    marginBottom: IS_TV_BUILD ? spacing.xl : spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: IS_TV_BUILD ? 22 : 16,
    fontWeight: '600',
    color: colors.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_TV_BUILD ? spacing.md : spacing.sm,
  },
  chip: {
    paddingHorizontal: IS_TV_BUILD ? spacing.lg : spacing.md,
    paddingVertical: IS_TV_BUILD ? spacing.md : spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: IS_TV_BUILD ? 12 : 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  chipText: {
    fontSize: IS_TV_BUILD ? 18 : 14,
    color: colors.text,
  },
  prompt: {
    alignItems: 'center',
    paddingVertical: IS_TV_BUILD ? 80 : 40,
  },
  promptTitle: {
    fontSize: IS_TV_BUILD ? 32 : 24,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  promptText: {
    fontSize: IS_TV_BUILD ? 20 : 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 500,
  },
});
