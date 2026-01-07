/**
 * FlowItemCard Component
 * Displays a single content item within a flow with reorder/remove controls
 * Compatible with Web, TV, and tvOS platforms
 */

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, GlassBadge } from '../ui';
import { colors, spacing, borderRadius } from '../theme';

type ContentType = 'live' | 'radio' | 'vod' | 'podcast';

interface FlowItem {
  content_id: string;
  content_type: ContentType;
  title: string;
  thumbnail?: string;
  duration_hint?: number;
  order: number;
}

interface FlowItemCardProps {
  item: FlowItem;
  index: number;
  totalItems: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  editable?: boolean;
  isRTL?: boolean;
  hasTVPreferredFocus?: boolean;
}

const CONTENT_TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  live: <Ionicons name="radio" size={14} color={colors.error} />,
  radio: <Ionicons name="headset" size={14} color={colors.success} />,
  vod: <Ionicons name="film" size={14} color={colors.primary} />,
  podcast: <Ionicons name="mic" size={14} color={colors.warning} />,
};

const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
  live: colors.error,
  radio: colors.success,
  vod: colors.primary,
  podcast: colors.warning,
};

export const FlowItemCard: React.FC<FlowItemCardProps> = ({
  item,
  index,
  totalItems,
  onMoveUp,
  onMoveDown,
  onRemove,
  editable = true,
  isRTL = false,
  hasTVPreferredFocus = false,
}) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);

  const canMoveUp = index > 0;
  const canMoveDown = index < totalItems - 1;

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getContentTypeLabel = (type: ContentType): string => {
    const labels: Record<ContentType, string> = {
      live: t('flows.contentPicker.tabs.live'),
      radio: t('flows.contentPicker.tabs.radio'),
      vod: t('flows.contentPicker.tabs.vod'),
      podcast: t('flows.contentPicker.tabs.podcast'),
    };
    return labels[type];
  };

  return (
    <GlassView
      style={[styles.container, isFocused && styles.containerFocused]}
      intensity="low"
    >
      {/* Order Number */}
      <View style={styles.orderBadge}>
        <Text style={styles.orderNumber}>{index + 1}</Text>
      </View>

      {/* Content Row */}
      <View style={[styles.content, isRTL && styles.contentRTL]}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: `${CONTENT_TYPE_COLORS[item.content_type]}20` }]}>
              {CONTENT_TYPE_ICONS[item.content_type]}
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.title, isRTL && styles.textRTL]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.meta, isRTL && styles.metaRTL]}>
            <GlassBadge
              variant={item.content_type === 'live' ? 'danger' : 'default'}
              size="sm"
            >
              <View style={styles.typeBadgeContent}>
                {CONTENT_TYPE_ICONS[item.content_type]}
                <Text style={styles.typeBadgeText}>
                  {getContentTypeLabel(item.content_type)}
                </Text>
              </View>
            </GlassBadge>
            {item.duration_hint && (
              <Text style={styles.duration}>
                {formatDuration(item.duration_hint)}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        {editable && (
          <View style={[styles.actions, isRTL && styles.actionsRTL]}>
            {/* Move Up */}
            <Pressable
              onPress={onMoveUp}
              disabled={!canMoveUp}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              // @ts-ignore - TV prop
              hasTVPreferredFocus={hasTVPreferredFocus && index === 0}
              style={({ pressed }) => [
                styles.actionButton,
                !canMoveUp && styles.actionButtonDisabled,
                pressed && styles.actionButtonPressed,
              ]}
              accessibilityLabel={t('flows.flowItems.moveUp')}
            >
              <Ionicons
                name="chevron-up"
                size={18}
                color={canMoveUp ? colors.text : colors.textMuted}
              />
            </Pressable>

            {/* Move Down */}
            <Pressable
              onPress={onMoveDown}
              disabled={!canMoveDown}
              style={({ pressed }) => [
                styles.actionButton,
                !canMoveDown && styles.actionButtonDisabled,
                pressed && styles.actionButtonPressed,
              ]}
              accessibilityLabel={t('flows.flowItems.moveDown')}
            >
              <Ionicons
                name="chevron-down"
                size={18}
                color={canMoveDown ? colors.text : colors.textMuted}
              />
            </Pressable>

            {/* Remove */}
            <Pressable
              onPress={onRemove}
              style={({ pressed }) => [
                styles.actionButton,
                styles.removeButton,
                pressed && styles.actionButtonPressed,
              ]}
              accessibilityLabel={t('flows.flowItems.remove')}
            >
              <Ionicons name="close" size={18} color={colors.error} />
            </Pressable>
          </View>
        )}
      </View>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    // @ts-ignore - Web transition
    ...(Platform.OS === 'web' && { transition: 'all 0.2s ease' }),
  },
  containerFocused: {
    borderColor: colors.primary,
    // @ts-ignore - Web shadow
    ...(Platform.OS === 'web' && { boxShadow: `0 0 0 2px ${colors.primary}40` }),
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contentRTL: {
    flexDirection: 'row-reverse',
  },
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glass,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  textRTL: {
    textAlign: 'right',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaRTL: {
    flexDirection: 'row-reverse',
  },
  typeBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  duration: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionsRTL: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web transition
    ...(Platform.OS === 'web' && { transition: 'all 0.15s ease' }),
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  removeButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
});

export default FlowItemCard;
