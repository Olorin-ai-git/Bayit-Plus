/**
 * Widgets Intro Video
 * Reusable full-screen intro video component with fade animations
 * Supports dismiss functionality and loading/error states
 * Cross-platform: Uses HTML5 video on web, react-native-video on native
 * NOW WITH SEQUENCE SUPPORT: Plays Marty Jr. BTTF2 video, then widgets intro
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '../ui/GlassButton';
import { GlassView } from '../ui/GlassView';
import { useDirection } from '../../hooks/useDirection';
import { colors } from '@olorin/design-tokens';
import { WidgetsIntroVideoProps } from './WidgetsIntroVideo.types';
import { getCaptionUrls } from './WidgetsIntroVideo.utils';
import { styles } from './WidgetsIntroVideo.styles';
import { WebVideoPlayer } from './WebVideoPlayer';
import { NativeVideoPlayer } from './NativeVideoPlayer';
import { config } from '../../config/appConfig';

export const WidgetsIntroVideo: React.FC<WidgetsIntroVideoProps> = ({
  videoUrl,
  visible,
  onComplete,
  onDismiss,
  showDismissButton = false,
  autoPlay = true,
}) => {
  const { t } = useTranslation();
  const { isRTL, flexDirection } = useDirection();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<any>(null);
  const completedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Video sequence: Marty Jr. BTTF2 first, then widgets intro
  const videoSequence = [
    config.media.martyJrBttf2Video,
    videoUrl,
  ];
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const currentVideoUrl = videoSequence[currentVideoIndex];
  const captionUrls = getCaptionUrls(currentVideoUrl);

  useEffect(() => {
    if (visible) {
      completedRef.current = false;
      setCurrentVideoIndex(0); // Reset to first video
      setIsLoading(true);
      setHasError(false);
    }
  }, [visible]);

  const handleVideoComplete = useCallback(() => {
    // Check if there are more videos in the sequence
    if (currentVideoIndex < videoSequence.length - 1) {
      // Move to next video
      setCurrentVideoIndex(prev => prev + 1);
      setIsLoading(true);
      setHasError(false);
    } else {
      // All videos completed
      if (completedRef.current) return;
      completedRef.current = true;

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }
  }, [currentVideoIndex, videoSequence.length, fadeAnim, onComplete]);

  const handleSkipAll = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  }, [fadeAnim, onComplete]);

  const handleDismiss = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      if (onDismiss) {
        onDismiss();
      } else {
        onComplete();
      }
    });
  }, [fadeAnim, onDismiss, onComplete]);

  const handleVideoLoaded = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleVideoError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    // If video fails, wait 2 seconds then try next video or complete
    setTimeout(() => {
      if (currentVideoIndex < videoSequence.length - 1) {
        setCurrentVideoIndex(prev => prev + 1);
        setIsLoading(true);
        setHasError(false);
      } else {
        handleSkipAll();
      }
    }, 2000);
  }, [currentVideoIndex, videoSequence.length, handleSkipAll]);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleSkipAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, handleSkipAll]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={styles.container}>
        {/* Video progress indicator */}
        <View style={styles.progressContainer}>
          {videoSequence.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentVideoIndex && styles.progressDotActive,
                index < currentVideoIndex && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>

        {/* Loading indicator */}
        {isLoading && !hasError && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {currentVideoIndex === 0
                ? t('widgets.intro.loadingMartyJr', 'Loading Marty Jr...')
                : t('widgets.intro.loadingWidgets', 'Loading widgets intro...')}
            </Text>
          </View>
        )}

        {/* Error message */}
        {hasError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {t('widgets.intro.videoUnavailable', 'Video unavailable, skipping...')}
            </Text>
          </View>
        )}

        {/* Video element - Cross-platform */}
        {!hasError && (
          <GlassView style={styles.videoContainer}>
            {Platform.OS === 'web' ? (
              <WebVideoPlayer
                key={currentVideoIndex} // Force remount on video change
                videoUrl={currentVideoUrl}
                captionUrls={captionUrls}
                videoRef={videoRef}
                isLoading={isLoading}
                autoPlay={autoPlay}
                onLoadedData={handleVideoLoaded}
                onEnded={handleVideoComplete}
                onError={handleVideoError}
              />
            ) : (
              <NativeVideoPlayer
                key={currentVideoIndex} // Force remount on video change
                videoUrl={currentVideoUrl}
                captionUrls={captionUrls}
                autoPlay={autoPlay}
                onLoad={handleVideoLoaded}
                onEnd={handleVideoComplete}
                onError={handleVideoError}
              />
            )}
          </GlassView>
        )}
      </View>

      {/* Control buttons */}
      <View style={[
        styles.buttonContainer,
        { flexDirection },
        isRTL ? { right: 40, left: undefined } : { left: 40, right: undefined }
      ]}>
        {/* Skip button */}
        <GlassButton
          title={t('widgets.intro.skip', 'Skip')}
          onPress={handleSkipAll}
          variant="secondary"
          size="md"
        />

        {/* Dismiss button (Don't show again) */}
        {showDismissButton && onDismiss && (
          <GlassButton
            title={t('widgets.intro.dismiss', "Don't show again")}
            onPress={handleDismiss}
            variant="ghost"
            size="sm"
          />
        )}
      </View>
    </Animated.View>
  );
};

export default WidgetsIntroVideo;
