/**
 * Widgets Intro Video
 * Reusable full-screen intro video component with fade animations
 * Supports dismiss functionality and loading/error states
 * Cross-platform: Uses HTML5 video on web, react-native-video on native
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
import { colors } from '../../theme';
import { WidgetsIntroVideoProps } from './WidgetsIntroVideo.types';
import { getCaptionUrls } from './WidgetsIntroVideo.utils';
import { styles } from './WidgetsIntroVideo.styles';
import { WebVideoPlayer } from './WebVideoPlayer';
import { NativeVideoPlayer } from './NativeVideoPlayer';

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
  const captionUrls = getCaptionUrls(videoUrl);

  useEffect(() => {
    if (visible) {
      completedRef.current = false;
      setIsLoading(true);
      setHasError(false);
    }
  }, [visible]);
  const handleComplete = useCallback(() => {
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
    setTimeout(handleComplete, 2000);
  }, [handleComplete]);
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
        handleComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, handleComplete]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={styles.container}>
        {/* Loading indicator */}
        {isLoading && !hasError && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Error message */}
        {hasError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {t('widgets.intro.videoUnavailable')}
            </Text>
          </View>
        )}

        {/* Video element - Cross-platform */}
        {!hasError && (
          <GlassView style={styles.videoContainer}>
            {Platform.OS === 'web' ? (
              <WebVideoPlayer
                videoUrl={videoUrl}
                captionUrls={captionUrls}
                videoRef={videoRef}
                isLoading={isLoading}
                autoPlay={autoPlay}
                onLoadedData={handleVideoLoaded}
                onEnded={handleComplete}
                onError={handleVideoError}
              />
            ) : (
              <NativeVideoPlayer
                videoUrl={videoUrl}
                captionUrls={captionUrls}
                autoPlay={autoPlay}
                onLoad={handleVideoLoaded}
                onEnd={handleComplete}
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
          title={t('widgets.intro.skip')}
          onPress={handleComplete}
          variant="secondary"
          size="md"
        />

        {/* Dismiss button (Don't show again) */}
        {showDismissButton && onDismiss && (
          <GlassButton
            title={t('widgets.intro.dismiss')}
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
