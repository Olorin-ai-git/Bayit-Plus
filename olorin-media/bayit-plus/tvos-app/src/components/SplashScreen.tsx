/**
 * SplashScreen for tvOS
 * Plays intro video based on current language, then transitions to main app
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Animated,
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import { useTranslation } from 'react-i18next';

interface SplashScreenProps {
  onComplete: () => void;
  minimumDuration?: number; // Minimum time to show splash in ms
}

// Video sources - from shared assets
const VIDEO_SOURCES = {
  he: require('../../../shared/assets/video/intro/Bayit_Intro_Hebrew.mp4'),
  en: require('../../../shared/assets/video/intro/Bayit_Intro_English.mp4'),
  es: require('../../../shared/assets/video/intro/Bayit_Intro_English.mp4'), // Use English for Spanish
};

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minimumDuration = 3000,
}) => {
  const { i18n } = useTranslation();
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const startTimeRef = useRef(Date.now());

  // Get video source based on language
  const currentLang = (i18n.language || 'he') as keyof typeof VIDEO_SOURCES;
  const videoSource = VIDEO_SOURCES[currentLang] || VIDEO_SOURCES.he;

  // Handle completion with minimum duration
  const handleComplete = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const remainingTime = Math.max(0, minimumDuration - elapsed);

    setTimeout(() => {
      // Fade out then call onComplete
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, remainingTime);
  }, [fadeAnim, minimumDuration, onComplete]);

  // Auto-complete when video ends
  useEffect(() => {
    if (videoEnded) {
      handleComplete();
    }
  }, [videoEnded, handleComplete]);

  // Fallback: complete after 10 seconds even if video doesn't end
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (!videoEnded) {
        console.log('[Splash] Fallback timeout triggered');
        handleComplete();
      }
    }, 10000);

    return () => clearTimeout(fallbackTimeout);
  }, [handleComplete, videoEnded]);

  const onVideoLoad = (data: OnLoadData) => {
    console.log('[Splash] Video loaded, duration:', data.duration);
    setVideoLoaded(true);
  };

  const onVideoEnd = () => {
    console.log('[Splash] Video ended');
    setVideoEnded(true);
  };

  const onVideoError = (error: any) => {
    console.warn('[Splash] Video error:', error);
    // Complete immediately on error
    handleComplete();
  };

  // Allow skip on press
  const handleSkip = () => {
    console.log('[Splash] Skipped by user');
    handleComplete();
  };

  return (
    <Animated.View className="absolute inset-0 bg-black z-[9999]" style={{ opacity: fadeAnim }}>
      <Video
        source={videoSource}
        style={styles.video}
        resizeMode="cover"
        onLoad={onVideoLoad}
        onEnd={onVideoEnd}
        onError={onVideoError}
        repeat={false}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="ignore"
        volume={1.0}
        muted={false}
      />

      {/* Skip button - visible after video loads */}
      {videoLoaded && (
        <Pressable
          className="absolute bottom-[60px] right-[60px] px-8 py-4 bg-white/20 rounded-xl border-2 border-transparent focus:bg-purple-500/40 focus:border-purple-500 focus:scale-105"
          onPress={handleSkip}
        >
          <Text className="text-white text-xl font-semibold">Skip</Text>
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
});

export default SplashScreen;
