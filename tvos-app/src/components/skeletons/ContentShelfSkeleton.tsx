/**
 * ContentShelfSkeleton - Loading placeholder for ContentShelf
 *
 * Displays skeleton cards that match the content shelf layout
 * with subtle shimmer animation effect.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { config } from '../../config/appConfig';

export const ContentShelfSkeleton: React.FC = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <View style={styles.container}>
      {/* Title skeleton */}
      <View style={styles.titleContainer}>
        <Animated.View style={[styles.titleSkeleton, { opacity }]} />
      </View>

      {/* Card skeletons */}
      <View style={styles.cardRow}>
        {[1, 2, 3, 4, 5].map((index) => (
          <Animated.View key={index} style={[styles.cardSkeleton, { opacity }]}>
            <View style={styles.thumbnailSkeleton} />
            <View style={styles.textSkeleton}>
              <View style={styles.cardTitleSkeleton} />
              <View style={styles.cardSubtitleSkeleton} />
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  titleContainer: {
    paddingHorizontal: config.tv.safeZoneMarginPt,
    marginBottom: 16,
  },
  titleSkeleton: {
    width: 240,
    height: 52,
    borderRadius: 8,
    backgroundColor: 'rgba(168,85,247,0.15)',
  },
  cardRow: {
    flexDirection: 'row',
    paddingLeft: config.tv.safeZoneMarginPt - 8,
    gap: 16,
  },
  cardSkeleton: {
    width: 320,
    height: 220,
    borderRadius: 16,
    backgroundColor: 'rgba(20,20,35,0.85)',
    overflow: 'hidden',
  },
  thumbnailSkeleton: {
    width: '100%',
    height: 180,
    backgroundColor: 'rgba(168,85,247,0.15)',
  },
  textSkeleton: {
    padding: 12,
    gap: 4,
  },
  cardTitleSkeleton: {
    width: '80%',
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cardSubtitleSkeleton: {
    width: '60%',
    height: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
