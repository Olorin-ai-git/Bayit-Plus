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
import { WebView } from 'react-native-webview';

/**
 * Check if a URL is a YouTube URL (any format)
 */
const isYouTubeUrl = (url: string): boolean => {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('youtube.com/') || lowerUrl.includes('youtu.be/');
};

/**
 * Extract YouTube video ID from various URL formats
 */
const getYouTubeVideoId = (url: string): string | null => {
  // Match youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];

  // Match youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];

  // Match youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  return null;
};
import { API_BASE_URL } from '../config/appConfig';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { useResponsive } from '../hooks/useResponsive';
import { BottomSheet } from '../components';
import { ChapterListMobile, ChapterMarkers, Chapter } from '../components/player';
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
  List,
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
  const [chaptersVisible, setChaptersVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  // Settings state
  const [quality, setQuality] = useState('auto');
  const [subtitles, setSubtitles] = useState('off');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [availableSubtitles, setAvailableSubtitles] = useState<any[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);

  // Chapters state
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  // Stream URL state (for YouTube detection)
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [streamLoading, setStreamLoading] = useState(true);

  const translateY = useSharedValue(0);

  // Fetch stream URL to detect YouTube content
  useEffect(() => {
    const fetchStreamUrl = async () => {
      try {
        setStreamLoading(true);
        const response = await fetch(`${API_BASE_URL}/content/${id}/stream`);
        if (response.ok) {
          const data = await response.json();
          const url = data.url;
          setStreamUrl(url);
          setIsYouTube(isYouTubeUrl(url));
        } else {
          // Fallback to direct stream endpoint
          setStreamUrl(`${API_BASE_URL.replace('/api/v1', '')}/stream/${id}`);
          setIsYouTube(false);
        }
      } catch (error) {
        console.error('Failed to fetch stream URL:', error);
        // Fallback
        setStreamUrl(`${API_BASE_URL.replace('/api/v1', '')}/stream/${id}`);
        setIsYouTube(false);
      } finally {
        setStreamLoading(false);
      }
    };

    if (id) {
      fetchStreamUrl();
    }
  }, [id]);

  // Fetch available subtitles
  useEffect(() => {
    const fetchSubtitles = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/subtitles/${id}/tracks`);
        if (response.ok) {
          const data = await response.json();
          setAvailableSubtitles(data.tracks || []);

          // Convert to react-native-video format
          const tracks = (data.tracks || []).map((track: any) => ({
            title: track.language_name,
            language: track.language,
            type: TextTrackType.VTT,
            uri: `${API_BASE_URL}/subtitles/${id}/${track.language}/vtt`,
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

  // Fetch chapters
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        setChaptersLoading(true);
        const response = await fetch(`${API_BASE_URL}/chapters/${id}`);
        if (response.ok) {
          const data = await response.json();
          setChapters(data.chapters || []);
        }
      } catch (error) {
        console.error('Failed to fetch chapters:', error);
      } finally {
        setChaptersLoading(false);
      }
    };

    if (id && type === 'vod') {
      fetchChapters();
    }
  }, [id, type]);

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

  const handleSeekToTime = (time: number) => {
    videoRef.current?.seek(time);
    setCurrentTime(time);
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactLight');
    }
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

  // Build YouTube embed URL with autoplay
  const youtubeEmbedUrl = streamUrl && isYouTube
    ? `https://www.youtube.com/embed/${getYouTubeVideoId(streamUrl)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
    : null;

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* Video player - WebView for YouTube, native Video for other content */}
        {streamLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('player.loading')}</Text>
          </View>
        ) : isYouTube && youtubeEmbedUrl ? (
          <WebView
            source={{ uri: youtubeEmbedUrl }}
            style={styles.video}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            // Security configuration
            originWhitelist={['https://', 'youtube.com', 'www.youtube.com']}
            mixedContentMode="never"
            allowsFullscreenVideo={true}
            scalesPageToFit={true}
            userAgent={`BayitPlus-iOS/${Platform.Version}`}
            // Disable geolocation access
            geolocationEnabled={false}
            // Disable third-party cookies
            thirdPartyCookiesEnabled={false}
            // Disable caching for sensitive data
            cacheEnabled={false}
          />
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: streamUrl || `${API_BASE_URL.replace('/api/v1', '')}/stream/${id}` }}
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
        )}

        {/* Controls layer with integrated tap handling */}
        {/* For YouTube content, only show top bar (title + close) since YouTube has its own controls */}
        {showControls ? (
          <Pressable
            style={styles.controlsContainer}
            onPress={toggleControls}
          >
              {/* Prevent button presses from triggering toggle */}
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

              {/* Center controls - play/pause (hidden for YouTube - it has its own controls) */}
              {!isYouTube && <View style={styles.centerControlsWrapper}>
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
                </View>

                {/* Restart button positioned separately */}
                {type !== 'live' && (
                  <Pressable
                    onPress={handleRestart}
                    style={[styles.controlButton, styles.restartButton]}
                  >
                    <RotateCcw size={24} color={colors.text} strokeWidth={2.5} />
                  </Pressable>
                )}
              </View>}

              {/* Bottom bar - progress and settings (hidden for YouTube) */}
              {!isYouTube && type !== 'live' && (
                <View style={styles.bottomBar}>
                  <GlassView style={styles.bottomBarContent}>
                    {/* Time */}
                    <Text style={styles.timeText}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </Text>

                    {/* Progress bar with chapter markers */}
                    <View
                      style={styles.progressBarContainer}
                      onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
                    >
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${(currentTime / duration) * 100}%` },
                        ]}
                      />
                      {chapters.length > 0 && progressBarWidth > 0 && (
                        <ChapterMarkers
                          chapters={chapters}
                          duration={duration}
                          currentTime={currentTime}
                          onSeek={handleSeekToTime}
                          progressBarWidth={progressBarWidth}
                        />
                      )}
                    </View>

                    {/* Bottom buttons row */}
                    <View style={styles.bottomButtonsRow}>
                      {/* Chapters button */}
                      {chapters.length > 0 && (
                        <Pressable
                          onPress={() => setChaptersVisible(true)}
                          style={styles.bottomButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <List size={20} color={colors.text} />
                          <Text style={styles.bottomButtonText}>
                            {t('player.chapters')} ({chapters.length})
                          </Text>
                        </Pressable>
                      )}

                      {/* Settings button */}
                      <Pressable
                        onPress={() => setSettingsVisible(true)}
                        style={styles.settingsButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Settings size={24} color={colors.text} />
                      </Pressable>
                    </View>
                  </GlassView>
                </View>
              )}
          </Pressable>
        ) : (
          /* Tap overlay when controls hidden */
          <Pressable
            style={styles.overlay}
            onPress={toggleControls}
          />
        )}

        {/* Chapters bottom sheet */}
        <BottomSheet
          visible={chaptersVisible}
          onClose={() => setChaptersVisible(false)}
          height={450}
        >
          <Text style={styles.sheetTitle}>{t('player.chapters')}</Text>
          <ChapterListMobile
            chapters={chapters}
            currentTime={currentTime}
            isLoading={chaptersLoading}
            onSeek={handleSeekToTime}
            onClose={() => setChaptersVisible(false)}
          />
        </BottomSheet>

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
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    ...typography.body,
    color: colors.text,
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
  centerControlsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  restartButton: {
    position: 'absolute',
    right: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    marginBottom: spacing.md,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  bottomButtonText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
  },
  settingsButton: {
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
