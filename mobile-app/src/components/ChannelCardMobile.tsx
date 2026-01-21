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
import { View, Image, Text, Pressable, Dimensions } from 'react-native';
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
      className="mb-4"
      style={{ width: cardWidth }}
      android_ripple={{ color: colors.glassLight }}
    >
      <GlassView className="rounded-lg overflow-hidden">
        {/* Live thumbnail */}
        {channel.thumbnailUrl ? (
          <Image
            source={{ uri: channel.thumbnailUrl }}
            className="w-full"
            style={{ height: cardHeight, backgroundColor: colors.backgroundElevated }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full justify-center items-center" style={{ height: cardHeight, backgroundColor: colors.backgroundElevated }}>
            <Text className="text-5xl opacity-30">📺</Text>
          </View>
        )}

        {/* Live badge */}
        {channel.isLive !== false && (
          <View className="absolute top-2 right-2">
            <GlassBadge variant="error">
              <View className="flex-row items-center px-1 py-0.5">
                <View className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: colors.error }} />
                <Text className="text-[10px] text-white font-bold tracking-wide">LIVE</Text>
              </View>
            </GlassBadge>
          </View>
        )}

        {/* Channel info */}
        <View className="p-2">
          <Text className="text-xs font-bold mb-0.5" style={{ color: colors.primary }}>{channel.number}</Text>
          <Text className="text-sm font-semibold text-white mb-0.5" numberOfLines={1}>
            {channel.name}
          </Text>
          {channel.currentShow && (
            <Text className="text-xs text-gray-400" numberOfLines={1}>
              {channel.currentShow}
            </Text>
          )}
        </View>
      </GlassView>
    </Pressable>
  );
};
