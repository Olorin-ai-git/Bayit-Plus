/**
 * WindowPlayerControls - Shared minimal player controls for multi-window system
 * Overlay controls that appear on focus with auto-fade animation
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Play, Pause, X } from 'lucide-react-native';
import { colors, spacing } from '@olorin/design-tokens';
import config from '@/config/appConfig';

const BUTTON_SIZE = config.tv.player.controlButtonSize;
const ICON_SIZE = config.tv.player.controlIconSize;
const PROGRESS_HEIGHT = config.tv.player.progressBarHeight;
const FADE_DURATION_MS = 250;

interface WindowPlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onClose: () => void;
  showSeek?: boolean;
  progress?: number;
  onSeek?: (position: number) => void;
  visible: boolean;
}

export function WindowPlayerControls({
  isPlaying,
  onPlayPause,
  onClose,
  showSeek = false,
  progress = 0,
  onSeek,
  visible,
}: WindowPlayerControlsProps) {
  const fadeValue = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    fadeValue.value = withTiming(visible ? 1 : 0, {
      duration: FADE_DURATION_MS,
    });
  }, [visible, fadeValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeValue.value,
    pointerEvents: fadeValue.value > 0.5 ? 'auto' : 'none',
  }));

  const clampedProgress = Math.max(0, Math.min(progress, 1));

  return (
    <Animated.View style={[styles.overlay, animatedStyle]}>
      <View style={styles.controlsRow}>
        <Pressable
          style={({ focused }) => [
            styles.controlButton,
            focused && styles.controlButtonFocused,
          ]}
          onPress={onPlayPause}
        >
          {isPlaying ? (
            <Pause size={ICON_SIZE} color={colors.white} />
          ) : (
            <Play size={ICON_SIZE} color={colors.white} />
          )}
        </Pressable>

        <Pressable
          style={({ focused }) => [
            styles.closeButton,
            focused && styles.controlButtonFocused,
          ]}
          onPress={onClose}
        >
          <X size={ICON_SIZE} color={colors.white} />
        </Pressable>
      </View>

      {showSeek && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${clampedProgress * 100}%` }]}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: colors.glass,
    padding: spacing.md,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  controlButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.glassMedium,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.glassBorderLight,
  },
  closeButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.glassMedium,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.glassBorderLight,
    position: 'absolute',
    right: 0,
  },
  controlButtonFocused: {
    borderColor: colors.primary[500],
    backgroundColor: colors.glassPurpleLight,
    transform: [{ scale: config.tv.focusScaleFactor }],
  },
  progressContainer: {
    paddingHorizontal: spacing.sm,
  },
  progressTrack: {
    height: PROGRESS_HEIGHT,
    backgroundColor: colors.glassBorderLight,
    borderRadius: PROGRESS_HEIGHT / 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: PROGRESS_HEIGHT / 2,
  },
});
