import React, { useEffect, useRef } from 'react';
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
import { GlassBadge } from './GlassBadge';
import { GlassErrorBanner } from './GlassErrorBanner';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { usePlaylistStore } from '../../stores/playlistStore';
import { useDirection } from '../../hooks/useDirection';
import { PlaylistItemRow, PlaylistEmpty } from './GlassPlaylistItem';

const OVERLAY_WIDTH = 380;
const ANIMATION_DURATION = 300;

export const GlassPlaylist: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const isVisible = usePlaylistStore((s) => s.isVisible);
  const items = usePlaylistStore((s) => s.items);
  const isLoading = usePlaylistStore((s) => s.isLoading);
  const setVisible = usePlaylistStore((s) => s.setVisible);
  const error = usePlaylistStore((s) => s.error);
  const clearError = usePlaylistStore((s) => s.clearError);
  const removeItem = usePlaylistStore((s) => s.removeItem);
  const clearPlaylist = usePlaylistStore((s) => s.clearPlaylist);

  const slideAnim = useRef(new Animated.Value(0)).current;

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

  if (!isVisible) return null;

  const handleClose = () => setVisible(false);
  const handleClear = () => clearPlaylist();
  const handleRemoveItem = (contentId: string) => removeItem(contentId);

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
              <GlassBadge label={String(items.length)} />
            </View>
            <View style={styles.headerActions}>
              {items.length > 0 && (
                <GlassButton
                  title={t('playlist.clear')}
                  variant="ghost"
                  size="sm"
                  onPress={handleClear}
                  disabled={isLoading}
                />
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

          {items.length === 0 ? (
            <PlaylistEmpty />
          ) : (
            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item) => (
                <PlaylistItemRow
                  key={item.content_id}
                  item={item}
                  onRemove={handleRemoveItem}
                />
              ))}
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
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
});

export default GlassPlaylist;
