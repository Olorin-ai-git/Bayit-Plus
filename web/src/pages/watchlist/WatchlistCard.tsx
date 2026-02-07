/**
 * Sortable Playlist Card Component
 * Draggable card for playlist items with hover effects and DnD support
 */

import React, { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, X, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@/hooks/useDirection';
import type { PlaylistPageItem } from './types';
import { getTypeIconName } from './helpers';

interface SortablePlaylistCardProps {
  item: PlaylistPageItem;
  onPress: () => void;
  onRemove: () => void;
  getLocalizedText: (item: any, field: string) => string;
}

export function SortablePlaylistCard({
  item,
  onPress,
  onRemove,
  getLocalizedText,
}: SortablePlaylistCardProps) {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const [isHovered, setIsHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'default' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <View style={[styles.card, isHovered && styles.cardHovered]}>
        <Pressable onPress={onPress}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.cardImage} />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <NativeIcon name="discover" size="xl" color={colors.textMuted} />
            </View>
          )}
        </Pressable>

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
            {item.year}{item.year && item.duration ? ' \u2022 ' : ''}{item.duration}
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

        <div
          {...attributes}
          {...listeners}
          style={{
            position: 'absolute',
            top: 8,
            [isRTL ? 'right' : 'left']: 8,
            cursor: 'grab',
            padding: 4,
            borderRadius: 4,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: isHovered ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
          }}
          title={t('playlist.dragToReorder')}
        >
          <GripVertical size={16} color="#ffffff" />
        </div>
      </View>
    </div>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.backgroundLight, borderRadius: borderRadius.lg, overflow: 'visible' as any, borderWidth: 3, borderColor: 'transparent', position: 'relative' },
  cardHovered: { borderColor: colors.secondary.DEFAULT, transform: [{ scale: 1.05 }] },
  cardImage: { width: '100%', aspectRatio: 16 / 9 },
  cardImagePlaceholder: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.backgroundLighter, justifyContent: 'center', alignItems: 'center' },
  progressContainer: { position: 'absolute', bottom: 52, left: 0, right: 0, height: 4, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  progressBar: { height: '100%', backgroundColor: colors.secondary },
  typeBadge: { position: 'absolute', top: 8, backgroundColor: 'rgba(0, 0, 0, 0.7)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  cardContent: { padding: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  progressText: { fontSize: 11, color: colors.secondary.DEFAULT, marginTop: 2, fontWeight: '600' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' },
  overlayButtons: { flexDirection: 'row', gap: spacing.md },
  playButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.secondary.DEFAULT, justifyContent: 'center', alignItems: 'center' },
  removeButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
});
