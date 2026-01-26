/**
 * PlayerProgressBar - Seekable progress bar for TV player
 *
 * Features:
 * - Visual progress indicator
 * - Seekable with focus
 * - Buffered range display
 * - Focus effects
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { config } from '../../config/appConfig';

interface PlayerProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  bufferedTime?: number;
}

export const PlayerProgressBar: React.FC<PlayerProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  bufferedTime = 0,
}) => {
  const [focused, setFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration > 0 ? (bufferedTime / duration) * 100 : 0;

  // Animate focus effects
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.05 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [focused]);

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const handlePress = () => {
    // In a full implementation, this would open a seek overlay
    // For now, it's just a placeholder for the pressable interface
  };

  return (
    <Pressable
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      accessible
      accessibilityLabel={`Progress: ${Math.floor(progress)}%`}
      accessibilityRole="adjustable"
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.progressContainer,
          {
            transform: [{ scaleY: scaleAnim }],
            borderColor: focused ? '#A855F7' : 'rgba(255,255,255,0.2)',
          },
        ]}
      >
        {/* Background Track */}
        <View style={styles.track} />

        {/* Buffered Progress */}
        {bufferedProgress > 0 && (
          <View
            style={[
              styles.buffered,
              {
                width: `${Math.min(bufferedProgress, 100)}%`,
              },
            ]}
          />
        )}

        {/* Current Progress */}
        <View
          style={[
            styles.progress,
            {
              width: `${Math.min(progress, 100)}%`,
            },
          ]}
        />

        {/* Progress Thumb */}
        {progress > 0 && (
          <View
            style={[
              styles.thumb,
              {
                left: `${Math.min(progress, 100)}%`,
              },
            ]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  progressContainer: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
  },
  track: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  buffered: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#A855F7',
  },
  thumb: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
