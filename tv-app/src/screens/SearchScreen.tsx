import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GlassView, GlassInput } from '../components/ui';
import { contentService } from '../services/api';
import { colors, spacing, borderRadius } from '../theme';
import { isTV, isWeb } from '../utils/platform';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type: 'vod' | 'live' | 'radio' | 'podcast';
  year?: string;
  duration?: string;
}

interface FilterOption {
  id: string;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'הכל' },
  { id: 'vod', label: 'סרטים וסדרות' },
  { id: 'live', label: 'ערוצים' },
  { id: 'radio', label: 'רדיו' },
  { id: 'podcast', label: 'פודקאסטים' },
];

const getTypeIcon = (type: string): string => {
  switch (type) {
    case 'vod': return '🎬';
    case 'live': return '📺';
    case 'radio': return '📻';
    case 'podcast': return '🎙️';
    default: return '🎬';
  }
};

const ResultCard: React.FC<{
  item: SearchResult;
  onPress: () => void;
  index: number;
}> = ({ item, onPress, index }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      style={styles.cardTouchable}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.cardFocused,
        ]}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.placeholderIcon}>{getTypeIcon(item.type)}</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{getTypeIcon(item.type)}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          )}
        </View>
        {isFocused && (
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [query, setQuery] = useState(route.params?.query || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (route.params?.query) {
      setQuery(route.params.query);
      performSearch(route.params.query);
    }
  }, [route.params?.query]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const params = selectedFilter !== 'all' ? { type: selectedFilter } : undefined;
      const data = await contentService.search(searchQuery, params).catch(() => ({ results: [] }));

      if (data.results?.length) {
        setResults(data.results);
      } else {
        // Demo search results
        const demoResults: SearchResult[] = [
          { id: '1', title: 'פאודה', type: 'vod', year: '2023', thumbnail: 'https://picsum.photos/400/225?random=50' },
          { id: '2', title: 'גלגלצ', type: 'radio', subtitle: '100 FM', thumbnail: 'https://picsum.photos/400/225?random=51' },
          { id: '3', title: 'כאן 11', type: 'live', subtitle: 'ערוץ חדשות', thumbnail: 'https://picsum.photos/400/225?random=52' },
          { id: '4', title: 'עושים היסטוריה', type: 'podcast', subtitle: 'רן לוי', thumbnail: 'https://picsum.photos/400/225?random=53' },
          { id: '5', title: 'שטיסל', type: 'vod', year: '2021', thumbnail: 'https://picsum.photos/400/225?random=54' },
          { id: '6', title: 'רדיו תל אביב', type: 'radio', subtitle: '102 FM', thumbnail: 'https://picsum.photos/400/225?random=55' },
        ].filter(item => {
          if (selectedFilter === 'all') return true;
          return item.type === selectedFilter;
        });
        setResults(demoResults);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch(query);
  };

  const handleFilterChange = (filterId: string) => {
    setSelectedFilter(filterId);
    if (hasSearched && query) {
      performSearch(query);
    }
  };

  const handleResultPress = (item: SearchResult) => {
    const screenMap: Record<string, string> = {
      vod: 'Player',
      live: 'Player',
      radio: 'Player',
      podcast: 'Player',
    };
    navigation.navigate(screenMap[item.type] || 'Player', {
      id: item.id,
      title: item.title,
      type: item.type,
    });
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    searchInputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>🔍</Text>
        </View>
        <View>
          <Text style={styles.title}>חיפוש</Text>
          <Text style={styles.subtitle}>מצא תוכן בכל הפלטפורמות</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <GlassView style={styles.searchBox}>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder="חפש סרטים, סדרות, ערוצים, פודקאסטים..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoFocus={!isTV}
          />
          {query ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
            <Text style={styles.searchButtonIcon}>🔍</Text>
          </TouchableOpacity>
        </GlassView>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {FILTER_OPTIONS.map((filter, index) => (
          <TouchableOpacity
            key={filter.id}
            onPress={() => handleFilterChange(filter.id)}
            style={[
              styles.filterButton,
              selectedFilter === filter.id && styles.filterButtonActive,
            ]}
            // @ts-ignore
            hasTVPreferredFocus={index === 0 && isTV}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter.id && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>מחפש...</Text>
        </View>
      ) : results.length > 0 ? (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsCount}>
            נמצאו {results.length} תוצאות עבור "{query}"
          </Text>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            numColumns={isTV ? 6 : 3}
            key={isTV ? 'tv' : 'mobile'}
            contentContainerStyle={styles.grid}
            renderItem={({ item, index }) => (
              <ResultCard
                item={item}
                onPress={() => handleResultPress(item)}
                index={index}
              />
            )}
          />
        </View>
      ) : hasSearched ? (
        <View style={styles.emptyState}>
          <GlassView style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>לא נמצאו תוצאות</Text>
            <Text style={styles.emptySubtitle}>נסה לחפש משהו אחר או לשנות את הסינון</Text>
          </GlassView>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <GlassView style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>מה אתה מחפש?</Text>
            <Text style={styles.emptySubtitle}>
              חפש סרטים, סדרות, ערוצים, תחנות רדיו ופודקאסטים
            </Text>
          </GlassView>
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
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 40,
    paddingBottom: spacing.md,
    width: '100%',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  headerIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  searchContainer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: colors.text,
    textAlign: 'right',
    paddingVertical: spacing.sm,
  },
  clearButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  clearIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginLeft: spacing.sm,
  },
  searchButtonIcon: {
    fontSize: 20,
  },
  filtersScroll: {
    maxHeight: 60,
  },
  filtersContainer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    marginTop: spacing.md,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  resultsCount: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  grid: {
    paddingBottom: spacing.xxl,
  },
  cardTouchable: {
    flex: 1,
    margin: spacing.sm,
    maxWidth: isTV ? '16.66%' : '33.33%',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  cardContent: {
    padding: spacing.sm,
  },
  typeBadge: {
    position: 'absolute',
    top: -28,
    right: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
    color: colors.background,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default SearchScreen;
