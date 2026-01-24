import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PreviewHeroMetadata {
  year?: number;
  rating?: string;
  imdbRating?: number;
  duration?: string;
  genre?: string;
  episodeCount?: number;
  seasonCount?: number;
}

interface PreviewHeroProps {
  title: string;
  description?: string;
  backdropUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  trailerUrl?: string;
  category?: string;
  metadata?: PreviewHeroMetadata;
  previewDuration?: number; // in milliseconds, default 5000
  onPlay: () => void;
  onAddToList?: () => void;
  onShare?: () => void;
  children?: React.ReactNode; // For season/episode selectors
  isInWatchlist?: boolean;
  isFavorite?: boolean;
}

/**
 * PreviewHero Component
 * A hero section with 5-second auto-play video preview that stops and shows poster.
 * Cross-platform support for web, TV, and mobile.
 */
export const PreviewHero: React.FC<PreviewHeroProps> = ({
  title,
  description,
  backdropUrl,
  thumbnailUrl,
  previewUrl,
  trailerUrl,
  category,
  metadata,
  previewDuration = 5000,
  onPlay,
  onAddToList,
  onShare,
  children,
  isInWatchlist = false,
  isFavorite = false,
}) => {
  const { t } = useTranslation();
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const [focusedButton, setFocusedButton] = useState<string>('play');

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const videoFadeAnim = useRef(new Animated.Value(0)).current;
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<any>(null);

  // Start preview playback
  const startPreview = useCallback(() => {
    if (!previewUrl && !trailerUrl) return;

    setIsPreviewPlaying(true);
    setShowPoster(false);

    // Fade in video
    Animated.timing(videoFadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Set timer to stop after duration
    previewTimerRef.current = setTimeout(() => {
      stopPreview();
    }, previewDuration);
  }, [previewUrl, trailerUrl, previewDuration, videoFadeAnim]);

  // Stop preview and show poster
  const stopPreview = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    // Fade out video and show poster
    Animated.timing(videoFadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setIsPreviewPlaying(false);
      setShowPoster(true);
    });
  }, [videoFadeAnim]);

  // Auto-start preview on mount if preview URL exists
  useEffect(() => {
    if (previewUrl || trailerUrl) {
      // Small delay before starting preview
      const startTimer = setTimeout(() => {
        startPreview();
      }, 1000);

      return () => {
        clearTimeout(startTimer);
        if (previewTimerRef.current) {
          clearTimeout(previewTimerRef.current);
        }
      };
    }
  }, [previewUrl, trailerUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, []);

  // Handle video end (in case video is shorter than duration)
  const handleVideoEnd = () => {
    stopPreview();
  };

  // Handle video error
  const handleVideoError = () => {
    stopPreview();
  };

  // Format IMDB rating
  const formatImdbRating = (rating?: number) => {
    if (!rating) return null;
    return rating.toFixed(1);
  };

  // Get the video source URL
  const videoSource = previewUrl || trailerUrl;
  const posterSource = backdropUrl || thumbnailUrl;

  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.65, position: 'relative' }}>
      {/* Background Poster Image */}
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: showPoster ? 1 : 0.3 }}>
        <Image
          source={{ uri: posterSource }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </Animated.View>

      {/* Video Preview Layer */}
      {isPreviewPlaying && videoSource && (
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: videoFadeAnim }}>
          <Video
            ref={videoRef}
            source={{ uri: videoSource }}
            className="w-full h-full"
            resizeMode="cover"
            repeat={false}
            muted={true}
            onEnd={handleVideoEnd}
            onError={handleVideoError}
          />
        </Animated.View>
      )}

      {/* Gradient Overlays */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)']}
        className="absolute left-0 right-0 bottom-0 h-3/4"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="absolute left-0 top-0 bottom-0 w-3/5"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        className="absolute left-0 right-0 top-0 h-[150px]"
      />

      {/* Content */}
      <Animated.View
        style={{
          position: 'absolute',
          left: isTV ? 80 : 48,
          right: isTV ? 80 : 48,
          bottom: isTV ? 60 : 40,
          maxWidth: isTV ? 700 : 600,
          opacity: fadeAnim
        }}
      >
        {/* Category Badge */}
        {category && (
          <GlassView className="self-start px-4 py-1 rounded-full mb-4" intensity="light">
            <Text className="text-sm text-white font-medium">{category}</Text>
          </GlassView>
        )}

        {/* Title */}
        <Text
          className={`${isTV ? 'text-[52px]' : 'text-4xl'} font-bold text-white mb-2`}
          style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 }}
          numberOfLines={2}
        >
          {title}
        </Text>

        {/* Metadata Row */}
        <View className="flex-row items-center flex-wrap gap-4 mb-4">
          {metadata?.year && (
            <Text className="text-base text-textSecondary">{metadata.year}</Text>
          )}
          {metadata?.rating && (
            <View className="bg-white/20 px-2 py-0.5 rounded">
              <Text className="text-sm text-white font-semibold">{metadata.rating}</Text>
            </View>
          )}
          {metadata?.imdbRating && (
            <View className="flex-row items-center gap-1 bg-[#F5C518]/20 px-2 py-0.5 rounded">
              <Text className="text-sm">⭐</Text>
              <Text className="text-sm text-[#F5C518] font-bold">{formatImdbRating(metadata.imdbRating)}</Text>
            </View>
          )}
          {metadata?.duration && (
            <Text className="text-base text-textSecondary">{metadata.duration}</Text>
          )}
          {metadata?.genre && (
            <Text className="text-base text-textSecondary">{metadata.genre}</Text>
          )}
          {metadata?.seasonCount && (
            <Text className="text-base text-textSecondary">
              {metadata.seasonCount} {t('content.seasons')}
            </Text>
          )}
          {metadata?.episodeCount && (
            <Text className="text-base text-textSecondary">
              {metadata.episodeCount} {t('content.episodes')}
            </Text>
          )}
        </View>

        {/* Description */}
        {description && (
          <View
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: borderRadius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.05)',
              marginBottom: spacing.lg,
            }}
          >
            <Text
              className={`${isTV ? 'text-lg leading-7' : 'text-[15px] leading-[22px]'} text-white/95`}
              numberOfLines={3}
            >
              {description}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row flex-wrap gap-4 mb-6">
          <TouchableOpacity
            className={`flex-row items-center gap-2 bg-primary rounded-lg ${
              isTV ? 'px-8 py-4' : 'px-6 py-3'
            } ${focusedButton === 'play' ? 'border-[3px] border-white scale-105' : ''}`}
            onPress={onPlay}
            onFocus={() => setFocusedButton('play')}
            activeOpacity={0.8}
          >
            <Text className={`${isTV ? 'text-xl' : 'text-base'} text-white`}>▶</Text>
            <Text className={`${isTV ? 'text-lg' : 'text-base'} font-semibold text-white`}>{t('content.play')}</Text>
          </TouchableOpacity>

          {onAddToList && (
            <TouchableOpacity
              className={`flex-row items-center gap-2 bg-white/15 rounded-lg border border-white/20 ${
                isTV ? 'px-6 py-4' : 'px-5 py-3'
              } ${focusedButton === 'list' ? 'border-[3px] border-white scale-105' : ''}`}
              onPress={onAddToList}
              onFocus={() => setFocusedButton('list')}
              activeOpacity={0.8}
            >
              <Text className={`${isTV ? 'text-lg' : 'text-sm'} text-white`}>{isInWatchlist ? '✓' : '+'}</Text>
              <Text className={`${isTV ? 'text-base' : 'text-sm'} font-medium text-white`}>
                {isInWatchlist ? t('content.inList') : t('content.addToList')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Replay preview button when poster is shown */}
          {showPoster && (previewUrl || trailerUrl) && (
            <TouchableOpacity
              className={`flex-row items-center gap-2 bg-white/15 rounded-lg border border-white/20 ${
                isTV ? 'px-6 py-4' : 'px-5 py-3'
              } ${focusedButton === 'preview' ? 'border-[3px] border-white scale-105' : ''}`}
              onPress={startPreview}
              onFocus={() => setFocusedButton('preview')}
              activeOpacity={0.8}
            >
              <Text className={`${isTV ? 'text-base' : 'text-sm'}`}>🎬</Text>
              <Text className={`${isTV ? 'text-base' : 'text-sm'} font-medium text-white`}>{t('content.preview')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Children slot for season/episode selectors */}
        {children && (
          <View className="mt-4">
            {children}
          </View>
        )}
      </Animated.View>

      {/* Preview indicator */}
      {isPreviewPlaying && (
        <View
          className={`absolute ${isTV ? 'top-[30px] right-20' : 'top-5 right-12'} flex-row items-center gap-2 bg-black/60 px-4 py-2 rounded-full`}
        >
          <View className="w-2 h-2 rounded-full bg-[#ff4444]" />
          <Text className="text-sm text-white font-medium">{t('content.previewPlaying')}</Text>
        </View>
      )}
    </View>
  );
};

export default PreviewHero;
