/**
 * GlassPlaylistItem - Individual item row for the GlassPlaylist overlay.
 * Displays content thumbnail, title, type badge, and drag handle.
 * Supports isDragging visual feedback for reorder interactions.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import type { PlaylistItem } from '../../services/api/playlistServices';

interface PlaylistItemData {
  id: string;
  title: string;
  thumbnail?: string;
  type: string;
  duration?: string;
  progress?: number;
}

interface GlassPlaylistItemProps {
  item: PlaylistItemData;
  index: number;
  isDragging?: boolean;
  isActive?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

const TYPE_ICON_MAP: Record<string, string> = {
  movie: 'vod',
  series: 'vod',
  podcast: 'podcasts',
  radio: 'radio',
  live: 'live',
  channel: 'live',
};

export const GlassPlaylistItem: React.FC<GlassPlaylistItemProps> = ({
  item,
  index,
  isDragging = false,
  isActive = false,
  onPress,
  onRemove,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation for the play indicator when item is active (now playing)
  useEffect(() => {
    if (isActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [isActive, pulseAnim]);

  const iconName = TYPE_ICON_MAP[item.type] || 'discover';

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.container,
        isActive && styles.containerActive,
        isDragging && styles.containerDragging,
        isHovered && !isDragging && styles.containerHovered,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      {/* Drag Handle */}
      {Platform.OS === 'web' && (
        <View
          style={styles.dragHandle}
          testID="drag-handle"
        >
          <Text style={styles.dragHandleText}>⋮⋮</Text>
        </View>
      )}

      {/* Index Number */}
      <Text style={styles.indexNumber}>{index + 1}</Text>

      {/* Thumbnail */}
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnailFallback}>
          <NativeIcon name={iconName} size="sm" color={colors.textMuted} />
        </View>
      )}

      {/* Content Info */}
      <View style={styles.content}>
        <Text
          style={[styles.title, isActive && styles.titleActive]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <View style={styles.meta}>
          <NativeIcon name={iconName} size={12} color={colors.textMuted} />
          {!!item.duration && (
            <Text style={styles.metaText}>{item.duration}</Text>
          )}
        </View>
      </View>

      {/* Progress Indicator */}
      {item.progress !== undefined && item.progress > 0 && (
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>{item.progress}%</Text>
        </View>
      )}

      {/* Animated play indicator for now-playing item */}
      {isActive && (
        <Animated.View style={[styles.playIndicator, { opacity: pulseAnim }]}>
          <NativeIcon name="play" size={14} color={colors.primary.DEFAULT} />
        </Animated.View>
      )}

      {/* Remove button on hover */}
      {isHovered && !isDragging && onRemove && (
        <Pressable
          onPress={(e: { stopPropagation?: () => void }) => {
            e.stopPropagation?.();
            onRemove();
          }}
          style={styles.removeButton}
          accessibilityRole="button"
          accessibilityLabel="Remove from playlist"
        >
          <NativeIcon name="x" size={14} color={colors.textMuted} />
        </Pressable>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  containerActive: {
    backgroundColor: 'rgba(126, 34, 206, 0.15)',
    borderColor: 'rgba(126, 34, 206, 0.3)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.DEFAULT,
  },
  containerDragging: {
    backgroundColor: 'rgba(126, 34, 206, 0.2)',
    borderColor: colors.primary.DEFAULT,
    opacity: 0.9,
    // @ts-ignore - Web CSS
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  containerHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  // Drag handle
  dragHandle: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    // @ts-ignore - Web CSS
    cursor: 'grab',
  },
  dragHandleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: -2,
  },

  // Index
  indexNumber: {
    width: 20,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Thumbnail
  thumbnail: {
    width: 48,
    height: 28,
    borderRadius: borderRadius.sm,
  },
  thumbnailFallback: {
    width: 48,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  titleActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
  },

  // Progress badge
  progressBadge: {
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  progressText: {
    fontSize: 10,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },

  // Play indicator
  playIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Remove button
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

interface PlaylistItemRowProps {
  item: PlaylistItem;
  onRemove: (contentId: string) => void;
  onPlay: (item: { content_id: string; content_type: string; title: string }) => void;
  isDragging?: boolean;
}

export const PlaylistItemRow: React.FC<PlaylistItemRowProps> = ({
  item,
  onRemove,
  onPlay,
  isDragging = false,
}) => (
  <GlassPlaylistItem
    item={{
      id: item.content_id,
      title: item.title,
      thumbnail: item.thumbnail,
      type: item.content_type,
      duration: item.duration != null ? String(item.duration) : undefined,
    }}
    index={item.position}
    isDragging={isDragging}
    onPress={() => onPlay(item)}
    onRemove={() => onRemove(item.content_id)}
  />
);

export const PlaylistEmpty: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View style={emptyStyles.container}>
      <NativeIcon name="playlist" size={40} color={colors.textMuted} />
      <Text style={emptyStyles.text}>{t('playlist.empty')}</Text>
    </View>
  );
};

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});

export default GlassPlaylistItem;
