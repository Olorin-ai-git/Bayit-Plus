import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ViewStyle, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Play, Star } from 'lucide-react';
import { colors, spacing, borderRadius } from '../theme';

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
      style={[styles.container, style]}
    >
      {/* Main Glass Card */}
      <View style={[styles.card, isHovered && styles.cardHovered]}>
        {/* Glass Background */}
        <LinearGradient
          colors={[
            'rgba(10, 10, 15, 0.85)',
            'rgba(15, 15, 25, 0.9)',
            'rgba(10, 10, 15, 0.85)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.background}
        />

        {/* Thumbnail/Logo Area */}
        <View style={styles.thumbnailContainer}>
          {/* Dark Background Pattern */}
          <View style={styles.logoBackground} />

          {/* Logo Display - contained in rounded area with dark background */}
          <View style={styles.logoWrapper}>
            {(channel.thumbnail || channel.logo) && !imageError ? (
              <View style={styles.logoInner}>
                <Image
                  source={{ uri: channel.thumbnail || channel.logo }}
                  style={styles.logo}
                  resizeMode="contain"
                  onError={() => setImageError(true)}
                />
              </View>
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoEmoji}>📺</Text>
              </View>
            )}
          </View>

          {/* Gradient Overlay for better text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.9)']}
            locations={[0.3, 0.7, 1]}
            style={styles.gradientOverlay}
          />

          {/* Live Badge with Pulse Animation */}
          <View style={styles.liveBadgeContainer}>
            <View style={[styles.liveBadge, isWeb && styles.liveBadgeWeb]}>
              {/* Use CSS class for web animation, style for native */}
              <View
                style={styles.livePulse}
                // @ts-ignore - web-only className for CSS animation
                className={isWeb ? 'live-pulse-dot' : undefined}
              />
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
                color={isFavorite ? colors.warning : colors.text}
                fill={isFavorite ? colors.warning : 'transparent'}
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
                  style={styles.playButtonGradient}
                />
                <Play size={24} color={colors.text} fill={colors.text} style={styles.playIcon} />
              </View>
            </View>
          )}
        </View>

        {/* Channel Info Section */}
        <View style={styles.info}>
          <Text style={[styles.channelName, isHovered && styles.channelNameHovered]} numberOfLines={1}>
            {channel.name}
          </Text>
          {channel.currentShow && (
            <Text style={styles.currentShow} numberOfLines={1}>
              {channel.currentShow}
            </Text>
          )}
        </View>

        {/* Glass Border Effect */}
        <View style={[styles.borderGlass, isHovered && styles.borderGlassHovered]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    position: 'relative',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.glass,
    // @ts-ignore - Web transition
    transition: 'all 0.2s ease',
  },
  cardHovered: {
    // @ts-ignore - Web transform
    transform: [{ translateY: -6 }],
    // @ts-ignore - Web shadow
    boxShadow: '0 12px 40px rgba(107, 33, 168, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  thumbnailContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 10, 0.95)',
  },
  logoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl + spacing.lg, // Extra padding for info section
    width: '100%',
    zIndex: 2,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 15, 20, 0.8)',
    // @ts-ignore - Web backdrop filter
    backdropFilter: 'blur(4px)',
  },
  logo: {
    width: '80%',
    height: '80%',
  },
  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web backdrop filter
    backdropFilter: 'blur(8px)',
  },
  logoEmoji: {
    fontSize: 32,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  liveBadgeContainer: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    // @ts-ignore - Web backdrop filter
    backdropFilter: 'blur(8px)',
  },
  liveBadgeWeb: {
    // @ts-ignore - Web animation
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  // Note: Web animation handled via CSS className 'live-pulse-dot' in globals.css
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    // @ts-ignore - Web backdrop filter
    backdropFilter: 'blur(8px)',
    // @ts-ignore - Web transition
    transition: 'all 0.2s ease',
  },
  favoriteButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    // @ts-ignore - Web transform
    transform: [{ scale: 1.1 }],
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
    // @ts-ignore - Web backdrop filter and shadow
    backdropFilter: 'blur(8px)',
    boxShadow: '0 0 24px rgba(168, 85, 247, 0.5)',
  },
  playButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  playIcon: {
    marginLeft: 2,
  },
  info: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
    zIndex: 5,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    // @ts-ignore - Web text shadow
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
    // @ts-ignore - Web transition
    transition: 'color 0.2s ease',
  },
  channelNameHovered: {
    color: colors.primary,
  },
  currentShow: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
    // @ts-ignore - Web text shadow
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  },
  borderGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    // @ts-ignore
    pointerEvents: 'none',
    // @ts-ignore - Web transition
    transition: 'border-color 0.2s ease',
  },
  borderGlassHovered: {
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
});
