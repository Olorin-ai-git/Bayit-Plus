/**
 * Playlist Panel Component
 * Displays the current flow playlist with navigation
 */

import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { X, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlaylistItem } from '../types/watch.types';
import { colors, spacing } from '@bayit/shared/theme';

interface PlaylistPanelProps {
  playlist: PlaylistItem[];
  playlistIndex: number;
  isRTL: boolean;
  onClose: () => void;
  onSelectItem: (index: number) => void;
}

export function PlaylistPanel({
  playlist,
  playlistIndex,
  isRTL,
  onClose,
  onSelectItem,
}: PlaylistPanelProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('watch.playlist') || 'Playlist'}</Text>
        <Pressable onPress={onClose}>
          <X size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView style={styles.scroll}>
        {playlist.map((item, index) => (
          <Pressable
            key={`${item.content_id}-${index}`}
            style={[
              styles.item,
              index === playlistIndex && styles.itemActive,
            ]}
            onPress={() => onSelectItem(index)}
          >
            <Text style={styles.itemNumber}>{index + 1}</Text>
            <View style={styles.itemInfo}>
              <Text
                style={[
                  styles.itemTitle,
                  index === playlistIndex && styles.itemTitleActive,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={styles.itemType}>{item.content_type}</Text>
            </View>
            {index === playlistIndex && (
              <View style={styles.itemPlaying}>
                <Play size={14} color={colors.primary} fill={colors.primary} />
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as any,
    top: 120,
    left: spacing.md,
    width: 300,
    maxHeight: 400,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 100,
    // @ts-ignore
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  containerRTL: {
    left: 'auto' as any,
    right: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  scroll: {
    maxHeight: 320,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  itemNumber: {
    width: 24,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    color: colors.text,
  },
  itemTitleActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  itemType: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  itemPlaying: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
