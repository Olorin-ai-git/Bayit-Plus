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

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Video, { TextTrackType, VideoRef } from 'react-native-video';
import { API_BASE_URL } from '../config/appConfig';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { useResponsive } from '../hooks/useResponsive';
import { BottomSheet } from '../components';
import { GlassView, GlassButton } from '@bayit/shared';
import { spacing, colors, typography, touchTarget } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  X,
  Settings,
} from 'lucide-react-native';

type PlayerRoute = RouteProp<RootStackParamList, 'Player'>;

export const PlayerScreenMobile: React.FC = () => {
  const route = useRoute<PlayerRoute>();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isRTL, direction } = useDirection();
  const { isPhone, orientation } = useResponsive();

  const { id, title, type } = route.params;

  const videoRef = useRef<VideoRef>(null);
  const [showControls, setShowControls] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Settings state
  const [quality, setQuality] = useState('auto');
  const [subtitles, setSubtitles] = useState('off');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [availableSubtitles, setAvailableSubtitles] = useState<any[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);

  const translateY = useSharedValue(0);

  // Fetch available subtitles
  useEffect(() => {
    const fetchSubtitles = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/subtitles/${id}/tracks`);
        if (response.ok) {
          const data = await response.json();
          setAvailableSubtitles(data.tracks || []);

          // Convert to react-native-video format
          const tracks = (data.tracks || []).map((track: any) => ({
            title: track.language_name,
            language: track.language,
            type: TextTrackType.VTT,
            uri: `${API_BASE_URL}/api/v1/subtitles/${id}/${track.language}/vtt`,
          }));
          setSubtitleTracks(tracks);
        }
      } catch (error) {
        console.error('Failed to fetch subtitles:', error);
      }
    };

    if (id) {
      fetchSubtitles();
    }
  }, [id]);

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

  const handleRestart = () => {
    videoRef.current?.seek(0);
    setCurrentTime(0);
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactLight');
    }
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
          source={{ uri: `${API_BASE_URL.replace('/api/v1', '')}/stream/${id}` }}
          style={styles.video}
          resizeMode="contain"
          paused={!isPlaying}
          playbackRate={playbackSpeed}
          onProgress={handleProgress}
          onLoad={handleLoad}
          textTracks={subtitleTracks}
          selectedTextTrack={
            subtitles === 'off'
              ? undefined
              : { type: 'language', value: subtitles }
          }
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
                    <X size={24} color={colors.text} strokeWidth={2.5} />
                  </Pressable>
                </GlassView>
              </View>

              {/* Center controls - play/pause */}
              <View style={styles.centerControls}>
                <Pressable
                  onPress={() => handleSeek(-10)}
                  style={[styles.controlButton, styles.seekButton]}
                >
                  <SkipBack size={28} color={colors.text} fill={colors.text} />
                </Pressable>

                <Pressable
                  onPress={handlePlayPause}
                  style={[styles.controlButton, styles.playButton]}
                >
                  {isPlaying ? (
                    <Pause size={36} color={colors.text} fill={colors.text} />
                  ) : (
                    <Play size={36} color={colors.text} fill={colors.text} style={{ marginLeft: 4 }} />
                  )}
                </Pressable>

                <Pressable
                  onPress={() => handleSeek(10)}
                  style={[styles.controlButton, styles.seekButton]}
                >
                  <SkipForward size={28} color={colors.text} fill={colors.text} />
                </Pressable>

                {type !== 'live' && (
                  <Pressable
                    onPress={handleRestart}
                    style={[styles.controlButton, styles.seekButton]}
                  >
                    <RotateCcw size={24} color={colors.text} strokeWidth={2.5} />
                  </Pressable>
                )}
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
                      <Settings size={24} color={colors.text} />
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
          <Text style={styles.sheetTitle}>{t('player.settings')}</Text>

          {/* Quality selection */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>{t('player.quality')}</Text>
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
            <Text style={styles.settingLabel}>{t('player.subtitles')}</Text>
            <View style={styles.settingOptions}>
              <GlassButton
                key="off"
                variant={subtitles === 'off' ? 'primary' : 'secondary'}
                onPress={() => setSubtitles('off')}
                style={styles.settingOption}
              >
                {t('player.subtitlesOff')}
              </GlassButton>
              {availableSubtitles.map((track) => (
                <GlassButton
                  key={track.language}
                  variant={subtitles === track.language ? 'primary' : 'secondary'}
                  onPress={() => setSubtitles(track.language)}
                  style={styles.settingOption}
                >
                  {track.language_name}
                </GlassButton>
              ))}
            </View>
          </View>

          {/* Playback speed */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>{t('player.speed')}</Text>
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
    backgroundColor: 'rgba(168, 85, 247, 0.9)',
  },
  seekButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
