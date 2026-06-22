import React, { useState } from 'react';
import { View, Text, Pressable, Image, ViewStyle, Platform, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Play, Star } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';

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

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[styles.pressable, style]}
    >
      {/* Main Glass Card */}
      <View style={styles.cardContainer}>
        {/* Glass Background */}
        <LinearGradient
          colors={[
            'rgba(10, 10, 15, 0.85)',
            'rgba(15, 15, 25, 0.9)',
            'rgba(10, 10, 15, 0.85)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Thumbnail/Logo Area */}
        <View style={styles.thumbnailArea}>
          {/* Dark Background */}
          <View style={styles.darkBackground} />

          {/* Logo Display */}
          <View style={styles.logoContainer}>
            {(channel.thumbnail || channel.logo) && !imageError ? (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: channel.thumbnail || channel.logo }}
                  style={styles.channelImage}
                  resizeMode="contain"
                  onError={() => setImageError(true)}
                />
              </View>
            ) : (
              <View style={styles.placeholderIcon}>
                <Text style={styles.placeholderEmoji}>📺</Text>
              </View>
            )}
          </View>

          {/* Gradient Overlay for better text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.9)']}
            locations={[0.3, 0.7, 1]}
            style={styles.bottomGradient}
          />

          {/* Live Badge */}
          <View style={styles.liveBadgeContainer}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{liveLabel}</Text>
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
              style={[
                styles.favoriteButton,
                favoriteHovered && styles.favoriteButtonHovered,
                isFavorite && styles.favoriteButtonActive,
              ]}
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
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <LinearGradient
                  colors={['rgba(168, 85, 247, 0.95)', 'rgba(147, 51, 234, 0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Play size={24} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
              </View>
            </View>
          )}
        </View>

        {/* Channel Info Section */}
        <View style={styles.infoSection}>
          <Text
            style={[styles.channelName, isHovered && styles.channelNameHovered]}
            numberOfLines={1}
          >
            {channel.name}
          </Text>
          {channel.currentShow && (
            <Text style={styles.currentShow} numberOfLines={1}>
              {channel.currentShow}
            </Text>
          )}
        </View>

        {/* Glass Border Effect */}
        <View
          style={[
            styles.borderEffect,
            isHovered && styles.borderEffectHovered,
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  cardContainer: {
    position: 'relative',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  thumbnailArea: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  darkBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: 40,
    width: '100%',
    zIndex: 2,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  channelImage: {
    width: '80%',
    height: '80%',
  },
  placeholderIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  liveBadgeContainer: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    zIndex: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  favoriteButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  infoSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    paddingTop: spacing.sm,
    zIndex: 5,
  },
  channelName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  channelNameHovered: {
    color: colors.primary.DEFAULT,
  },
  currentShow: {
    fontSize: 11,
    color: 'rgba(156, 163, 175, 1)',
    marginTop: 2,
    textAlign: 'center',
  },
  borderEffect: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    pointerEvents: 'none',
  },
  borderEffectHovered: {
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
});
