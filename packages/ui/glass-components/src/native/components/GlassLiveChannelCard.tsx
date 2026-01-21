/**
 * GlassLiveChannelCard Component
 *
 * Live channel card with glassmorphic styling.
 * Shows channel thumbnail, logo, live badge, and play overlay on hover.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ViewStyle,
  Platform,
  StyleProp,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, borderRadius } from '../../theme';

export interface LiveChannelData {
  /** Channel unique identifier */
  id: string;
  /** Channel name */
  name: string;
  /** Channel thumbnail URL */
  thumbnail?: string;
  /** Channel logo URL */
  logo?: string;
  /** Currently playing show name */
  currentShow?: string;
  /** Channel category */
  category?: string;
}

export interface GlassLiveChannelCardProps {
  /** Channel data */
  channel: LiveChannelData;
  /** Press handler */
  onPress?: () => void;
  /** Live badge label text */
  liveLabel?: string;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Show favorite button on hover */
  showFavorite?: boolean;
  /** Is channel favorited */
  isFavorite?: boolean;
  /** Favorite button press handler */
  onFavoritePress?: () => void;
  /** Custom play icon */
  playIcon?: React.ReactNode;
  /** Custom favorite icon */
  favoriteIcon?: React.ReactNode;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic live channel card component
 */
export function GlassLiveChannelCard({
  channel,
  onPress,
  liveLabel = 'LIVE',
  style,
  showFavorite = false,
  isFavorite = false,
  onFavoritePress,
  playIcon,
  favoriteIcon,
  testID,
}: GlassLiveChannelCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [favoriteHovered, setFavoriteHovered] = useState(false);
  const isWeb = Platform.OS === 'web';

  // Default play icon (triangle)
  const renderPlayIcon = () => {
    if (playIcon) return playIcon;
    return '▶';
  };

  // Default favorite icon (star)
  const renderFavoriteIcon = () => {
    if (favoriteIcon) return favoriteIcon;
    return isFavorite ? '★' : '☆';
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      className="flex-1"
      style={style}
      testID={testID}
    >
      {/* Main Glass Card */}
      <View
        className="relative rounded-lg overflow-hidden"
        style={[
          { aspectRatio: 16 / 9, backgroundColor: colors.glass },
          isHovered && { transform: [{ translateY: -6 }] },
        ]}
      >
        {/* Glass Background */}
        <LinearGradient
          colors={['rgba(10, 10, 15, 0.85)', 'rgba(15, 15, 25, 0.9)', 'rgba(10, 10, 15, 0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="absolute inset-0"
        />

        {/* Thumbnail/Logo Area */}
        <View className="flex-1 relative justify-center items-center overflow-hidden">
          {/* Dark Background Pattern */}
          <View className="absolute inset-0 bg-[rgba(5,5,10,0.95)]" />

          {/* Logo Display - contained in rounded area with dark background */}
          <View
            className="flex-1 justify-center items-center w-full z-[2]"
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              paddingBottom: spacing.xl + spacing.lg,
            }}
          >
            {(channel.thumbnail || channel.logo) && !imageError ? (
              <View className="w-full h-full justify-center items-center rounded-md overflow-hidden bg-[rgba(15,15,20,0.8)]">
                <Image
                  source={{ uri: channel.thumbnail || channel.logo }}
                  className="w-4/5 h-4/5"
                  resizeMode="contain"
                  onError={() => setImageError(true)}
                />
              </View>
            ) : (
              <View className="w-[72px] h-[72px] rounded-full bg-[rgba(107,33,168,0.3)] justify-center items-center">
                <Text className="text-[32px]">📺</Text>
              </View>
            )}
          </View>

          {/* Gradient Overlay for better text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.9)']}
            locations={[0.3, 0.7, 1]}
            className="absolute left-0 right-0 bottom-0 h-1/2"
          />

          {/* Live Badge with Pulse Animation */}
          <View className="absolute z-10" style={{ top: spacing.sm, left: spacing.sm }}>
            <View className="flex-row items-center gap-[6px] px-[10px] py-[5px] rounded-sm bg-[rgba(239,68,68,0.95)]">
              {/* Use CSS class for web animation, style for native */}
              <View
                className="w-[6px] h-[6px] rounded-full bg-white"
                // @ts-expect-error - web-only className for CSS animation
                {...(isWeb && { className: 'live-pulse-dot' })}
              />
              <Text className="text-[10px] font-bold text-white tracking-wider uppercase">
                {liveLabel}
              </Text>
            </View>
          </View>

          {/* Favorite Button on Hover */}
          {showFavorite && isHovered && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onFavoritePress?.();
              }}
              onHoverIn={() => setFavoriteHovered(true)}
              onHoverOut={() => setFavoriteHovered(false)}
              className="absolute z-10 w-8 h-8 rounded-full bg-black/60 justify-center items-center"
              style={[
                { top: spacing.sm, right: spacing.sm },
                favoriteHovered && { backgroundColor: 'rgba(255, 255, 255, 0.25)', transform: [{ scale: 1.1 }] },
                isFavorite && { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
              ]}
            >
              <Text className="text-base" style={{ color: colors.warning }}>
                {renderFavoriteIcon()}
              </Text>
            </Pressable>
          )}

          {/* Play Overlay on Hover */}
          {isHovered && (
            <View className="absolute inset-0 justify-center items-center bg-black/30">
              <View className="w-14 h-14 rounded-full justify-center items-center overflow-hidden">
                <LinearGradient
                  colors={['rgba(168, 85, 247, 0.95)', 'rgba(147, 51, 234, 0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="absolute inset-0"
                />
                <Text className="text-2xl ml-1" style={{ color: colors.text }}>
                  {renderPlayIcon()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Channel Info Section */}
        <View
          className="absolute left-0 right-0 bottom-0 z-[5]"
          style={{
            paddingHorizontal: spacing.sm,
            paddingBottom: spacing.sm,
            paddingTop: spacing.md,
          }}
        >
          <Text
            className="text-sm font-semibold text-center"
            style={{ color: isHovered ? colors.primary : colors.text }}
            numberOfLines={1}
          >
            {channel.name}
          </Text>
          {channel.currentShow && (
            <Text
              className="text-[11px] text-center mt-0.5"
              style={{ color: colors.textSecondary }}
              numberOfLines={1}
            >
              {channel.currentShow}
            </Text>
          )}
        </View>

        {/* Glass Border Effect */}
        <View
          className="absolute inset-0 rounded-lg border"
          style={{
            borderColor: isHovered ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.08)',
          }}
        />
      </View>
    </Pressable>
  );
}

export default GlassLiveChannelCard;
