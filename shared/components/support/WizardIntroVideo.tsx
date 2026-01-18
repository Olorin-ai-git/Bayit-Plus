/**
 * Wizard Intro Video
 * Full-screen intro video for Olorin wizard with fade in/out animations
 * Shown only once on first wizard interaction
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { colors } from '../../theme';

// Video URL - served from public folder
const INTRO_VIDEO_URL = '/media/olorin-avatar-intro.mp4';

interface WizardIntroVideoProps {
  visible: boolean;
  onComplete: () => void;
}

export const WizardIntroVideo: React.FC<WizardIntroVideoProps> = ({
  visible,
  onComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);

  // Reset completed flag when visibility changes
  useEffect(() => {
    if (visible) {
      completedRef.current = false;
    }
  }, [visible]);

  // Fade in animation when visible
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  // Handle completion - only call once
  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  };

  // Don't render on non-web platforms or when not visible
  if (Platform.OS !== 'web' || !visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.videoContainer}>
        <video
          ref={videoRef}
          src={INTRO_VIDEO_URL}
          style={styles.webVideo as React.CSSProperties}
          playsInline
          autoPlay
          onEnded={handleComplete}
          onError={handleComplete}
        />
      </View>

      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleComplete}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: colors.background,
  },
  skipButton: {
    position: 'absolute',
    bottom: 40,
    right: 40,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WizardIntroVideo;
