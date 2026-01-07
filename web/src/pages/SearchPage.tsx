import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, useWindowDimensions } from 'react-native';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import ContentCard from '@/components/content/ContentCard';
import { VoiceSearchButton } from '@bayit/shared';
import { contentService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard, GlassInput } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface SearchResult {
  id: string;
  title: string;
  thumbnail?: string;
  type?: string;
  duration?: string;
  year?: string;
  category?: string;
}

const filterOptions = [
  { id: 'all', label: 'הכל' },
  { id: 'vod', label: 'סרטים וסדרות' },
  { id: 'live', label: 'ערוצים' },
  { id: 'radio', label: 'רדיו' },
  { id: 'podcast', label: 'פודקאסטים' },
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || 'all',
  });
  const { width } = useWindowDimensions();

  const numColumns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await contentService.search(searchQuery, {
        type: filters.type !== 'all' ? filters.type : undefined,
      });
      setResults(data.results);
    } catch (error) {
      logger.error('Search failed', 'SearchPage', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (query.trim()) {
      searchParams.set('q', query);
      setSearchParams(searchParams);
    }
  };

  const handleFilterChange = (type: string) => {
    setFilters({ ...filters, type });
    if (type === 'all') {
      searchParams.delete('type');
    } else {
      searchParams.set('type', type);
    }
    setSearchParams(searchParams);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    searchParams.delete('q');
    setSearchParams(searchParams);
  };

  const handleVoiceTranscribed = (text: string) => {
    if (text.trim()) {
      setQuery(text);
      searchParams.set('q', text);
      setSearchParams(searchParams);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Form */}
      <View style={styles.searchContainer}>
        <GlassView style={styles.searchInputContainer}>
          <Search size={24} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            placeholder="חפש סרטים, סדרות, ערוצים, פודקאסטים..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoFocus
          />
          <View style={styles.searchActions}>
            {query ? (
              <Pressable onPress={clearSearch} style={styles.clearButton}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            ) : null}
            <VoiceSearchButton onTranscribed={handleVoiceTranscribed} size="sm" />
          </View>
        </GlassView>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {filterOptions.map((filter) => (
          <Pressable
            key={filter.id}
            onPress={() => handleFilterChange(filter.id)}
            style={[styles.filterPill, filters.type === filter.id && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filters.type === filter.id && styles.filterTextActive]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.grid}>
          {[...Array(12)].map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : results.length > 0 ? (
        <>
          <Text style={styles.resultsCount}>
            נמצאו {results.length} תוצאות עבור "{searchParams.get('q')}"
          </Text>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
            renderItem={({ item }) => (
              <View style={{ flex: 1, maxWidth: `${100 / numColumns}%`, padding: spacing.xs }}>
                <ContentCard content={item} />
              </View>
            )}
          />
        </>
      ) : searchParams.get('q') ? (
        <View style={styles.emptyState}>
          <GlassCard style={styles.emptyCard}>
            <Search size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>לא נמצאו תוצאות</Text>
            <Text style={styles.emptyDescription}>נסה לחפש משהו אחר או לשנות את הסינון</Text>
          </GlassCard>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <GlassCard style={styles.emptyCard}>
            <Search size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>מה אתה מחפש?</Text>
            <Text style={styles.emptyDescription}>חפש סרטים, סדרות, ערוצים, תחנות רדיו ופודקאסטים</Text>
          </GlassCard>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  searchContainer: {
    maxWidth: 672,
    marginHorizontal: 'auto',
    marginBottom: spacing.lg,
    width: '100%',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridContent: {
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyCard: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  skeletonCard: {
    flex: 1,
    minWidth: 150,
    maxWidth: '16.66%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    margin: spacing.xs,
  },
});
