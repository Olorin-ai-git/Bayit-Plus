import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface PlaylistItemRowProps {
  item: {
    content_id: string;
    content_type: string;
    title: string;
    thumbnail?: string;
  };
  onRemove: (contentId: string) => void;
  onPlay: (item: PlaylistItemRowProps['item']) => void;
}

export const PlaylistItemRow: React.FC<PlaylistItemRowProps> = ({
  item,
  onRemove,
  onPlay,
}) => {
  const { t } = useTranslation();

  const handleRemove = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onRemove(item.content_id);
  };

  return (
    <Pressable
      onPress={() => onPlay(item)}
      style={styles.itemRow}
      accessibilityRole="button"
      accessibilityLabel={t('playlist.playItem', { title: item.title })}
    >
      <View style={styles.playIconContainer}>
        <NativeIcon name="play" size={14} color={colors.primary} />
      </View>
      <View style={styles.itemThumbnail}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <NativeIcon name="vod" size={18} color={colors.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemType}>
          {t(`contentTypes.${item.content_type}`, item.content_type)}
        </Text>
      </View>
      <Pressable
        onPress={handleRemove}
        style={styles.removeButton}
        accessibilityRole="button"
        accessibilityLabel={t('playlist.removeItem')}
      >
        <NativeIcon name="x" size={16} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
};

export const PlaylistEmpty: React.FC = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.emptyState}>
      <NativeIcon name="music" size={48} color={colors.textMuted} />
      <Text style={styles.emptyText}>{t('playlist.empty')}</Text>
      <Text style={styles.emptyHint}>{t('playlist.emptyHint')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
    gap: spacing.sm,
  },
  playIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemThumbnail: {
    width: 56,
    height: 40,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%' as any,
    height: '100%' as any,
  },
  thumbnailPlaceholder: {
    width: '100%' as any,
    height: '100%' as any,
    backgroundColor: colors.glassMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemType: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    padding: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default PlaylistItemRow;
