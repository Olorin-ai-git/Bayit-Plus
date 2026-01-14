/**
 * ContentCardMobile Component
 *
 * Touch-optimized content card for VOD, movies, shows
 * Features:
 * - Responsive sizing based on device
 * - 2:3 aspect ratio for posters
 * - Play overlay button
 * - Glass morphism styling
 * - Touch feedback
 */

import React from 'react';
import { View, Image, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { GlassView } from '@bayit/shared';
import { responsive } from '../utils/responsive';
import { typography, spacing, borderRadius, colors } from '../theme';

export interface ContentCardMobileProps {
  /** Content item to display */
  content: {
    id: string;
    title: string;
    posterUrl?: string;
    year?: number;
    rating?: number;
    duration?: number;
  };

  /** Callback when card is pressed */
  onPress: () => void;

  /** Card width (optional, auto-calculated if not provided) */
  width?: number;
}

export const ContentCardMobile: React.FC<ContentCardMobileProps> = ({
  content,
  onPress,
  width,
}) => {
  // Calculate responsive card width if not provided
  const cardWidth =
    width ||
    responsive({
      phone: (Dimensions.get('window').width - spacing.sm * 3) / 2, // Larger cards with reduced spacing
      tablet: (Dimensions.get('window').width - spacing.md * 5) / 4,
    });

  const cardHeight = cardWidth * 1.55; // Slightly taller for better poster visibility

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, { width: cardWidth }]}
      android_ripple={{ color: colors.glassLight }}
    >
      <GlassView style={styles.card}>
        {/* Poster image */}
        {content.posterUrl ? (
          <Image
            source={{ uri: content.posterUrl }}
            style={[styles.poster, { height: cardHeight }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholder, { height: cardHeight }]}>
            <Text style={styles.placeholderIcon}>🎬</Text>
          </View>
        )}

        {/* Content info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {content.title}
          </Text>
          <View style={styles.metadata}>
            {content.year && (
              <Text style={styles.meta}>{content.year}</Text>
            )}
            {content.rating && typeof content.rating === 'number' && (
              <>
                <Text style={styles.metaDivider}>•</Text>
                <Text style={styles.meta}>⭐ {content.rating.toFixed(1)}</Text>
              </>
            )}
            {content.duration && (
              <>
                <Text style={styles.metaDivider}>•</Text>
                <Text style={styles.meta}>{Math.floor(content.duration / 60)}m</Text>
              </>
            )}
          </View>
        </View>

        {/* Play overlay */}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
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
  poster: {
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
  info: {
    padding: spacing.md,
  },
  title: {
    ...typography.body,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  meta: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  metaDivider: {
    ...typography.caption,
    color: colors.textTertiary,
    marginHorizontal: spacing.xs,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(168, 85, 247, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: colors.text,
    marginLeft: 2, // Optical alignment
  },
});
