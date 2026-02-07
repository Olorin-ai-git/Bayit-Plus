import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './GlassView';
import { GlassButton } from './GlassButton';
import { GlassErrorBanner } from './GlassErrorBanner';
import { GlassReorderableList } from './GlassReorderableList';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useNavigate } from 'react-router-dom';
import { usePlaylistStore } from '../../stores/playlistStore';
import { useDirection } from '../../hooks/useDirection';
import { PlaylistItemRow, PlaylistEmpty } from './GlassPlaylistItem';
import { logger } from '../../utils/logger';

const OVERLAY_WIDTH = 380;
const ANIMATION_DURATION = 300;

export const GlassPlaylist: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();

  const isVisible = usePlaylistStore((s) => s.isVisible);
  const items = usePlaylistStore((s) => s.items);
  const isLoading = usePlaylistStore((s) => s.isLoading);
  const setVisible = usePlaylistStore((s) => s.setVisible);
  const error = usePlaylistStore((s) => s.error);
  const clearError = usePlaylistStore((s) => s.clearError);
  const removeItem = usePlaylistStore((s) => s.removeItem);
  const clearPlaylist = usePlaylistStore((s) => s.clearPlaylist);
  const fetchPlaylist = usePlaylistStore((s) => s.fetchPlaylist);
  const reorderItem = usePlaylistStore((s) => s.reorderItem);
  const setItems = usePlaylistStore((s) => s.setItems);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      fetchPlaylist();
    }
  }, [isVisible, fetchPlaylist]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, [isVisible, slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isRTL ? -OVERLAY_WIDTH : OVERLAY_WIDTH, 0],
  });

  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  const handleClose = useCallback(() => setVisible(false), [setVisible]);
  const handleClear = useCallback(() => clearPlaylist(), [clearPlaylist]);
  const handleRemoveItem = useCallback((contentId: string) => removeItem(contentId), [removeItem]);

  const handlePlayItem = useCallback((item: { content_id: string; content_type: string; title: string }) => {
    const routeMap: Record<string, string> = {
      live: `/live/${item.content_id}`,
      radio: `/radio/${item.content_id}`,
      podcast: `/podcasts/${item.content_id}`,
      series: `/vod/series/${item.content_id}`,
    };
    const destination = routeMap[item.content_type] ?? `/vod/movie/${item.content_id}`;
    logger.info('Playlist item played', 'GlassPlaylist', {
      contentId: item.content_id,
      contentType: item.content_type,
      destination,
    });
    setVisible(false);
    navigate(destination);
  }, [setVisible, navigate]);

  const handlePlayAll = useCallback(() => {
    if (items.length === 0) return;
    const first = items[0];
    const routeMap: Record<string, string> = {
      live: `/live/${first.content_id}`,
      radio: `/radio/${first.content_id}`,
      podcast: `/podcasts/${first.content_id}`,
      series: `/vod/series/${first.content_id}`,
    };
    const destination = routeMap[first.content_type] ?? `/vod/movie/${first.content_id}`;
    logger.info('Play All pressed', 'GlassPlaylist', { count: items.length });
    setVisible(false);
    navigate(destination, {
      state: {
        flowId: 'playlist-play-all',
        flowName: t('playlist.title'),
        playlist: items.map((item) => ({
          content_id: item.content_id,
          content_type: item.content_type,
          title: item.title,
          thumbnail: item.thumbnail,
        })),
        currentIndex: 0,
      },
    });
  }, [items, setVisible, navigate, t]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    const movedItem = items[fromIndex];
    if (!movedItem) return;
    // Optimistic local reorder
    const reordered = [...items];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedItem);
    setItems(reordered);
    // Persist via API
    reorderItem(movedItem.content_id, toIndex);
  }, [items, setItems, reorderItem]);

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          isRTL ? styles.panelLeft : styles.panelRight,
          { transform: [{ translateX }] },
        ]}
      >
        <GlassView intensity="high" style={styles.panelInner}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Text style={styles.titleText}>{t('playlist.title')}</Text>
            </View>
            <View style={styles.headerActions}>
              {items.length > 0 && (
                <>
                  <GlassButton
                    title={t('playlist.playAll')}
                    icon={<NativeIcon name="play" size={14} color={colors.text} />}
                    variant="primary"
                    size="sm"
                    style={styles.headerButton}
                    onPress={handlePlayAll}
                    disabled={isLoading}
                  />
                  <GlassButton
                    title={t('playlist.clear')}
                    variant="primary"
                    size="sm"
                    style={styles.headerButton}
                    onPress={handleClear}
                    disabled={isLoading}
                  />
                </>
              )}
              <Pressable
                onPress={handleClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <NativeIcon name="x" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {error && (
            <GlassErrorBanner
              message={error}
              onDismiss={clearError}
            />
          )}

          {isLoading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>{t('playlist.loading')}</Text>
            </View>
          ) : items.length === 0 ? (
            <PlaylistEmpty />
          ) : (
            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
            >
              <GlassReorderableList
                items={items}
                keyExtractor={(item) => item.content_id}
                onReorder={handleReorder}
                renderItem={(item, _index, isDragging) => (
                  <PlaylistItemRow
                    item={item}
                    onRemove={handleRemoveItem}
                    onPlay={handlePlayItem}
                    isDragging={isDragging}
                  />
                )}
              />
            </ScrollView>
          )}
        </GlassView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: OVERLAY_WIDTH,
  },
  panelRight: { right: 0 },
  panelLeft: { left: 0 },
  panelInner: {
    flex: 1,
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerButton: {
    height: 40,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
});

export default GlassPlaylist;
