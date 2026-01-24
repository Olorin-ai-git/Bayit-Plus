/**
 * SplashScreen for iOS Mobile
 * Plays intro video based on current language, then transitions to main app
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Animated,
  Pressable,
  Text,
} from 'react-native';
import Video, { OnLoadData } from 'react-native-video';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('SplashScreen');

interface SplashScreenProps {
  onComplete: () => void;
  minimumDuration?: number;
}

// Video sources - from local assets (copied from shared)
const VIDEO_SOURCES: Record<string, any> = {
  he: require('../assets/video/intro/Bayit_Intro_Hebrew.mp4'),
  en: require('../assets/video/intro/Bayit_Intro_English.mp4'),
  es: require('../assets/video/intro/Bayit_Intro_English.mp4'),
  fr: require('../assets/video/intro/Bayit_Intro_English.mp4'),
  zh: require('../assets/video/intro/Bayit_Intro_English.mp4'),
  it: require('../assets/video/intro/Bayit_Intro_English.mp4'),
  hi: require('../assets/video/intro/Bayit_Intro_English.mp4'),
  ta: require('../assets/video/intro/Bayit_Intro_English.mp4'),
  bn: require('../assets/video/intro/Bayit_Intro_English.mp4'),
  ja: require('../assets/video/intro/Bayit_Intro_English.mp4'),
};

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
  const currentLang = (i18n.language || 'he') as string;
  const videoSource = VIDEO_SOURCES[currentLang] || VIDEO_SOURCES.he;

  moduleLogger.debug('Splash screen initialized', { language: currentLang });

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
        moduleLogger.warn('Fallback timeout triggered');
        handleComplete();
      }
    }, 8000);

    return () => clearTimeout(fallbackTimeout);
  }, [handleComplete, videoEnded]);

  const onVideoLoad = (data: OnLoadData) => {
    moduleLogger.debug('Video loaded', { duration: data.duration });
    setVideoLoaded(true);
  };

  const onVideoEnd = () => {
    moduleLogger.debug('Video ended');
    setVideoEnded(true);
  };

  const onVideoError = (error: any) => {
    moduleLogger.warn('Video error', error);
    // Complete immediately on error
    handleComplete();
  };

  // Allow skip on tap
  const handleSkip = () => {
    moduleLogger.debug('Skipped by user');
    handleComplete();
  };

  return (
    <Animated.View className="absolute inset-0 bg-[#0d0d1a] z-[9999] justify-center items-center" style={{ opacity: fadeAnim }}>
      <Video
        source={videoSource}
        className="absolute inset-0"
        resizeMode="contain"
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
          className="absolute px-5 py-2.5 bg-white/20 rounded-[20px] border border-white/30"
          style={{ bottom: insets.bottom + 40, right: insets.right + 20 }}
          onPress={handleSkip}
        >
          <Text className="text-white text-sm font-semibold">{t('common.skip', 'Skip')}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
};

export default SplashScreen;
