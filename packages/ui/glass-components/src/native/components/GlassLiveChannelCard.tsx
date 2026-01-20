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
  StyleSheet,
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
    return <Text style={styles.playIconText}>▶</Text>;
  };

  // Default favorite icon (star)
  const renderFavoriteIcon = () => {
    if (favoriteIcon) return favoriteIcon;
    return <Text style={styles.favoriteIconText}>{isFavorite ? '★' : '☆'}</Text>;
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[styles.container, style]}
      testID={testID}
    >
      {/* Main Glass Card */}
      <View style={[styles.card, isHovered && styles.cardHovered]}>
        {/* Glass Background */}
        <LinearGradient
          colors={['rgba(10, 10, 15, 0.85)', 'rgba(15, 15, 25, 0.9)', 'rgba(10, 10, 15, 0.85)']}
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
                // @ts-expect-error - web-only className for CSS animation
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
              {renderFavoriteIcon()}
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
                {renderPlayIcon()}
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
  },
  cardHovered: {
    transform: [{ translateY: -6 }],
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
  },
  liveBadgeWeb: {},
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
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
  },
  favoriteButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    transform: [{ scale: 1.1 }],
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  favoriteIconText: {
    fontSize: 16,
    color: colors.warning,
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
  playButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  playIconText: {
    fontSize: 24,
    color: colors.text,
    marginLeft: 4,
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
  },
  channelNameHovered: {
    color: colors.primary,
  },
  currentShow: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  borderGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  borderGlassHovered: {
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
});

export default GlassLiveChannelCard;
