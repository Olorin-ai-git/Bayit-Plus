/**
 * ContentItemCard Component
 * Card for selecting content in the content picker modal
 * Compatible with Web, TV, and tvOS platforms
 */

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassBadge } from '../ui';
import { colors, spacing, borderRadius } from '../theme';
import { useTVFocus } from '../hooks/useTVFocus';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

type ContentType = 'live' | 'radio' | 'vod' | 'podcast';

interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  thumbnail?: string;
  duration?: number;
  description?: string;
  category?: string;
  isLive?: boolean;
}

interface ContentItemCardProps {
  item: ContentItem;
  isSelected: boolean;
  isAlreadyAdded: boolean;
  onToggle: () => void;
  isRTL?: boolean;
  hasTVPreferredFocus?: boolean;
}

const CONTENT_TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  live: <Ionicons name="radio" size={16} color={colors.error} />,
  radio: <Ionicons name="headset" size={16} color={colors.success} />,
  vod: <Ionicons name="film" size={16} color={colors.primary} />,
  podcast: <Ionicons name="mic" size={16} color={colors.warning} />,
};

export const ContentItemCard: React.FC<ContentItemCardProps> = ({
  item,
  isSelected,
  isAlreadyAdded,
  onToggle,
  isRTL = false,
  hasTVPreferredFocus = false,
}) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const { isFocused, handleFocus, handleBlur, focusStyle } = useTVFocus({
    styleType: 'card',
  });

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handlePress = () => {
    if (!isAlreadyAdded) {
      onToggle();
    }
  };

  // For TV mode: don't set preferred focus on already-added items
  const effectiveHasTVPreferredFocus = IS_TV_BUILD ? (hasTVPreferredFocus && !isAlreadyAdded) : false;

  return (
    <View
      style={[
        styles.container,
        isAlreadyAdded && styles.containerDisabled,
      ]}
      // @ts-ignore - Web hover events
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      // @ts-ignore - TV focus events
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <GlassCard
        onPress={handlePress}
        hasTVPreferredFocus={effectiveHasTVPreferredFocus}
        // @ts-ignore - TV prop to prevent focus on disabled items
        focusable={!isAlreadyAdded}
        style={[
          styles.card,
          // Selection state (visual checkbox filled)
          isSelected && styles.cardSelected,
          // Focus state (unified TV focus system)
          !isAlreadyAdded && focusStyle,
          // Web hover state
          (isHovered || isFocused) && !isAlreadyAdded && styles.cardHovered,
        ]}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              {CONTENT_TYPE_ICONS[item.type]}
            </View>
          )}

          {/* Selection Checkbox */}
          <View style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
            isAlreadyAdded && styles.checkboxDisabled,
          ]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            {isAlreadyAdded && <Ionicons name="checkmark" size={14} color={colors.textMuted} />}
          </View>

          {/* Live Badge */}
          {item.isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}

          {/* Already Added Overlay */}
          {isAlreadyAdded && (
            <View style={styles.alreadyAddedOverlay}>
              <Text style={styles.alreadyAddedText}>
                {t('flows.contentPicker.alreadyAdded')}
              </Text>
            </View>
          )}
        </View>

        {/* Content Info */}
        <View style={styles.info}>
          <Text
            style={[
              styles.title,
              isRTL && styles.textRTL,
              isAlreadyAdded && styles.titleDisabled,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <View style={[styles.meta, isRTL && styles.metaRTL]}>
            {/* Type Icon */}
            <View style={styles.typeIcon}>
              {CONTENT_TYPE_ICONS[item.type]}
            </View>

            {/* Duration */}
            {item.duration && (
              <Text style={styles.duration}>
                {formatDuration(item.duration)}
              </Text>
            )}

            {/* Category */}
            {item.category && (
              <Text style={styles.category} numberOfLines={1}>
                {item.category}
              </Text>
            )}
          </View>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // @ts-ignore - Web transition
    ...(Platform.OS === 'web' && { transition: 'transform 0.2s ease' }),
  },
  containerDisabled: {
    opacity: 0.6,
  },
  containerPressed: {
    transform: [{ scale: 0.98 }],
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    // @ts-ignore - Web transition
    ...(Platform.OS === 'web' && { transition: 'all 0.2s ease' }),
  },
  cardSelected: {
    borderColor: colors.primary,
    // @ts-ignore - Web shadow
    ...(Platform.OS === 'web' && { boxShadow: `0 0 12px ${colors.primary}40` }),
  },
  cardHovered: {
    borderColor: 'rgba(0, 217, 255, 0.5)',
  },
  thumbnailContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: colors.glass,
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
  checkbox: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web transition
    ...(Platform.OS === 'web' && { transition: 'all 0.15s ease' }),
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: colors.textMuted,
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  alreadyAddedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alreadyAddedText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  info: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  textRTL: {
    textAlign: 'right',
  },
  titleDisabled: {
    color: colors.textMuted,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaRTL: {
    flexDirection: 'row-reverse',
  },
  typeIcon: {
    opacity: 0.8,
  },
  duration: {
    fontSize: 11,
    color: colors.textMuted,
  },
  category: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
});

export default ContentItemCard;
