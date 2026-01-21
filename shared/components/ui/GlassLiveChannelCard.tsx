import React, { useState } from 'react';
import { View, Text, Pressable, Image, ViewStyle, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Play, Star } from 'lucide-react';

interface GlassLiveChannelCardProps {
  channel: {
    id: string;
    name: string;
    thumbnail?: string;
    logo?: string;
    currentShow?: string;
    category?: string;
  };
  onPress?: () => void;
  liveLabel?: string;
  style?: ViewStyle;
  showFavorite?: boolean;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
}

export function GlassLiveChannelCard({
  channel,
  onPress,
  liveLabel = 'LIVE',
  style,
  showFavorite = false,
  isFavorite = false,
  onFavoritePress,
}: GlassLiveChannelCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [favoriteHovered, setFavoriteHovered] = useState(false);
  const isWeb = Platform.OS === 'web';

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      className="flex-1"
      style={style}
    >
      {/* Main Glass Card */}
      <View className="relative aspect-video rounded-lg overflow-hidden bg-black/20">
        {/* Glass Background */}
        <LinearGradient
          colors={[
            'rgba(10, 10, 15, 0.85)',
            'rgba(15, 15, 25, 0.9)',
            'rgba(10, 10, 15, 0.85)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="absolute inset-0"
        />

        {/* Thumbnail/Logo Area */}
        <View className="flex-1 relative justify-center items-center overflow-hidden">
          {/* Dark Background Pattern */}
          <View className="absolute inset-0 bg-black/95" />

          {/* Logo Display - contained in rounded area with dark background */}
          <View className="flex-1 justify-center items-center px-3 py-3 pb-10 w-full z-[2]">
            {(channel.thumbnail || channel.logo) && !imageError ? (
              <View className="w-full h-full justify-center items-center rounded-md overflow-hidden bg-black/80">
                <Image
                  source={{ uri: channel.thumbnail || channel.logo }}
                  className="w-4/5 h-4/5"
                  resizeMode="contain"
                  onError={() => setImageError(true)}
                />
              </View>
            ) : (
              <View className="w-18 h-18 rounded-full bg-purple-600/30 justify-center items-center backdrop-blur-lg">
                <Text className="text-3xl">📺</Text>
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
          <View className="absolute top-2 left-2 z-10">
            <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-sm bg-red-500/95 backdrop-blur-lg">
              {/* Use CSS class for web animation, style for native */}
              <View
                className="w-1.5 h-1.5 rounded-full bg-white"
                // @ts-ignore - web-only className for CSS animation
                {...(isWeb ? { className: 'live-pulse-dot w-1.5 h-1.5 rounded-full bg-white' } : {})}
              />
              <Text className="text-[10px] font-bold text-white tracking-wider uppercase">{liveLabel}</Text>
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
              className={`absolute top-2 right-2 w-8 h-8 rounded-full justify-center items-center z-10 backdrop-blur-lg ${
                favoriteHovered ? 'bg-white/25' : 'bg-black/60'
              } ${isFavorite ? 'bg-white/15' : ''}`}
            >
              <Star
                size={16}
                color={isFavorite ? '#fbbf24' : '#fff'}
                fill={isFavorite ? '#fbbf24' : 'transparent'}
              />
            </Pressable>
          )}

          {/* Play Overlay on Hover */}
          {isHovered && (
            <View className="absolute inset-0 justify-center items-center bg-black/30">
              <View className="w-14 h-14 rounded-full justify-center items-center overflow-hidden backdrop-blur-lg">
                <LinearGradient
                  colors={['rgba(168, 85, 247, 0.95)', 'rgba(147, 51, 234, 0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="absolute inset-0"
                />
                <Play size={24} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
              </View>
            </View>
          )}
        </View>

        {/* Channel Info Section */}
        <View className="absolute left-0 right-0 bottom-0 px-2 pb-2 pt-3 z-[5]">
          <Text className={`text-sm font-semibold text-white text-center ${isHovered ? 'text-purple-500' : ''}`} numberOfLines={1}>
            {channel.name}
          </Text>
          {channel.currentShow && (
            <Text className="text-[11px] text-gray-400 mt-0.5 text-center" numberOfLines={1}>
              {channel.currentShow}
            </Text>
          )}
        </View>

        {/* Glass Border Effect */}
        <View className={`absolute inset-0 rounded-lg border pointer-events-none ${isHovered ? 'border-purple-500/30' : 'border-white/[0.08]'}`} />
      </View>
    </Pressable>
  );
}
