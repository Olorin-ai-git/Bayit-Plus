import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../components/ui';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { getLocalizedName, getLocalizedDescription } from '../utils/contentLocalization';

interface WatchlistItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'movie' | 'series';
  year?: string;
  duration?: string;
  addedAt?: string;
  progress?: number; // 0-100 for continue watching
}

// Demo watchlist data with localization
const demoWatchlist: WatchlistItem[] = [
  {
    id: 'wl-1',
    title: 'פאודה עונה 4',
    title_en: 'Fauda Season 4',
    title_es: 'Fauda Temporada 4',
    subtitle: 'הסדרה הישראלית המצליחה',
    subtitle_en: 'The hit Israeli series',
    subtitle_es: 'La exitosa serie israeli',
    thumbnail: 'https://picsum.photos/seed/fauda4/400/225',
    type: 'series',
    year: '2024',
    addedAt: '2024-01-15',
    progress: 45,
  },
  {
    id: 'wl-2',
    title: 'טהרן עונה 3',
    title_en: 'Tehran Season 3',
    title_es: 'Teheran Temporada 3',
    subtitle: 'מותחן ריגול',
    subtitle_en: 'Spy thriller',
    subtitle_es: 'Thriller de espionaje',
    thumbnail: 'https://picsum.photos/seed/tehran3/400/225',
    type: 'series',
    year: '2024',
    addedAt: '2024-01-12',
  },
  {
    id: 'wl-3',
    title: 'גט',
    title_en: 'Gett: The Trial of Viviane Amsalem',
    title_es: 'Gett: El divorcio de Viviane Amsalem',
    subtitle: 'דרמה משפטית',
    subtitle_en: 'Legal drama',
    subtitle_es: 'Drama legal',
    thumbnail: 'https://picsum.photos/seed/gett/400/225',
    type: 'movie',
    year: '2014',
    duration: '1h 55m',
    addedAt: '2024-01-10',
  },
  {
    id: 'wl-4',
    title: 'שבעה ימים טובים',
    title_en: 'Seven Blessed Days',
    title_es: 'Siete Dias Bendecidos',
    subtitle: 'קומדיה ישראלית',
    subtitle_en: 'Israeli comedy',
    subtitle_es: 'Comedia israeli',
    thumbnail: 'https://picsum.photos/seed/shiva/400/225',
    type: 'movie',
    year: '2023',
    duration: '1h 42m',
    addedAt: '2024-01-08',
    progress: 78,
  },
  {
    id: 'wl-5',
    title: 'בית הספר של שבתאי',
    title_en: 'Shabbtai\'s School',
    title_es: 'La Escuela de Shabbtai',
    subtitle: 'סדרת דרמה',
    subtitle_en: 'Drama series',
    subtitle_es: 'Serie de drama',
    thumbnail: 'https://picsum.photos/seed/shabbtai/400/225',
    type: 'series',
    year: '2023',
    addedAt: '2024-01-05',
  },
  {
    id: 'wl-6',
    title: 'נערות פורנו',
    title_en: 'Checkout Girls',
    title_es: 'Chicas de Caja',
    subtitle: 'סדרה קומית',
    subtitle_en: 'Comedy series',
    subtitle_es: 'Serie de comedia',
    thumbnail: 'https://picsum.photos/seed/checkout/400/225',
    type: 'series',
    year: '2022',
    addedAt: '2024-01-03',
  },
];

const WatchlistCard: React.FC<{
  item: WatchlistItem;
  onPress: () => void;
  onRemove: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ item, onPress, onRemove, index, getLocalizedText }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { isRTL, textAlign } = useDirection();

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
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
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
            <Text style={styles.placeholderIcon}>📋</Text>
          </View>
        )}

        {/* Progress bar for items in progress */}
        {item.progress !== undefined && item.progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
          </View>
        )}

        <View style={[styles.typeBadge, isRTL ? { left: 8 } : { right: 8 }]}>
          <Text style={styles.typeBadgeText}>{item.type === 'movie' ? '🎬' : '📺'}</Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={1}>
            {getLocalizedText(item, 'title')}
          </Text>
          <Text style={[styles.cardMeta, { textAlign }]}>
            {item.year}{item.year && item.duration ? ' • ' : ''}{item.duration}
          </Text>
          {item.progress !== undefined && item.progress > 0 && (
            <Text style={[styles.progressText, { textAlign }]}>
              {item.progress}%
            </Text>
          )}
        </View>

        {isFocused && (
          <View style={styles.overlay}>
            <View style={styles.overlayButtons}>
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
              <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
                <Text style={styles.removeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const WatchlistScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'movies' | 'series' | 'continue'>('all');
  const currentLang = i18n.language;

  // Helper to get localized text
  const getLocalizedText = (item: any, field: string) => {
    if (field === 'title') return getLocalizedName(item, currentLang);
    if (field === 'description') return getLocalizedDescription(item, currentLang);
    // Fallback for other fields
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setWatchlist(demoWatchlist);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWatchlist = watchlist.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'movies') return item.type === 'movie';
    if (filter === 'series') return item.type === 'series';
    if (filter === 'continue') return item.progress !== undefined && item.progress > 0;
    return true;
  });

  const handleItemPress = (item: WatchlistItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedText(item, 'title'),
      type: 'vod',
    });
  };

  const handleRemoveFromWatchlist = (id: string) => {
    setWatchlist(prev => prev.filter(item => item.id !== id));
  };

  const filterOptions = [
    { id: 'all', labelKey: 'watchlist.filters.all' },
    { id: 'continue', labelKey: 'watchlist.filters.continue' },
    { id: 'movies', labelKey: 'watchlist.filters.movies' },
    { id: 'series', labelKey: 'watchlist.filters.series' },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }]}>
          <Text style={styles.headerIconText}>📋</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('watchlist.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {watchlist.length} {t('watchlist.items')}
          </Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterContainer, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        {(isRTL ? filterOptions : [...filterOptions].reverse()).map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => setFilter(option.id as any)}
            style={[
              styles.filterButton,
              filter === option.id && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === option.id && styles.filterTextActive,
              ]}
            >
              {t(option.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Grid */}
      <FlatList
        data={filteredWatchlist}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <WatchlistCard
            item={item}
            onPress={() => handleItemPress(item)}
            onRemove={() => handleRemoveFromWatchlist(item.id)}
            index={index}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassView style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyTitle, { textAlign }]}>{t('watchlist.empty')}</Text>
              <Text style={[styles.emptySubtitle, { textAlign }]}>{t('watchlist.emptyHint')}</Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 40,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
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
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterContainer: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    borderColor: '#8a2be2',
  },
  filterText: {
    fontSize: 16,
    color: '#888888',
  },
  filterTextActive: {
    color: '#8a2be2',
    fontWeight: 'bold',
  },
  grid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  cardTouchable: {
    flex: 1,
    margin: spacing.sm,
    maxWidth: isTV ? '16.66%' : '25%',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: '#8a2be2',
    // @ts-ignore
    boxShadow: '0 0 20px #8a2be2',
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
  progressContainer: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8a2be2',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 14,
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#8a2be2',
    marginTop: 2,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8a2be2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
    color: colors.text,
    marginLeft: 4,
  },
  removeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    fontSize: 18,
    color: colors.text,
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
  },
});

export default WatchlistScreen;
