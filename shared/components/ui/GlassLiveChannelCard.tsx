import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, borderRadius, shadows } from '../theme';

interface GlassLiveChannelCardProps {
  channel: {
    id: string;
    name: string;
    thumbnail?: string;
    logo?: string;
    currentShow?: string;
  };
  onPress?: () => void;
  liveLabel?: string;
  style?: ViewStyle;
}

export function GlassLiveChannelCard({
  channel,
  onPress,
  liveLabel = 'LIVE',
  style,
}: GlassLiveChannelCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[styles.container, style]}
    >
      {/* Main Glass Card */}
      <View style={[styles.card, isHovered && styles.cardHovered]}>
        {/* Background with gradient */}
        <LinearGradient
          colors={[
            'rgba(15, 15, 25, 0.95)',
            'rgba(20, 20, 35, 0.9)',
            'rgba(15, 15, 25, 0.95)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.background}
        />

        {/* Glow effect on hover */}
        {isHovered && (
          <View style={styles.glowContainer}>
            <LinearGradient
              colors={[
                'rgba(168, 85, 247, 0.4)',
                'rgba(147, 51, 234, 0.3)',
                'rgba(236, 72, 153, 0.3)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glow}
            />
          </View>
        )}

        {/* Content Container */}
        <View style={styles.content}>
          {/* Channel Logo/Thumbnail */}
          <View style={styles.logoContainer}>
            {channel.thumbnail && !imageError ? (
              <Image
                source={{ uri: channel.thumbnail }}
                style={styles.logo}
                resizeMode="contain"
                onError={() => setImageError(true)}
              />
            ) : channel.logo && !imageError ? (
              <Image
                source={{ uri: channel.logo }}
                style={styles.logo}
                resizeMode="contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoEmoji}>📺</Text>
              </View>
            )}

            {/* Animated corner accent */}
            <View style={styles.cornerAccent} />
          </View>

          {/* Channel Info */}
          <View style={styles.info}>
            <Text style={styles.channelName} numberOfLines={1}>
              {channel.name}
            </Text>
            {channel.currentShow && (
              <Text style={styles.currentShow} numberOfLines={1}>
                {channel.currentShow}
              </Text>
            )}
          </View>

          {/* Live Badge - Circular Style */}
          <View style={styles.liveBadgeContainer}>
            <View style={styles.liveBadge}>
              <View style={styles.livePulse} />
              <Text style={styles.liveText}>{liveLabel}</Text>
            </View>
          </View>

          {/* Play Button on Hover */}
          {isHovered && (
            <View style={styles.playButtonContainer}>
              <View style={styles.playButton}>
                <LinearGradient
                  colors={['rgba(168, 85, 247, 1)', 'rgba(147, 51, 234, 1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.playButtonGradient}
                />
                <View style={styles.playIconTriangle} />
              </View>
            </View>
          )}
        </View>

        {/* Glass border effect */}
        <View style={styles.borderGlass} />
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
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    // @ts-ignore
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  cardHovered: {
    // @ts-ignore
    transform: [{ scale: 1.05 }],
    boxShadow: '0 20px 60px rgba(168, 85, 247, 0.6), 0 0 40px rgba(147, 51, 234, 0.2)',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.xl,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    padding: 2,
    borderRadius: borderRadius.xl,
  },
  glow: {
    flex: 1,
    borderRadius: borderRadius.xl,
    opacity: 0.6,
    // @ts-ignore
    filter: 'blur(20px)',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  logo: {
    width: 180,
    height: 100,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    backdropFilter: 'blur(10px)',
  },
  logoEmoji: {
    fontSize: 40,
  },
  cornerAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    borderTopRightRadius: borderRadius.xl,
    backgroundColor: 'rgba(107, 33, 168, 0.1)',
    // @ts-ignore
    transform: [{ rotate: '45deg' }],
  },
  info: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  channelName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)',
  },
  currentShow: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    opacity: 0.8,
  },
  liveBadgeContainer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    // @ts-ignore
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.7)',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  playButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    boxShadow: '0 8px 32px rgba(168, 85, 247, 0.6)',
  },
  playButtonGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
  },
  playIconTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 0,
    borderBottomWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: '#fff',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
    marginLeft: 4,
  },
  borderGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    pointerEvents: 'none',
  },
});
