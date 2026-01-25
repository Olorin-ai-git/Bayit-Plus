/**
 * Wizard Intro Video
 * Full-screen intro video for Olorin wizard with fade in/out animations
 * Shown only once on first wizard interaction
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Animated,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { colors } from '@olorin/design-tokens';

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
    <Animated.View className="absolute top-0 left-0 right-0 bottom-0 bg-black z-[10000] justify-center items-center" style={{ opacity: fadeAnim }}>
      <View className="w-full h-full justify-center items-center bg-black">
        <video
          ref={videoRef}
          src={INTRO_VIDEO_URL}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: colors.background,
          } as React.CSSProperties}
          playsInline
          autoPlay
          onEnded={handleComplete}
          onError={handleComplete}
        />
      </View>

      {/* Skip button */}
      <TouchableOpacity className="absolute bottom-10 right-10 px-6 py-3 bg-white/20 rounded-lg border border-white/30" onPress={handleComplete}>
        <Text className="text-white text-base font-semibold">Skip</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default WizardIntroVideo;
