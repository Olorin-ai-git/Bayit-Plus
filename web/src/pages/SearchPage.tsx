import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Search, X, Film, Tv, Radio, Podcast, Grid, Clock, TrendingUp, Mic } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import {
  GlassView,
  GlassCard,
  GlassInput,
  GlassTabs,
  GlassBadge,
  VoiceSearchButton,
} from '@bayit/shared';
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

const FILTER_ICONS: Record<string, React.ReactNode> = {
  all: <Grid size={16} color={colors.textSecondary} />,
  vod: <Film size={16} color={colors.textSecondary} />,
  live: <Tv size={16} color={colors.textSecondary} />,
  radio: <Radio size={16} color={colors.textSecondary} />,
  podcast: <Podcast size={16} color={colors.textSecondary} />,
};

export default function SearchPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(searchParams.get('type') || 'all');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showVoiceListening, setShowVoiceListening] = useState(false);

  const filterTabs = [
    { id: 'all', label: t('search.filters.all') },
    { id: 'vod', label: t('search.filters.vod') },
    { id: 'live', label: t('search.filters.live') },
    { id: 'radio', label: t('search.filters.radio') },
    { id: 'podcast', label: t('search.filters.podcast') },
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Save to recent searches
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const newSearch: RecentSearch = { query: searchQuery, timestamp: Date.now() };
    const updated = [newSearch, ...recentSearches.filter(s => s.query !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);

    try {
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (e) {
      // Ignore localStorage errors
    }
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
    if (q && q !== query) {
      setQuery(q);
      performSearch(q);
    } else if (q) {
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

    // Re-run search with new filter
    if (query.trim()) {
      performSearch(query);
    }
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    searchParams.delete('q');
    setSearchParams(searchParams);
  };

  // Handle voice transcription
  const handleVoiceTranscribed = (text: string) => {
    if (text.trim()) {
      setQuery(text);
      searchParams.set('q', text);
      setSearchParams(searchParams);
      setShowVoiceListening(false);
    }
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Handle recent search click
  const handleRecentSearchClick = (searchQuery: string) => {
    setQuery(searchQuery);
    searchParams.set('q', searchQuery);
    setSearchParams(searchParams);
  };

  // Handle result click
  const handleResultClick = (item: SearchResult) => {
    navigate(`/watch/${item.id}`);
  };

  const hasQuery = searchParams.get('q');

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Background Effects */}
        <View style={styles.backgroundGradient1} />
        <View style={styles.backgroundGradient2} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, isRTL && styles.titleRTL]}>
            {t('search.title')}
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.subtitleRTL]}>
            {t('search.subtitle')}
          </Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchSection}>
          <GlassView style={styles.searchContainer} intensity="medium">
            <View style={[styles.searchInputWrapper, isRTL && styles.searchInputWrapperRTL]}>
              <Search size={22} color={colors.textMuted} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={t('search.placeholder')}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 18,
                  color: colors.text,
                  padding: `${spacing.md}px`,
                  direction: isRTL ? 'rtl' : 'ltr',
                }}
              />
              <View style={styles.searchActions}>
                {query && (
                  <Pressable onPress={clearSearch} style={styles.clearButton}>
                    <X size={20} color={colors.textMuted} />
                  </Pressable>
                )}
                {!IS_TV_BUILD && (
                  <View style={styles.voiceButtonWrapper}>
                    <VoiceSearchButton
                      onResult={handleVoiceTranscribed}
                      transcribeAudio={chatService.transcribeAudio}
                    />
                  </View>
                )}
              </View>
            </View>
          </GlassView>

          {/* Voice Listening Indicator */}
          {showVoiceListening && (
            <View style={styles.voiceListeningBanner}>
              <GlassView style={styles.voiceListeningContent} intensity="high">
                <Mic size={24} color={colors.primary} />
                <Text style={styles.voiceListeningText}>
                  {t('search.listening')}
                </Text>
              </GlassView>
            </View>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filtersSection}>
          <GlassTabs
            tabs={filterTabs}
            activeTab={activeFilter}
            onChange={handleFilterChange}
            variant="pills"
          />
        </View>

        {/* Content Area */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {t('search.searching')}
            </Text>
          </View>
        ) : results.length > 0 ? (
          <View style={styles.resultsSection}>
            {/* Results Count */}
            <View style={[styles.resultsHeader, isRTL && styles.resultsHeaderRTL]}>
              <Text style={styles.resultsCount}>
                {t('search.resultsFound', {
                  count: results.length,
                  query: hasQuery,
                })}
              </Text>
            </View>

            {/* Results Grid */}
            <View style={styles.resultsGrid}>
              {results.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleResultClick(item)}
                  style={({ pressed }) => [
                    styles.resultCardWrapper,
                    pressed && styles.resultCardPressed,
                  ]}
                >
                  <GlassCard style={styles.resultCard}>
                    {/* Thumbnail */}
                    <View style={styles.thumbnailContainer}>
                      {item.thumbnail ? (
                        <Image
                          source={{ uri: item.thumbnail }}
                          style={styles.thumbnail}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.thumbnailPlaceholder}>
                          <Film size={32} color={colors.textMuted} />
                        </View>
                      )}
                      {item.type && (
                        <View style={styles.typeBadge}>
                          <GlassBadge variant="primary" size="sm">
                            {item.type}
                          </GlassBadge>
                        </View>
                      )}
                      {item.duration && (
                        <View style={styles.durationBadge}>
                          <Text style={styles.durationText}>{item.duration}</Text>
                        </View>
                      )}
                    </View>

                    {/* Info */}
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultTitle, isRTL && styles.resultTitleRTL]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.year && (
                        <Text style={[styles.resultMeta, isRTL && styles.resultMetaRTL]}>
                          {item.year}
                          {item.category && ` • ${item.category}`}
                        </Text>
                      )}
                    </View>
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          </View>
        ) : hasQuery ? (
          /* No Results */
          <View style={styles.emptyState}>
            <GlassCard style={styles.emptyCard}>
              <Search size={80} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {t('search.noResults')}
              </Text>
              <Text style={styles.emptyDescription}>
                {t('search.noResultsHint')}
              </Text>
            </GlassCard>
          </View>
        ) : (
          /* Initial State - Show Recent Searches or Suggestions */
          <View style={styles.initialState}>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.recentSection}>
                <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
                  <View style={styles.sectionTitleRow}>
                    <Clock size={18} color={colors.textSecondary} />
                    <Text style={styles.sectionTitle}>
                      {t('search.recentSearches')}
                    </Text>
                  </View>
                  <Pressable onPress={clearRecentSearches}>
                    <Text style={styles.clearText}>
                      {t('search.clearAll')}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.recentList}>
                  {recentSearches.map((item, index) => (
                    <Pressable
                      key={index}
                      onPress={() => handleRecentSearchClick(item.query)}
                      style={({ pressed }) => [
                        styles.recentItem,
                        pressed && styles.recentItemPressed,
                      ]}
                    >
                      <GlassView style={styles.recentItemContent} intensity="low">
                        <Clock size={14} color={colors.textMuted} />
                        <Text style={styles.recentItemText}>{item.query}</Text>
                      </GlassView>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Trending Suggestions */}
            <View style={styles.suggestionsSection}>
              <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
                <View style={styles.sectionTitleRow}>
                  <TrendingUp size={18} color={colors.textSecondary} />
                  <Text style={styles.sectionTitle}>
                    {t('search.trending')}
                  </Text>
                </View>
              </View>

              <View style={styles.suggestionsList}>
                {[
                  t('search.suggestions.movies'),
                  t('search.suggestions.series'),
                  t('search.suggestions.liveTV'),
                  t('search.suggestions.news'),
                  t('search.suggestions.sports'),
                  t('search.suggestions.kids'),
                ].map((suggestion, index) => (
                  <Pressable
                    key={index}
                    onPress={() => handleRecentSearchClick(suggestion)}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      pressed && styles.suggestionChipPressed,
                    ]}
                  >
                    <GlassView style={styles.suggestionContent} intensity="low">
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </GlassView>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Search Prompt */}
            <View style={styles.promptSection}>
              <GlassCard style={styles.promptCard}>
                <Search size={72} color={colors.textMuted} />
                <Text style={styles.promptTitle}>
                  {t('search.promptTitle')}
                </Text>
                <Text style={styles.promptDescription}>
                  {t('search.promptDescription')}
                </Text>
              </GlassCard>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    minHeight: '100vh' as any,
    position: 'relative',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    padding: spacing.lg,
  },
  backgroundGradient1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: colors.primary,
    opacity: 0.06,
    top: -150,
    right: -150,
    // @ts-ignore
    filter: 'blur(100px)',
  },
  backgroundGradient2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#8b5cf6',
    opacity: 0.04,
    bottom: 100,
    left: -100,
    // @ts-ignore
    filter: 'blur(80px)',
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: IS_TV_BUILD ? 48 : 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  titleRTL: {
    textAlign: 'right',
  },
  subtitle: {
    fontSize: IS_TV_BUILD ? 24 : 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  subtitleRTL: {
    textAlign: 'right',
  },
  searchSection: {
    marginBottom: spacing.lg,
  },
  searchContainer: {
    borderRadius: borderRadius.xl,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  searchInputWrapperRTL: {
    flexDirection: 'row-reverse',
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
    // @ts-ignore
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  voiceButtonWrapper: {
    marginLeft: spacing.xs,
  },
  voiceListeningBanner: {
    marginTop: spacing.md,
  },
  voiceListeningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  voiceListeningText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  filtersSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  resultsSection: {
    flex: 1,
  },
  resultsHeader: {
    marginBottom: spacing.lg,
  },
  resultsHeaderRTL: {
    alignItems: 'flex-end',
  },
  resultsCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_TV_BUILD ? spacing.xl : spacing.lg,
  },
  resultCardWrapper: {
    width: IS_TV_BUILD ? 'calc(33.33% - 24px)' as any : 'calc(25% - 18px)' as any,
    minWidth: IS_TV_BUILD ? 380 : 240,
  },
  resultCardPressed: {
    opacity: 0.8,
    // @ts-ignore
    transform: 'scale(0.98)',
  },
  resultCard: {
    overflow: 'visible' as any,
    padding: 0,
  },
  thumbnailContainer: {
    position: 'relative',
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  durationText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  resultInfo: {
    padding: IS_TV_BUILD ? spacing.lg : spacing.md,
  },
  resultTitle: {
    fontSize: IS_TV_BUILD ? 22 : 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: IS_TV_BUILD ? 30 : 20,
  },
  resultTitleRTL: {
    textAlign: 'right',
  },
  resultMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  resultMetaRTL: {
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyCard: {
    padding: IS_TV_BUILD ? spacing.xl * 3 : spacing.xl * 2,
    alignItems: 'center',
    minWidth: IS_TV_BUILD ? 700 : 500,
    maxWidth: IS_TV_BUILD ? 900 : 600,
  },
  emptyTitle: {
    fontSize: IS_TV_BUILD ? 36 : 24,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  emptyDescription: {
    fontSize: IS_TV_BUILD ? 24 : 18,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: IS_TV_BUILD ? 36 : 26,
  },
  initialState: {
    flex: 1,
  },
  recentSection: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  clearText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  recentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recentItem: {
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  recentItemPressed: {
    opacity: 0.7,
  },
  recentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  recentItemText: {
    fontSize: 14,
    color: colors.text,
  },
  suggestionsSection: {
    marginBottom: spacing.xl,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  suggestionChipPressed: {
    opacity: 0.7,
  },
  suggestionContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  promptSection: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  promptCard: {
    padding: IS_TV_BUILD ? spacing.xl * 3 : spacing.xl * 2,
    alignItems: 'center',
    minWidth: IS_TV_BUILD ? 700 : 500,
    maxWidth: IS_TV_BUILD ? 900 : 600,
  },
  promptTitle: {
    fontSize: IS_TV_BUILD ? 36 : 24,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  promptDescription: {
    fontSize: IS_TV_BUILD ? 24 : 18,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: IS_TV_BUILD ? 36 : 26,
  },
});
