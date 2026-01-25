/**
 * SkeletonLoader Component
 * Beautiful skeleton loading animation for better perceived performance
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { spacing } from '@olorin/design-tokens';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={styles.cardContent}>
          <SkeletonLoader width="60%" height={18} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="40%" height={14} />
        </View>
      </View>
      <SkeletonLoader width="100%" height={8} borderRadius={4} style={{ marginTop: 16 }} />
    </View>
  );
};

export const SkeletonStatCard: React.FC = () => {
  return (
    <View style={styles.statCard}>
      <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginBottom: 12 }} />
      <SkeletonLoader width="80%" height={24} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="50%" height={14} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  statCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
});
