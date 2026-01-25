/**
 * GlassSkeleton Components
 *
 * Glassmorphic skeleton loading placeholders with shimmer animation
 * Includes pre-built skeletons for common content types
 *
 * @module GlassSkeleton
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface GlassSkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  animate?: boolean;
}

/**
 * Base skeleton component with optional shimmer animation
 */
export function GlassSkeleton({
  width = '100%',
  height = 20,
  borderRadius: radius = borderRadius.md,
  style,
  animate = true,
}: GlassSkeletonProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!animate) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animate, animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: radius,
          opacity: animate ? opacity : 0.3,
        },
        style,
      ]}
    />
  );
}

/**
 * Content card skeleton (for movie/series/podcast cards)
 */
export function ContentCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.contentCardSkeleton, style]}>
      <GlassSkeleton style={styles.thumbnailSkeleton} />
      <GlassSkeleton width="80%" height={16} style={styles.titleSkeleton} />
      <GlassSkeleton width="60%" height={12} style={styles.subtitleSkeleton} />
    </View>
  );
}

/**
 * Row skeleton (for carousel rows)
 */
export function RowSkeleton({ numCards = 5 }: { numCards?: number }) {
  return (
    <View style={styles.rowSkeleton}>
      <GlassSkeleton width={150} height={28} style={styles.rowTitleSkeleton} />
      <View style={styles.cardsRow}>
        {Array.from({ length: numCards }).map((_, index) => (
          <ContentCardSkeleton key={index} style={styles.rowCard} />
        ))}
      </View>
    </View>
  );
}

/**
 * List item skeleton (for list views)
 */
export function ListItemSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.listItemSkeleton, style]}>
      <GlassSkeleton width={120} style={styles.listThumbnail} />
      <View style={styles.listContent}>
        <GlassSkeleton width="70%" height={18} style={styles.listTitle} />
        <GlassSkeleton width="50%" height={14} style={styles.listSubtitle} />
        <GlassSkeleton width="40%" height={12} style={styles.listMeta} />
      </View>
    </View>
  );
}

/**
 * Grid skeleton (for grid layouts)
 */
export function GridSkeleton({
  numColumns = 4,
  numRows = 3,
  style,
}: {
  numColumns?: number;
  numRows?: number;
  style?: ViewStyle;
}) {
  const totalCards = numColumns * numRows;

  return (
    <View style={[styles.gridSkeleton, style]}>
      {Array.from({ length: totalCards }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.gridCard,
            { width: `${100 / numColumns - 2}%` },
          ]}
        >
          <ContentCardSkeleton />
        </View>
      ))}
    </View>
  );
}

/**
 * Hero carousel skeleton
 */
export function HeroCarouselSkeleton({ height = 600 }: { height?: number }) {
  return (
    <View style={[styles.heroSkeleton, { height }]}>
      <GlassSkeleton
        width="100%"
        height="100%"
        borderRadius={borderRadius['2xl']}
        style={styles.heroPlaceholder}
      />
      <View style={styles.heroOverlay}>
        <GlassSkeleton width={200} height={32} style={styles.heroTitle} />
        <GlassSkeleton width={150} height={20} style={styles.heroSubtitle} />
      </View>
    </View>
  );
}

/**
 * Page header skeleton
 */
export function PageHeaderSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.pageHeaderSkeleton, style]}>
      <GlassSkeleton
        width={48}
        height={48}
        borderRadius={borderRadius.full}
        style={styles.headerIcon}
      />
      <GlassSkeleton width={180} height={32} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  // Content Card Skeleton
  contentCardSkeleton: {
    flex: 1,
  },
  thumbnailSkeleton: {
    aspectRatio: 16 / 9,
    marginBottom: spacing.sm,
  },
  titleSkeleton: {
    marginBottom: spacing.xs,
  },
  subtitleSkeleton: {
    marginBottom: spacing.xs,
  },

  // Row Skeleton
  rowSkeleton: {
    marginBottom: spacing.xl,
  },
  rowTitleSkeleton: {
    marginBottom: spacing.md,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowCard: {
    width: 200,
  },

  // List Item Skeleton
  listItemSkeleton: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  listThumbnail: {
    height: 80,
    borderRadius: borderRadius.md,
  },
  listContent: {
    flex: 1,
    justifyContent: 'center',
  },
  listTitle: {
    marginBottom: spacing.sm,
  },
  listSubtitle: {
    marginBottom: spacing.xs,
  },
  listMeta: {},

  // Grid Skeleton
  gridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridCard: {
    padding: spacing.xs,
  },

  // Hero Carousel Skeleton
  heroSkeleton: {
    position: 'relative',
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  heroPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    gap: spacing.sm,
  },
  heroTitle: {
    marginBottom: spacing.xs,
  },
  heroSubtitle: {},

  // Page Header Skeleton
  pageHeaderSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    flexShrink: 0,
  },
});
