/**
 * MultiWindowContainer - Individual window renderer for tvOS
 * TV-optimized: Focus borders, remote navigation, no touch gestures
 */

import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { X, Volume2, VolumeX, Minimize2, Maximize2, RefreshCw } from 'lucide-react-native';
import { useWindow } from '../../stores/multiWindowStore';
import { useMultiWindowFocus } from './useMultiWindowFocus';
import { WindowContent } from './WindowContent';
import config from '@/config/appConfig';

interface MultiWindowContainerProps {
  windowId: string;
  streamUrl?: string;
  hasTVPreferredFocus?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MINIMIZED_WIDTH = 120;
const MINIMIZED_HEIGHT = 120;
const SPRING_CONFIG = { damping: 25, stiffness: 400, mass: 1 };
const FOCUS_BORDER_WIDTH = config.tv.focusBorderWidth;
const FOCUS_SCALE = config.tv.focusScaleFactor;
const SAFE_ZONE = config.tv.safeZoneMarginPt;

export default function MultiWindowContainer({
  windowId,
  streamUrl,
  hasTVPreferredFocus = false,
}: MultiWindowContainerProps) {
  const windowData = useWindow(windowId);
  const [loading, setLoading] = useState(!streamUrl);
  const [error, setError] = useState<string | null>(null);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  if (!windowData) return null;

  const { window, isMuted, isVisible, position, state, isFocused, toggleMute, close, minimize, expand } = windowData;

  // TV focus navigation hook
  const { focusableProps } = useMultiWindowFocus({
    windowId,
    onSelect: () => {
      if (state === 'minimized' || state === 'full') {
        expand();
      } else {
        minimize();
      }
    },
  });

  // Update loading state when stream URL changes
  useEffect(() => {
    if (window.content.content_type === 'iframe' || window.content.content_type === 'custom') {
      setLoading(false);
      return;
    }
    if (streamUrl) {
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
    }
  }, [streamUrl, window.content.content_type]);

  // Animated style for focus and minimized state
  const animatedStyle = useAnimatedStyle(() => {
    const isMinimized = state === 'minimized';
    const width = isMinimized ? MINIMIZED_WIDTH : position.width;
    const height = isMinimized ? MINIMIZED_HEIGHT : position.height;
    const minimizedX = SCREEN_WIDTH - MINIMIZED_WIDTH - SAFE_ZONE;
    const minimizedY = SCREEN_HEIGHT - MINIMIZED_HEIGHT - SAFE_ZONE;

    return {
      width,
      height,
      transform: [
        { translateX: withSpring(isMinimized ? minimizedX : position.x, SPRING_CONFIG) },
        { translateY: withSpring(isMinimized ? minimizedY : position.y, SPRING_CONFIG) },
        { scale: withSpring(isFocused ? FOCUS_SCALE : 1, SPRING_CONFIG) },
      ],
      opacity: withTiming(isVisible ? opacity.value : 0, { duration: 200 }),
    };
  });

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setTimeout(() => setLoading(!streamUrl), 100);
  }, [streamUrl]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          zIndex: position.z_index,
          borderWidth: isFocused ? FOCUS_BORDER_WIDTH : 1,
          borderColor: isFocused ? '#A855F7' : 'rgba(255,255,255,0.1)',
        },
        animatedStyle,
      ]}
      {...focusableProps}
    >
      <View style={styles.innerContainer}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.controls}>
            <Pressable style={styles.controlButton} onPress={state === 'minimized' ? expand : minimize}>
              {state === 'minimized' ? <Maximize2 size={18} color="#fff" /> : <Minimize2 size={18} color="#fff" />}
            </Pressable>
            <Pressable style={styles.controlButton} onPress={handleRefresh}>
              <RefreshCw size={18} color="#fff" />
            </Pressable>
            <Pressable style={styles.controlButton} onPress={toggleMute}>
              {isMuted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}
            </Pressable>
            {window.is_closable && (
              <Pressable style={styles.controlButton} onPress={close}>
                <X size={18} color="#fff" />
              </Pressable>
            )}
          </View>
          <View style={styles.titleContainer}>
            {window.icon && <Text style={styles.icon}>{window.icon}</Text>}
            <Text style={styles.title} numberOfLines={1}>
              {window.title}
            </Text>
          </View>
        </View>

        {/* Content - hidden when minimized */}
        {state !== 'minimized' && (
          <View style={styles.content}>
            <WindowContent window={window} streamUrl={streamUrl} loading={loading} error={error} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,20,35,0.85)',
  },
  innerContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    minHeight: 60,
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginLeft: 16,
  },
  icon: { fontSize: 20 },
  title: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: '#fff',
  },
  content: { flex: 1, backgroundColor: '#000' },
});
