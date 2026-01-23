/**
 * Widgets Intro Video
 * Reusable full-screen intro video component with fade animations
 * Supports dismiss functionality and loading/error states
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '../ui/GlassButton';
import { GlassView } from '../ui/GlassView';
import { useDirection } from '../../hooks/useDirection';
import { colors, spacing } from '../../theme';

interface WidgetsIntroVideoProps {
  videoUrl: string;
  visible: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
  showDismissButton?: boolean;
  autoPlay?: boolean;
}

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset state when visibility changes
  useEffect(() => {
    if (visible) {
      completedRef.current = false;
      setIsLoading(true);
      setHasError(false);
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

  // Keyboard navigation (Escape key)
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

  // Handle dismiss with "Don't show again"
  const handleDismiss = () => {
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
  };

  // Handle video loaded
  const handleVideoLoaded = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Handle video error
  const handleVideoError = () => {
    setIsLoading(false);
    setHasError(true);
    // Auto-close after error
    setTimeout(handleComplete, 2000);
  };

  // Don't render on non-web platforms or when not visible
  if (Platform.OS !== 'web' || !visible) {
    return null;
  }

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

        {/* Video element */}
        {!hasError && (
          <GlassView style={styles.videoContainer}>
            <video
              ref={videoRef}
              src={videoUrl}
              aria-label={t('widgets.intro.title')}
              title={t('widgets.intro.title')}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: colors.background,
                display: isLoading ? 'none' : 'block',
              } as React.CSSProperties}
              playsInline
              autoPlay={autoPlay}
              controls
              onLoadedData={handleVideoLoaded}
              onEnded={handleComplete}
              onError={handleVideoError}
            />
          </GlassView>
        )}
      </View>

      {/* Control buttons */}
      <View style={[
        styles.buttonContainer,
        { flexDirection },
        isRTL ? { left: 40, right: undefined } : { right: 40, left: undefined }
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

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    gap: spacing.md,
    alignItems: 'center',
  },
});

export default WidgetsIntroVideo;
