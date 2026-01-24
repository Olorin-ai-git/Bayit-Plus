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

import React, { useState, useRef, useEffect } from "react";
import { View, Pressable, Text, Platform } from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import Video, { TextTrackType, VideoRef } from "react-native-video";
import { WebView } from "react-native-webview";

/**
 * Check if a URL is a YouTube URL (any format)
 */
const isYouTubeUrl = (url: string): boolean => {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes("youtube.com/") || lowerUrl.includes("youtu.be/");
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
import { API_BASE_URL } from "../config/appConfig";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { useTranslation } from "react-i18next";
import { useDirection } from "@bayit/shared-hooks";
import { useResponsive } from "../hooks/useResponsive";
import { BottomSheet } from "../components";
import {
  ChapterListMobile,
  ChapterMarkers,
  Chapter,
} from "../components/player";
import { GlassView, GlassButton } from "@bayit/shared";
import { colors } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import logger from '@/utils/logger';


const moduleLogger = logger.scope('PlayerScreenMobile');

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  X,
  Settings,
  List,
} from "lucide-react-native";

type PlayerRoute = RouteProp<RootStackParamList, "Player">;

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
  const [quality, setQuality] = useState("auto");
  const [subtitles, setSubtitles] = useState("off");
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
          setStreamUrl(`${API_BASE_URL.replace("/api/v1", "")}/stream/${id}`);
          setIsYouTube(false);
        }
      } catch (error) {
        moduleLogger.error("Failed to fetch stream URL:", error);
        // Fallback
        setStreamUrl(`${API_BASE_URL.replace("/api/v1", "")}/stream/${id}`);
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
        moduleLogger.error("Failed to fetch subtitles:", error);
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
        moduleLogger.error("Failed to fetch chapters:", error);
      } finally {
        setChaptersLoading(false);
      }
    };

    if (id && type === "vod") {
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
    if (Platform.OS === "ios") {
      ReactNativeHapticFeedback.trigger("impactMedium");
    }
    navigation.goBack();
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (Platform.OS === "ios") {
      ReactNativeHapticFeedback.trigger("impactLight");
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
    if (Platform.OS === "ios") {
      ReactNativeHapticFeedback.trigger("impactLight");
    }
  };

  const handleRestart = () => {
    videoRef.current?.seek(0);
    setCurrentTime(0);
    if (Platform.OS === "ios") {
      ReactNativeHapticFeedback.trigger("impactLight");
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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Build YouTube embed URL with autoplay
  const youtubeEmbedUrl =
    streamUrl && isYouTube
      ? `https://www.youtube.com/embed/${getYouTubeVideoId(streamUrl)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
      : null;

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View className="flex-1 bg-black" style={animatedStyle}>
        {/* Video player - WebView for YouTube, native Video for other content */}
        {streamLoading ? (
          <View className="absolute inset-0 justify-center items-center bg-black">
            <Text style={{ color: colors.text }} className="text-base">
              {t("player.loading")}
            </Text>
          </View>
        ) : isYouTube && youtubeEmbedUrl ? (
          <WebView
            source={{ uri: youtubeEmbedUrl }}
            className="absolute inset-0"
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            // Security configuration
            originWhitelist={["https://", "youtube.com", "www.youtube.com"]}
            mixedContentMode="never"
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
            source={{
              uri:
                streamUrl ||
                `${API_BASE_URL.replace("/api/v1", "")}/stream/${id}`,
            }}
            className="absolute inset-0"
            resizeMode="contain"
            paused={!isPlaying}
            playbackRate={playbackSpeed}
            onProgress={handleProgress}
            onLoad={handleLoad}
            textTracks={subtitleTracks}
            selectedTextTrack={
              subtitles === "off"
                ? undefined
                : { type: "language", value: subtitles }
            }
          />
        )}

        {/* Controls layer with integrated tap handling */}
        {/* For YouTube content, only show top bar (title + close) since YouTube has its own controls */}
        {showControls ? (
          <Pressable className="absolute inset-0 justify-between" onPress={toggleControls}>
            {/* Prevent button presses from triggering toggle */}
            {/* Top bar - title and close */}
            <View className="pt-8 px-6">
              <GlassView className="flex-row items-center justify-between py-2 px-4">
                <Text className="text-lg font-semibold flex-1" style={{ color: colors.text }} numberOfLines={1}>
                  {title}
                </Text>
                <Pressable
                  onPress={handleClose}
                  className="w-11 h-11 justify-center items-center"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color={colors.text} strokeWidth={2.5} />
                </Pressable>
              </GlassView>
            </View>

            {/* Center controls - play/pause (hidden for YouTube - it has its own controls) */}
            {!isYouTube && (
              <View className="flex-row justify-center items-center w-full relative">
                <View className="flex-row justify-center items-center gap-8">
                  <Pressable
                    onPress={() => handleSeek(-10)}
                    className="w-[60px] h-[60px] rounded-full bg-black/50 justify-center items-center"
                  >
                    <SkipBack
                      size={28}
                      color={colors.text}
                      fill={colors.text}
                    />
                  </Pressable>

                  <Pressable
                    onPress={handlePlayPause}
                    className="w-20 h-20 rounded-full bg-purple-500/90 justify-center items-center"
                  >
                    {isPlaying ? (
                      <Pause size={36} color={colors.text} fill={colors.text} />
                    ) : (
                      <Play
                        size={36}
                        color={colors.text}
                        fill={colors.text}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => handleSeek(10)}
                    className="w-[60px] h-[60px] rounded-full bg-black/50 justify-center items-center"
                  >
                    <SkipForward
                      size={28}
                      color={colors.text}
                      fill={colors.text}
                    />
                  </Pressable>
                </View>

                {/* Restart button positioned separately */}
                {type !== "live" && (
                  <Pressable
                    onPress={handleRestart}
                    className="absolute right-8 w-[60px] h-[60px] rounded-full bg-black/50 justify-center items-center"
                  >
                    <RotateCcw
                      size={24}
                      color={colors.text}
                      strokeWidth={2.5}
                    />
                  </Pressable>
                )}
              </View>
            )}

            {/* Bottom bar - progress and settings (hidden for YouTube) */}
            {!isYouTube && type !== "live" && (
              <View className="pb-8 px-6">
                <GlassView className="py-4 px-6">
                  {/* Time */}
                  <Text className="text-xs mb-2" style={{ color: colors.text }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </Text>

                  {/* Progress bar with chapter markers */}
                  <View
                    className="h-1 bg-white/30 rounded mb-4 relative"
                    onLayout={(e) =>
                      setProgressBarWidth(e.nativeEvent.layout.width)
                    }
                  >
                    <View
                      className="h-full rounded"
                      style={{
                        width: `${(currentTime / duration) * 100}%`,
                        backgroundColor: colors.primary,
                      }}
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
                  <View className="flex-row justify-between items-center">
                    {/* Chapters button */}
                    {chapters.length > 0 && (
                      <Pressable
                        onPress={() => setChaptersVisible(true)}
                        className="flex-row items-center gap-1 py-1 px-2"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <List size={20} color={colors.text} />
                        <Text className="text-xs" style={{ color: colors.text }}>
                          {t("player.chapters")} ({chapters.length})
                        </Text>
                      </Pressable>
                    )}

                    {/* Settings button */}
                    <Pressable
                      onPress={() => setSettingsVisible(true)}
                      className="w-11 h-11 justify-center items-center"
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
          <Pressable className="absolute inset-0" onPress={toggleControls} />
        )}

        {/* Chapters bottom sheet */}
        <BottomSheet
          visible={chaptersVisible}
          onClose={() => setChaptersVisible(false)}
          height={450}
        >
          <Text className="text-xl font-semibold mb-6" style={{ color: colors.text }}>
            {t("player.chapters")}
          </Text>
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
          <Text className="text-xl font-semibold mb-6" style={{ color: colors.text }}>
            {t("player.settings")}
          </Text>

          {/* Quality selection */}
          <View className="mb-6">
            <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
              {t("player.quality")}
            </Text>
            <View className="flex-row gap-2 flex-wrap">
              {["auto", "1080p", "720p", "480p"].map((q) => (
                <GlassButton
                  key={q}
                  variant={quality === q ? "primary" : "secondary"}
                  onPress={() => setQuality(q)}
                  className="min-w-[70px]"
                >
                  {q}
                </GlassButton>
              ))}
            </View>
          </View>

          {/* Subtitles */}
          <View className="mb-6">
            <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
              {t("player.subtitles")}
            </Text>
            <View className="flex-row gap-2 flex-wrap">
              <GlassButton
                key="off"
                variant={subtitles === "off" ? "primary" : "secondary"}
                onPress={() => setSubtitles("off")}
                className="min-w-[70px]"
              >
                {t("player.subtitlesOff")}
              </GlassButton>
              {availableSubtitles.map((track) => (
                <GlassButton
                  key={track.language}
                  variant={
                    subtitles === track.language ? "primary" : "secondary"
                  }
                  onPress={() => setSubtitles(track.language)}
                  className="min-w-[70px]"
                >
                  {track.language_name}
                </GlassButton>
              ))}
            </View>
          </View>

          {/* Playback speed */}
          <View className="mb-6">
            <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
              {t("player.speed")}
            </Text>
            <View className="flex-row gap-2 flex-wrap">
              {[0.5, 1.0, 1.5, 2.0].map((speed) => (
                <GlassButton
                  key={speed}
                  variant={playbackSpeed === speed ? "primary" : "secondary"}
                  onPress={() => setPlaybackSpeed(speed)}
                  className="min-w-[70px]"
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

export default PlayerScreenMobile;
