/**
 * ChannelCardMobile Component
 *
 * Touch-optimized channel card for live TV
 * Features:
 * - Responsive sizing based on device
 * - 16:9 aspect ratio for live thumbnails
 * - LIVE badge with pulsing indicator
 * - Channel number and current show info
 * - Glass morphism styling
 */

import React from 'react';
import { View, Image, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { GlassView, GlassBadge } from '@bayit/shared';
import { responsive } from '../utils/responsive';
import { typography, spacing, borderRadius, colors } from '../theme';

export interface ChannelCardMobileProps {
  /** Channel data */
  channel: {
    id: string;
    number: string;
    name: string;
    thumbnailUrl?: string;
    currentShow?: string;
    isLive?: boolean;
  };

  /** Callback when card is pressed */
  onPress: () => void;

  /** Card width (optional, auto-calculated if not provided) */
  width?: number;
}

export const ChannelCardMobile: React.FC<ChannelCardMobileProps> = ({
  channel,
  onPress,
  width,
}) => {
  // Calculate responsive card width
  const cardWidth =
    width ||
    responsive({
      phone: (Dimensions.get('window').width - spacing.md * 3) / 2,
      tablet: (Dimensions.get('window').width - spacing.md * 5) / 4,
    });

  const cardHeight = cardWidth * 0.75; // 4:3 aspect ratio for live TV

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, { width: cardWidth }]}
      android_ripple={{ color: colors.glassLight }}
    >
      <GlassView style={styles.card}>
        {/* Live thumbnail */}
        {channel.thumbnailUrl ? (
          <Image
            source={{ uri: channel.thumbnailUrl }}
            style={[styles.thumbnail, { height: cardHeight }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholder, { height: cardHeight }]}>
            <Text style={styles.placeholderIcon}>📺</Text>
          </View>
        )}

        {/* Live badge */}
        {channel.isLive !== false && (
          <View style={styles.liveBadge}>
            <GlassBadge variant="error">
              <View style={styles.liveContainer}>
                <View style={styles.liveIndicator} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </GlassBadge>
          </View>
        )}

        {/* Channel info */}
        <View style={styles.info}>
          <Text style={styles.channelNumber}>{channel.number}</Text>
          <Text style={styles.channelName} numberOfLines={1}>
            {channel.name}
          </Text>
          {channel.currentShow && (
            <Text style={styles.currentShow} numberOfLines={1}>
              {channel.currentShow}
            </Text>
          )}
        </View>
      </GlassView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    backgroundColor: colors.backgroundElevated,
  },
  placeholder: {
    width: '100%',
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    opacity: 0.3,
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
    marginRight: spacing.xs,
  },
  liveText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  info: {
    padding: spacing.sm,
  },
  channelNumber: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  channelName: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  currentShow: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
