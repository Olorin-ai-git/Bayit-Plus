/**
 * Playlist Page
 * Displays user playlist with Play All, drag-drop reorder, and filters
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { colors, spacing } from '@olorin/design-tokens';
import { Icon } from '@olorin/shared-icons/web';
import { playlistService } from '@/services/api';
import { useDirection } from '@/hooks/useDirection';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils/contentLocalization';
import logger from '@/utils/logger';
import PageLoading from '@/components/common/PageLoading';
import { SortablePlaylistCard } from './watchlist/WatchlistCard';
import { getWatchRoute, getFlowContentType } from './watchlist/helpers';
import type { PlaylistPageItem } from './watchlist/types';

export { type PlaylistPageItem } from './watchlist/types';

const FILTER_OPTIONS = [
  { id: 'all', labelKey: 'playlist.filters.all' },
  { id: 'continue', labelKey: 'playlist.filters.continue' },
  { id: 'movies', labelKey: 'playlist.filters.movies' },
  { id: 'series', labelKey: 'playlist.filters.series' },
  { id: 'kids', labelKey: 'playlist.filters.kids' },
  { id: 'judaism', labelKey: 'playlist.filters.judaism' },
  { id: 'podcasts', labelKey: 'playlist.filters.podcasts' },
];

export default function PlaylistPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [playlistItems, setPlaylistItems] = useState<PlaylistPageItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const getLocalizedText = (item: any, field: string) => {
    if (field === 'title') return getLocalizedName(item, i18n.language);
    if (field === 'description') return getLocalizedDescription(item, i18n.language);
    return item[field] || '';
  };

  const loadPlaylist = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await playlistService.getPlaylist();
      logger.debug('Playlist API response', 'PlaylistPage', data);
      setPlaylistItems(data?.items || []);
    } catch (err) {
      logger.error('Playlist load error', 'PlaylistPage', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadPlaylist(); }, [loadPlaylist]);

  const filteredItems = playlistItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'movies') return item.type === 'movie';
    if (filter === 'series') return item.type === 'series';
    if (filter === 'continue') return item.progress !== undefined && item.progress > 0;
    if (filter === 'kids') return item.is_kids_content === true;
    if (filter === 'judaism') return item.category?.toLowerCase() === 'judaism' || item.category === '\u05d9\u05d4\u05d3\u05d5\u05ea';
    if (filter === 'podcasts') return item.type === 'podcast';
    if (filter === 'radio') return item.type === 'radio';
    return true;
  });

  const handleRemove = async (id: string) => {
    try {
      await playlistService.removeItem(id);
      setPlaylistItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      logger.error('Failed to remove from playlist', 'PlaylistPage', err);
    }
  };

  const handlePlayAll = useCallback(() => {
    if (filteredItems.length === 0) return;
    const flowItems = filteredItems.map((item, index) => ({
      content_id: item.id,
      content_type: getFlowContentType(item.type),
      title: getLocalizedText(item, 'title'),
      thumbnail: item.thumbnail,
      duration_hint: undefined,
      order: index,
    }));
    const firstItem = filteredItems[0];
    navigate(getWatchRoute(firstItem), {
      state: { flowId: `playlist-${Date.now()}`, flowName: t('playlist.title'), playlist: flowItems, currentIndex: 0 },
    });
  }, [filteredItems, navigate, t, i18n.language]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = playlistItems.findIndex(item => item.id === active.id);
    const newIndex = playlistItems.findIndex(item => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setPlaylistItems(arrayMove(playlistItems, oldIndex, newIndex));
    playlistService.reorderItem(String(active.id), newIndex).catch((err) => {
      logger.error('Failed to persist reorder', 'PlaylistPage', err);
      loadPlaylist();
    });
  }, [playlistItems, loadPlaylist]);

  if (isLoading) {
    return <PageLoading title={t('playlist.title', 'My Playlist')} message={t('playlist.loading', 'Loading playlist...')} isRTL={isRTL} />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { flexDirection, justifyContent }]}>
        <View style={[styles.headerIcon, isRTL ? { marginLeft: spacing.lg } : { marginRight: spacing.lg }]}>
          <Icon name="clipboard" size={28} color={colors.secondary.DEFAULT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { textAlign }]}>{t('playlist.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{playlistItems.length} {t('playlist.items')}</Text>
        </View>
        {playlistItems.length > 0 && (
          <GlassButton onPress={handlePlayAll} variant="primary" size="md" icon={<Play size={18} color="#fff" fill="#fff" />} title={t('playlist.playAll')} />
        )}
      </View>

      <View style={[styles.filterContainer, { flexDirection: 'row' }]}>
        {(isRTL ? [...FILTER_OPTIONS].reverse() : FILTER_OPTIONS).map((option) => (
          <Pressable key={option.id} onPress={() => setFilter(option.id)} style={[styles.filterButton, filter === option.id && styles.filterButtonActive]}>
            <Text style={[styles.filterText, filter === option.id && styles.filterTextActive]}>{t(option.labelKey)}</Text>
          </Pressable>
        ))}
      </View>

      {filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <GlassCard style={styles.emptyCard}>
            <Icon name="clipboard" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { textAlign }]}>{t('playlist.empty')}</Text>
            <Text style={[styles.emptySubtitle, { textAlign }]}>{t('playlist.emptyHint')}</Text>
          </GlassCard>
        </View>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredItems.map(item => item.id)} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: spacing.sm * 2, paddingLeft: spacing.lg, paddingRight: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.md }}>
              {filteredItems.map((item) => (
                <SortablePlaylistCard key={item.id} item={item} onPress={() => navigate(getWatchRoute(item))} onRemove={() => handleRemove(item.id)} getLocalizedText={getLocalizedText} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 40, paddingBottom: spacing.lg },
  headerIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(138, 43, 226, 0.2)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 36, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 2 },
  filterContainer: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg, gap: spacing.sm, flexWrap: 'wrap' },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.backgroundLight, borderWidth: 2, borderColor: 'transparent' },
  filterButtonActive: { backgroundColor: 'rgba(138, 43, 226, 0.2)', borderColor: colors.secondary },
  filterText: { fontSize: 14, color: colors.textMuted },
  filterTextActive: { color: colors.secondary.DEFAULT, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyCard: { padding: spacing.xxl, alignItems: 'center', gap: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: 16, color: colors.textSecondary },
});
