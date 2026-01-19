/**
 * SplashScreen for iOS Mobile
 * Plays intro video based on current language, then transitions to main app
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  Text,
  Dimensions,
} from 'react-native';
import Video, { OnLoadData } from 'react-native-video';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SplashScreenProps {
  onComplete: () => void;
  minimumDuration?: number;
}

// Video sources - from shared assets
// Use try-catch for require in case files don't exist
let VIDEO_SOURCES: Record<string, any> = {};
try {
  VIDEO_SOURCES = {
    he: require('../../../shared/assets/video/intro/Bayit_Intro_Hebrew.mp4'),
    en: require('../../../shared/assets/video/intro/Bayit_Intro_English.mp4'),
    es: require('../../../shared/assets/video/intro/Bayit_Intro_English.mp4'),
    fr: require('../../../shared/assets/video/intro/Bayit_Intro_English.mp4'),
    zh: require('../../../shared/assets/video/intro/Bayit_Intro_English.mp4'),
    it: require('../../../shared/assets/video/intro/Bayit_Intro_English.mp4'),
    hi: require('../../../shared/assets/video/intro/Bayit_Intro_English.mp4'),
    ta: require('../../../shared/assets/video/intro/Bayit_Intro_English.mp4'),
    bn: require('../../../shared/assets/video/intro/Bayit_Intro_English.mp4'),
    ja: require('../../../shared/assets/video/intro/Bayit_Intro_English.mp4'),
  };
} catch (e) {
  console.warn('[Splash] Failed to load video sources:', e);
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minimumDuration = 2000,
}) => {
  const { i18n, t } = useTranslation();
  const insets = useSafeAreaInsets();
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
        duration: 400,
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

  // Fallback: complete after 8 seconds even if video doesn't end
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (!videoEnded) {
        console.log('[Splash] Fallback timeout triggered');
        handleComplete();
      }
    }, 8000);

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

  // Allow skip on tap
  const handleSkip = () => {
    console.log('[Splash] Skipped by user');
    handleComplete();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
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
          style={[
            styles.skipButton,
            { bottom: insets.bottom + 40, right: insets.right + 20 },
          ]}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>{t('common.skip', 'Skip')}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d0d1a',
    zIndex: 9999,
  },
  video: {
    width,
    height,
  },
  skipButton: {
    position: 'absolute',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SplashScreen;
