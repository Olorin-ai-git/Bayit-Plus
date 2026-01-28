import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Image } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, X } from 'lucide-react';
import { GlassView, GlassCard } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { watchlistService } from '@/services/api';
import { useDirection } from '@/hooks/useDirection';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils/contentLocalization';
import { LoadingState, EmptyState } from '@bayit/shared/components/states';
import logger from '@/utils/logger';
import PageLoading from '@/components/common/PageLoading';

interface WatchlistItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'movie' | 'series' | 'live' | 'podcast' | 'radio' | 'channel';
  category?: string;
  is_kids_content?: boolean;
  year?: string;
  duration?: string;
  addedAt?: string;
  progress?: number;
}

const getTypeIconName = (type: string): string => {
  switch (type) {
    case 'movie': return 'vod';
    case 'series': return 'vod';
    case 'podcast': return 'podcasts';
    case 'radio': return 'radio';
    case 'live':
    case 'channel': return 'live';
    default: return 'discover';
  }
};

const WatchlistCard: React.FC<{
  item: WatchlistItem;
  onPress: () => void;
  onRemove: () => void;
  getLocalizedText: (item: any, field: string) => string;
}> = ({ item, onPress, onRemove, getLocalizedText }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={styles.cardTouchable}
    >
      <View style={[styles.card, isHovered && styles.cardHovered]}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <NativeIcon name="discover" size="xl" color={colors.textMuted} />
          </View>
        )}

        {item.progress !== undefined && item.progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
          </View>
        )}

        <View style={[styles.typeBadge, isRTL ? { left: 8 } : { right: 8 }]}>
          <NativeIcon name={getTypeIconName(item.type)} size="sm" color={colors.background} />
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={1}>
            {getLocalizedText(item, 'title')}
          </Text>
          <Text style={[styles.cardMeta, { textAlign }]}>
            {item.year}{item.year && item.duration ? ' • ' : ''}{item.duration}
          </Text>
          {item.progress !== undefined && item.progress > 0 && (
            <Text style={[styles.progressText, { textAlign }]}>{item.progress}%</Text>
          )}
        </View>

        {isHovered && (
          <View style={styles.overlay}>
            <View style={styles.overlayButtons}>
              <Pressable style={styles.playButton} onPress={onPress}>
                <Play size={20} color={colors.text} fill={colors.text} />
              </Pressable>
              <Pressable style={styles.removeButton} onPress={onRemove}>
                <X size={18} color={colors.text} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
};

export default function WatchlistPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'movies' | 'series' | 'continue' | 'kids' | 'judaism' | 'podcasts' | 'radio'>('all');

  const getLocalizedText = (item: any, field: string) => {
    if (field === 'title') return getLocalizedName(item, i18n.language);
    if (field === 'description') return getLocalizedDescription(item, i18n.language);
    return item[field] || '';
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setIsLoading(true);
      const data = await watchlistService.getWatchlist();
      logger.debug('Watchlist API response', 'WatchlistPage', data);
      setWatchlist(data?.items || []);
    } catch (err) {
      logger.error('Watchlist load error', 'WatchlistPage', err);
      logger.error('Failed to load watchlist', 'WatchlistPage', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWatchlist = watchlist.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'movies') return item.type === 'movie';
    if (filter === 'series') return item.type === 'series';
    if (filter === 'continue') return item.progress !== undefined && item.progress > 0;
    if (filter === 'kids') return item.is_kids_content === true;
    if (filter === 'judaism') return item.category?.toLowerCase() === 'judaism' || item.category === 'יהדות';
    if (filter === 'podcasts') return item.type === 'podcast';
    if (filter === 'radio') return item.type === 'radio';
    return true;
  });

  const handleItemPress = (item: WatchlistItem) => {
    switch (item.type) {
      case 'live':
      case 'channel':
        navigate(`/live/${item.id}`);
        break;
      case 'podcast':
        navigate(`/podcasts/${item.id}`);
        break;
      case 'radio':
        navigate(`/radio/${item.id}`);
        break;
      default:
        navigate(`/vod/${item.id}`);
    }
  };

  const handleRemoveFromWatchlist = async (id: string) => {
    try {
      await watchlistService.removeFromWatchlist(id);
      setWatchlist(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      logger.error('Failed to remove from watchlist', 'WatchlistPage', err);
    }
  };

  const filterOptions = [
    { id: 'all', labelKey: 'watchlist.filters.all' },
    { id: 'continue', labelKey: 'watchlist.filters.continue' },
    { id: 'movies', labelKey: 'watchlist.filters.movies' },
    { id: 'series', labelKey: 'watchlist.filters.series' },
    { id: 'kids', labelKey: 'watchlist.filters.kids' },
    { id: 'judaism', labelKey: 'watchlist.filters.judaism' },
    { id: 'podcasts', labelKey: 'watchlist.filters.podcasts' },
    { id: 'radio', labelKey: 'watchlist.filters.radio' },
  ];

  if (isLoading) {
    return (
      <PageLoading
        title={t('watchlist.title', 'My Watchlist')}
        message={t('watchlist.loading', 'Loading watchlist...')}
        isRTL={isRTL}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { flexDirection, justifyContent }]}>
        <View style={[styles.headerIcon, isRTL ? { marginLeft: spacing.lg } : { marginRight: spacing.lg }]}>
          <Text style={styles.headerIconText}>📋</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('watchlist.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {watchlist.length} {t('watchlist.items')}
          </Text>
        </View>
      </View>

      <View style={[styles.filterContainer, { flexDirection: 'row' }]}>
        {(isRTL ? [...filterOptions].reverse() : filterOptions).map((option) => (
          <Pressable
            key={option.id}
            onPress={() => setFilter(option.id as any)}
            style={[styles.filterButton, filter === option.id && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, filter === option.id && styles.filterTextActive]}>
              {t(option.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredWatchlist}
        keyExtractor={(item) => item.id}
        numColumns={5}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <WatchlistCard
            item={item}
            onPress={() => handleItemPress(item)}
            onRemove={() => handleRemoveFromWatchlist(item.id)}
            getLocalizedText={getLocalizedText}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyTitle, { textAlign }]}>{t('watchlist.empty')}</Text>
              <Text style={[styles.emptySubtitle, { textAlign }]}>
                {t('watchlist.emptyHint')}
              </Text>
            </GlassCard>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.text, fontSize: 18, marginTop: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 40, paddingBottom: spacing.lg },
  headerIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(138, 43, 226, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerIconText: { fontSize: 28 },
  title: { fontSize: 36, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 2 },
  filterContainer: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg, gap: spacing.sm, flexWrap: 'wrap' },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.backgroundLight, borderWidth: 2, borderColor: 'transparent' },
  filterButtonActive: { backgroundColor: 'rgba(138, 43, 226, 0.2)', borderColor: colors.secondary },
  filterText: { fontSize: 14, color: colors.textMuted },
  filterTextActive: { color: colors.secondary.DEFAULT, fontWeight: 'bold' },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.md },
  cardTouchable: { flex: 1, margin: spacing.sm, maxWidth: '20%' },
  card: { backgroundColor: colors.backgroundLight, borderRadius: borderRadius.lg, overflow: 'visible' as any, borderWidth: 3, borderColor: 'transparent' },
  cardHovered: { borderColor: colors.secondary.DEFAULT, transform: [{ scale: 1.05 }] },
  cardImage: { width: '100%', aspectRatio: 16 / 9 },
  cardImagePlaceholder: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.backgroundLighter, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 32 },
  progressContainer: { position: 'absolute', bottom: 52, left: 0, right: 0, height: 4, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  progressBar: { height: '100%', backgroundColor: colors.secondary },
  typeBadge: { position: 'absolute', top: 8, backgroundColor: 'rgba(0, 0, 0, 0.7)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  typeBadgeText: { fontSize: 14 },
  cardContent: { padding: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  progressText: { fontSize: 11, color: colors.secondary.DEFAULT, marginTop: 2, fontWeight: '600' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' },
  overlayButtons: { flexDirection: 'row', gap: spacing.md },
  playButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.secondary.DEFAULT, justifyContent: 'center', alignItems: 'center' },
  removeButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyCard: { padding: spacing.xxl, alignItems: 'center' },
  emptyIcon: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: 16, color: colors.textSecondary },
});
