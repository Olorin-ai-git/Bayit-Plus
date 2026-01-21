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
import { View, Text, Pressable, Dimensions, Platform, Linking } from 'react-native';
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

  // Handle refresh - triggers content reload
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    // Small delay then reset loading to trigger content re-render
    setTimeout(() => {
      setLoading(!streamUrl);
    }, 100);
  }, [streamUrl]);

  // Render loading state
  const renderLoading = () => (
    <View className="flex-1 justify-center items-center bg-black/80">
      <View className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white" />
      <Text className="mt-3 text-xs text-white/60">Loading...</Text>
    </View>
  );

  // Render error state
  const renderError = (errorMessage: string) => (
    <View className="flex-1 justify-center items-center bg-black/80">
      <Text className="text-xs text-white/60">{errorMessage}</Text>
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
          <View className="w-full h-full justify-center items-center">
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
          <View className="w-full h-full justify-center items-center">
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
          <View className="w-full h-full justify-center items-center">
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
          <View className="w-full h-full justify-center items-center">
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
          <View className="w-full h-full justify-center items-center">
            <View className="flex-1 justify-center items-center p-4">
              <Text className="text-xs text-white/60 mb-3">External content</Text>
              <Pressable
                className="px-4 py-2 bg-white/10 rounded-lg border border-white/20"
                onPress={() => Linking.openURL(widget.content.iframe_url!)}
              >
                <Text className="text-xs text-white font-medium">Open in browser</Text>
              </Pressable>
            </View>
          </View>
        );

      case 'custom':
        return renderError(`Component "${widget.content.component_name}" not available`);

      default:
        return renderError('No content configured');
    }
  };

  if (!isVisible) return null;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        className="rounded-xl overflow-hidden"
        style={[
          {
            zIndex: position.z_index,
            position: 'absolute',
            top: 0,
            left: 0,
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
          animatedStyle,
        ]}
      >
        <View className="w-full h-full bg-[rgba(20,20,35,0.85)] border border-white/10 rounded-xl overflow-hidden">
          {/* Header Bar */}
          <View className="flex-row items-center justify-between px-3 py-2 bg-black/70 border-b border-white/10 min-h-[44px]">
            {/* Controls */}
            <View className="flex-row items-center gap-2">
              {/* Minimize/Expand Button */}
              <Pressable
                className="w-8 h-8 rounded-full bg-white/10 justify-center items-center"
                onPress={state === 'minimized' ? expand : minimize}
              >
                {state === 'minimized' ? (
                  <Maximize2 size={14} color="#fff" />
                ) : (
                  <Minimize2 size={14} color="#fff" />
                )}
              </Pressable>

              {/* Refresh Button */}
              <Pressable className="w-8 h-8 rounded-full bg-white/10 justify-center items-center" onPress={handleRefresh}>
                <RefreshCw size={14} color="#fff" />
              </Pressable>

              {/* Mute Button */}
              <Pressable className="w-8 h-8 rounded-full bg-white/10 justify-center items-center" onPress={toggleMute}>
                {isMuted ? <VolumeX size={14} color="#fff" /> : <Volume2 size={14} color="#fff" />}
              </Pressable>

              {/* Close Button */}
              {widget.is_closable && (
                <Pressable className="w-8 h-8 rounded-full bg-white/10 justify-center items-center" onPress={close}>
                  <X size={14} color="#fff" />
                </Pressable>
              )}
            </View>

            {/* Title */}
            <View className="flex-row items-center gap-1.5 flex-1 ml-3">
              {widget.icon && <Text className="text-sm">{widget.icon}</Text>}
              <Text className="text-xs font-semibold text-white" numberOfLines={1}>
                {widget.title}
              </Text>
            </View>
          </View>

          {/* Content - hidden when minimized */}
          {state !== 'minimized' && (
            <View
              className={`w-full flex-1 ${
                widget.content.content_type === 'podcast' || widget.content.content_type === 'radio'
                  ? 'bg-transparent'
                  : 'bg-black'
              }`}
            >
              {renderContent()}
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
