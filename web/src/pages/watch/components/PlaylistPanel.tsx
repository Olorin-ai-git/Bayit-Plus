/**
 * Playlist Panel Component
 * Displays the current flow playlist with navigation
 */

import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { X, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlaylistItem } from '../types/watch.types';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';

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
    <View style={[styles.panel, isRTL ? styles.panelRight : styles.panelLeft]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('watch.playlist') || 'Playlist'}</Text>
        <Pressable onPress={onClose}>
          <X size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView style={styles.scrollView}>
        {playlist.map((item, index) => (
          <Pressable
            key={`${item.content_id}-${index}`}
            style={[styles.playlistItem, index === playlistIndex && styles.itemActive]}
            onPress={() => onSelectItem(index)}
          >
            <Text style={styles.itemNumber}>{index + 1}</Text>
            <View style={styles.itemContent}>
              <Text
                style={[
                  styles.itemTitle,
                  index === playlistIndex ? styles.textActive : styles.textInactive,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={styles.itemType}>{item.content_type}</Text>
            </View>
            {index === playlistIndex && (
              <View style={styles.playIcon}>
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
  panel: {
    position: 'absolute',
    top: 120,
    width: 300,
    maxHeight: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 100,
  },
  panelLeft: {
    left: spacing.md,
  },
  panelRight: {
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
  headerTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  scrollView: {
    maxHeight: 320,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  itemNumber: {
    width: 24,
    fontSize: fontSize.xs,
    color: 'rgba(156, 163, 175, 1)',
    textAlign: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: fontSize.sm,
  },
  textActive: {
    color: '#22c55e',
    fontWeight: '600',
  },
  textInactive: {
    color: colors.text,
  },
  itemType: {
    fontSize: 11,
    color: 'rgba(156, 163, 175, 1)',
    textTransform: 'capitalize',
  },
  playIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
