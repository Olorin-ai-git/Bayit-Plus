/**
 * HeroCarouselSkeleton - Loading placeholder for HeroCarouselTV
 *
 * Displays a skeleton that matches the hero carousel layout
 * with subtle shimmer animation effect.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { config } from '../../config/appConfig';

const WINDOW_WIDTH = Dimensions.get('window').width;
const HERO_WIDTH = WINDOW_WIDTH - config.tv.safeZoneMarginPt * 2;
const HERO_HEIGHT = 550;

export const HeroCarouselSkeleton: React.FC = () => {
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
      <Animated.View style={[styles.heroSkeleton, { opacity }]}>
        {/* Title skeleton */}
        <View style={styles.textContainer}>
          <View style={styles.titleSkeleton} />
          <View style={styles.subtitleSkeleton} />
          <View style={styles.descriptionSkeleton} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: config.tv.safeZoneMarginPt,
    marginBottom: 48,
  },
  heroSkeleton: {
    width: HERO_WIDTH,
    height: HERO_HEIGHT,
    borderRadius: 16,
    backgroundColor: 'rgba(168,85,247,0.15)',
    justifyContent: 'flex-end',
    padding: 48,
  },
  textContainer: {
    gap: 12,
  },
  titleSkeleton: {
    width: '60%',
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  subtitleSkeleton: {
    width: '40%',
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  descriptionSkeleton: {
    width: '80%',
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
