/**
 * PlayerScreenMobile
 *
 * Mobile-optimized video player with touch gestures
 * Features:
 * - Fullscreen on phone landscape
 * - Swipe down to close gesture
 * - Bottom sheet for settings (quality, subtitles, speed)
 * - Mobile-optimized controls (larger touch targets)
 * - Tap to show/hide controls
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Video from 'react-native-video';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useResponsive } from '../hooks/useResponsive';
import { BottomSheet } from '../components';
import { GlassView, GlassButton } from '@bayit/shared';
import { spacing, colors, typography, touchTarget } from '../theme';

interface PlayerRoute {
  params: {
    id: string;
    title: string;
    type: 'vod' | 'live' | 'radio' | 'podcast';
  };
}

export const PlayerScreenMobile: React.FC = () => {
  const route = useRoute<PlayerRoute>();
  const navigation = useNavigation();
  const { isPhone, orientation } = useResponsive();

  const { id, title, type } = route.params;

  const videoRef = useRef<Video>(null);
  const [showControls, setShowControls] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Settings state
  const [quality, setQuality] = useState('auto');
  const [subtitles, setSubtitles] = useState('off');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const translateY = useSharedValue(0);

  // Swipe down to close gesture (phone only)
  const gestureHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      if (isPhone && event.translationY > 0) {
        translateY.value = event.translationY;
      }
    },
    onEnd: (event) => {
      if (isPhone && event.translationY > 100) {
        // Swipe threshold exceeded - close player
        runOnJS(handleClose)();
      } else {
        // Spring back
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleClose = () => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactMedium');
    }
    navigation.goBack();
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactLight');
    }
  };

  const handleSeek = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    videoRef.current?.seek(newTime);
    setCurrentTime(newTime);
  };

  const handleProgress = (data: any) => {
    setCurrentTime(data.currentTime);
  };

  const handleLoad = (data: any) => {
    setDuration(data.duration);
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* Video player */}
        <Video
          ref={videoRef}
          source={{ uri: `https://api.bayit.tv/stream/${id}` }}
          style={styles.video}
          resizeMode="contain"
          paused={!isPlaying}
          playbackRate={playbackSpeed}
          onProgress={handleProgress}
          onLoad={handleLoad}
        />

        {/* Touch overlay to toggle controls */}
        <Pressable
          style={styles.overlay}
          onPress={toggleControls}
        >
          {showControls && (
            <View style={styles.controlsContainer}>
              {/* Top bar - title and close */}
              <View style={styles.topBar}>
                <GlassView style={styles.topBarContent}>
                  <Text style={styles.title} numberOfLines={1}>
                    {title}
                  </Text>
                  <Pressable
                    onPress={handleClose}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.closeIcon}>✕</Text>
                  </Pressable>
                </GlassView>
              </View>

              {/* Center controls - play/pause */}
              <View style={styles.centerControls}>
                <Pressable
                  onPress={() => handleSeek(-10)}
                  style={[styles.controlButton, styles.seekButton]}
                >
                  <Text style={styles.controlIcon}>⏪</Text>
                </Pressable>

                <Pressable
                  onPress={handlePlayPause}
                  style={[styles.controlButton, styles.playButton]}
                >
                  <Text style={styles.controlIcon}>
                    {isPlaying ? '⏸' : '▶'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSeek(10)}
                  style={[styles.controlButton, styles.seekButton]}
                >
                  <Text style={styles.controlIcon}>⏩</Text>
                </Pressable>
              </View>

              {/* Bottom bar - progress and settings */}
              {type !== 'live' && (
                <View style={styles.bottomBar}>
                  <GlassView style={styles.bottomBarContent}>
                    {/* Time */}
                    <Text style={styles.timeText}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </Text>

                    {/* Progress bar */}
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${(currentTime / duration) * 100}%` },
                        ]}
                      />
                    </View>

                    {/* Settings button */}
                    <Pressable
                      onPress={() => setSettingsVisible(true)}
                      style={styles.settingsButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.settingsIcon}>⚙️</Text>
                    </Pressable>
                  </GlassView>
                </View>
              )}
            </View>
          )}
        </Pressable>

        {/* Settings bottom sheet */}
        <BottomSheet
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          height={300}
        >
          <Text style={styles.sheetTitle}>Settings</Text>

          {/* Quality selection */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>Quality</Text>
            <View style={styles.settingOptions}>
              {['auto', '1080p', '720p', '480p'].map((q) => (
                <GlassButton
                  key={q}
                  variant={quality === q ? 'primary' : 'secondary'}
                  onPress={() => setQuality(q)}
                  style={styles.settingOption}
                >
                  {q}
                </GlassButton>
              ))}
            </View>
          </View>

          {/* Subtitles */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>Subtitles</Text>
            <View style={styles.settingOptions}>
              {['off', 'en', 'he'].map((sub) => (
                <GlassButton
                  key={sub}
                  variant={subtitles === sub ? 'primary' : 'secondary'}
                  onPress={() => setSubtitles(sub)}
                  style={styles.settingOption}
                >
                  {sub}
                </GlassButton>
              ))}
            </View>
          </View>

          {/* Playback speed */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>Speed</Text>
            <View style={styles.settingOptions}>
              {[0.5, 1.0, 1.5, 2.0].map((speed) => (
                <GlassButton
                  key={speed}
                  variant={playbackSpeed === speed ? 'primary' : 'secondary'}
                  onPress={() => setPlaybackSpeed(speed)}
                  style={styles.settingOption}
                >
                  {speed}x
                </GlassButton>
              ))}
            </View>
          </View>
        </BottomSheet>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 24,
    color: colors.text,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 217, 255, 0.9)',
  },
  seekButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlIcon: {
    fontSize: 32,
    color: colors.text,
  },
  bottomBar: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  bottomBarContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  timeText: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  settingsButton: {
    alignSelf: 'flex-end',
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 24,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  settingSection: {
    marginBottom: spacing.lg,
  },
  settingLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  settingOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  settingOption: {
    minWidth: 70,
  },
});
