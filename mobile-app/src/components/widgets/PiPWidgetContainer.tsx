/**
 * PiPWidgetContainer - Picture-in-Picture widget for mobile
 *
 * Mobile adaptation of web WidgetContainer with touch gestures:
 * - Pan gesture for dragging (replaces mouse drag)
 * - Pinch gesture for resizing (replaces resize handles)
 * - Double tap to minimize/expand
 * - Long press for context menu (future)
 * - Edge snapping with spring animation
 * - Safe area awareness (notch, home indicator)
 * - Haptic feedback on interactions
 */

import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Volume2, VolumeX, Minimize2, Maximize2, RefreshCw } from 'lucide-react-native';
import { usePiPWidget } from '../../stores/pipWidgetStore';
import { useDirection } from '@bayit/shared-hooks';
import { MobileVideoPlayer, MobileAudioPlayer } from '../player';
import type { Widget } from '../../stores/pipWidgetStore';

interface PiPWidgetContainerProps {
  widgetId: string;
  streamUrl?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Minimized dimensions
const MINIMIZED_WIDTH = 80;
const MINIMIZED_HEIGHT = 80;

// Min/max dimensions for resize
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;
const MAX_WIDTH = SCREEN_WIDTH - 32; // 16px padding each side
const MAX_HEIGHT = SCREEN_HEIGHT - 100; // Leave room for tab bar

// Edge snapping threshold
const SNAP_THRESHOLD = 50;

// Spring config
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 1,
};

export default function PiPWidgetContainer({ widgetId, streamUrl }: PiPWidgetContainerProps) {
  const pipWidget = usePiPWidget(widgetId);
  const insets = useSafeAreaInsets();
  const { isRTL } = useDirection();

  const [loading, setLoading] = useState(!streamUrl);
  const [error, setError] = useState<string | null>(null);

  // Shared values for gestures and animations
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  if (!pipWidget) return null;

  const { widget, isMuted, isVisible, position, state, toggleMute, close, minimize, expand, updatePosition, snapToEdge } = pipWidget;

  // Update loading state when stream URL changes
  useEffect(() => {
    if (widget.content.content_type === 'iframe' || widget.content.content_type === 'custom') {
      setLoading(false);
      return;
    }

    if (streamUrl) {
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
    }
  }, [streamUrl, widget.content.content_type]);

  // Initialize position from store
  useEffect(() => {
    translateX.value = position.x;
    translateY.value = position.y;
    savedTranslateX.value = position.x;
    savedTranslateY.value = position.y;
  }, []);

  // Calculate edge snapping
  const snapToNearestEdge = useCallback((x: number, y: number, width: number, height: number) => {
    'worklet';
    const leftDist = x;
    const rightDist = SCREEN_WIDTH - (x + width);
    const topDist = y - insets.top;
    const bottomDist = SCREEN_HEIGHT - (y + height) - insets.bottom;

    const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);

    if (minDist > SNAP_THRESHOLD) return null;

    if (minDist === leftDist) return 'left';
    if (minDist === rightDist) return 'right';
    if (minDist === topDist) return 'top';
    if (minDist === bottomDist) return 'bottom';
    return null;
  }, [insets]);

  // Pan gesture for dragging widget
  const panGesture = Gesture.Pan()
    .enabled(widget.is_draggable && state !== 'minimized')
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Calculate new position with bounds
      const maxX = SCREEN_WIDTH - position.width;
      const maxY = SCREEN_HEIGHT - position.height;

      translateX.value = Math.max(0, Math.min(savedTranslateX.value + event.translationX, maxX));
      translateY.value = Math.max(insets.top, Math.min(savedTranslateY.value + event.translationY, maxY - insets.bottom));
    })
    .onEnd(() => {
      // Check for edge snapping
      const edge = snapToNearestEdge(translateX.value, translateY.value, position.width, position.height);

      if (edge) {
        // Snap to edge with spring animation
        switch (edge) {
          case 'left':
            translateX.value = withSpring(16, SPRING_CONFIG);
            break;
          case 'right':
            translateX.value = withSpring(SCREEN_WIDTH - position.width - 16, SPRING_CONFIG);
            break;
          case 'top':
            translateY.value = withSpring(insets.top + 16, SPRING_CONFIG);
            break;
          case 'bottom':
            translateY.value = withSpring(SCREEN_HEIGHT - position.height - insets.bottom - 16, SPRING_CONFIG);
            break;
        }
        runOnJS(snapToEdge)(edge);
      }

      // Update position in store
      runOnJS(updatePosition)({
        x: translateX.value,
        y: translateY.value,
      });
    });

  // Pinch gesture for resizing
  const pinchGesture = Gesture.Pinch()
    .enabled(state !== 'minimized')
    .onUpdate((event) => {
      // Scale widget with min/max constraints
      const newWidth = position.width * event.scale;
      const newHeight = position.height * event.scale;

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH && newHeight >= MIN_HEIGHT && newHeight <= MAX_HEIGHT) {
        scale.value = event.scale;
      }
    })
    .onEnd(() => {
      // Apply scale to actual dimensions
      const newWidth = Math.max(MIN_WIDTH, Math.min(position.width * scale.value, MAX_WIDTH));
      const newHeight = Math.max(MIN_HEIGHT, Math.min(position.height * scale.value, MAX_HEIGHT));

      runOnJS(updatePosition)({
        width: newWidth,
        height: newHeight,
      });

      // Reset scale
      scale.value = 1;
    });

  // Double tap to minimize/expand
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(state === 'minimized' || state === 'full' ? expand : minimize)();
    });

  // Combine gestures
  const composedGesture = Gesture.Race(
    Gesture.Simultaneous(panGesture, pinchGesture),
    doubleTapGesture
  );

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    const isMinimized = state === 'minimized';
    const width = isMinimized ? MINIMIZED_WIDTH : position.width * scale.value;
    const height = isMinimized ? MINIMIZED_HEIGHT : position.height * scale.value;

    // Minimized position (bottom right corner for LTR, bottom left for RTL)
    const minimizedX = isRTL ? 16 : SCREEN_WIDTH - MINIMIZED_WIDTH - 16;
    const minimizedY = SCREEN_HEIGHT - MINIMIZED_HEIGHT - insets.bottom - 16;

    return {
      width,
      height,
      transform: [
        {
          translateX: withSpring(isMinimized ? minimizedX : translateX.value, SPRING_CONFIG),
        },
        {
          translateY: withSpring(isMinimized ? minimizedY : translateY.value, SPRING_CONFIG),
        },
      ],
      opacity: withTiming(isVisible ? 1 : 0, { duration: 200 }),
    };
  });

  // Handle refresh
  const handleRefresh = useCallback(() => {
    // TODO: Implement refresh logic
    console.log('Refresh widget:', widgetId);
  }, [widgetId]);

  // Render loading state
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.spinner} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  // Render error state
  const renderError = (errorMessage: string) => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{errorMessage}</Text>
    </View>
  );

  // Render content based on type
  const renderContent = () => {
    if (loading) {
      return renderLoading();
    }

    const { content_type } = widget.content;

    switch (content_type) {
      case 'live_channel':
      case 'live':
        if (!streamUrl) {
          return renderError('Stream unavailable');
        }
        return (
          <View style={styles.playerWrapper}>
            <MobileVideoPlayer
              src={streamUrl}
              title={widget.title}
              isLive={true}
              muted={isMuted}
            />
          </View>
        );

      case 'vod':
        if (!streamUrl) {
          return renderError('Content unavailable');
        }
        return (
          <View style={styles.playerWrapper}>
            <MobileVideoPlayer
              src={streamUrl}
              title={widget.title}
              isLive={false}
              muted={isMuted}
            />
          </View>
        );

      case 'podcast':
        if (!streamUrl) {
          return renderError('Podcast unavailable');
        }
        return (
          <View style={styles.playerWrapper}>
            <MobileAudioPlayer
              src={streamUrl}
              title={widget.title}
              cover={widget.cover_url || widget.icon}
              isLive={false}
              muted={isMuted}
            />
          </View>
        );

      case 'radio':
        if (!streamUrl) {
          return renderError('Station unavailable');
        }
        return (
          <View style={styles.playerWrapper}>
            <MobileAudioPlayer
              src={streamUrl}
              title={widget.title}
              cover={widget.cover_url || widget.icon}
              isLive={true}
              muted={isMuted}
            />
          </View>
        );

      case 'iframe':
        if (!widget.content.iframe_url) {
          return renderError('iFrame URL not configured');
        }
        return (
          <View style={styles.playerWrapper}>
            <Text style={styles.placeholderText}>WebView TODO</Text>
            {/* TODO: Add react-native-webview
            <WebView source={{ uri: widget.content.iframe_url }} /> */}
          </View>
        );

      case 'custom':
        // TODO: Render custom components based on component_name
        return renderError(`Custom component: ${widget.content.component_name}`);

      default:
        return renderError('No content configured');
    }
  };

  if (!isVisible) return null;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            zIndex: position.z_index,
            position: 'absolute',
            top: 0,
            left: 0,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.glassContainer}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            {/* Controls */}
            <View style={styles.controlsContainer}>
              {/* Minimize/Expand Button */}
              <Pressable
                style={styles.controlButton}
                onPress={state === 'minimized' ? expand : minimize}
              >
                {state === 'minimized' ? (
                  <Maximize2 size={14} color="#fff" />
                ) : (
                  <Minimize2 size={14} color="#fff" />
                )}
              </Pressable>

              {/* Refresh Button */}
              <Pressable style={styles.controlButton} onPress={handleRefresh}>
                <RefreshCw size={14} color="#fff" />
              </Pressable>

              {/* Mute Button */}
              <Pressable style={styles.controlButton} onPress={toggleMute}>
                {isMuted ? <VolumeX size={14} color="#fff" /> : <Volume2 size={14} color="#fff" />}
              </Pressable>

              {/* Close Button */}
              {widget.is_closable && (
                <Pressable style={styles.controlButton} onPress={close}>
                  <X size={14} color="#fff" />
                </Pressable>
              )}
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              {widget.icon && <Text style={styles.icon}>{widget.icon}</Text>}
              <Text style={styles.title} numberOfLines={1}>
                {widget.title}
              </Text>
            </View>
          </View>

          {/* Content - hidden when minimized */}
          {state !== 'minimized' && (
            <View
              style={[
                styles.contentWrapper,
                // Transparent background for audio content
                (widget.content.content_type === 'podcast' ||
                  widget.content.content_type === 'radio') &&
                  styles.contentWrapperTransparent,
              ]}
            >
              {renderContent()}
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  glassContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(20, 20, 35, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 44, // iOS touch target
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginLeft: 12,
  },
  icon: {
    fontSize: 14,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  contentWrapper: {
    width: '100%',
    flex: 1,
    backgroundColor: '#000',
  },
  contentWrapperTransparent: {
    backgroundColor: 'transparent',
  },
  playerWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  errorText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
