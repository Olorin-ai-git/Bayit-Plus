import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
    <View style={styles.container}>
      {/* Background Poster Image */}
      <Animated.View style={[styles.backdropContainer, { opacity: showPoster ? 1 : 0.3 }]}>
        <Image
          source={{ uri: posterSource }}
          style={styles.backdrop}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Video Preview Layer */}
      {isPreviewPlaying && videoSource && (
        <Animated.View style={[styles.videoContainer, { opacity: videoFadeAnim }]}>
          <Video
            ref={videoRef}
            source={{ uri: videoSource }}
            style={styles.video}
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
        style={styles.gradientBottom}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientLeft}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={styles.gradientTop}
      />

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Category Badge */}
        {category && (
          <GlassView style={styles.categoryBadge} intensity="light">
            <Text style={styles.categoryText}>{category}</Text>
          </GlassView>
        )}

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{title}</Text>

        {/* Metadata Row */}
        <View style={styles.metadata}>
          {metadata?.year && (
            <Text style={styles.metaItem}>{metadata.year}</Text>
          )}
          {metadata?.rating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{metadata.rating}</Text>
            </View>
          )}
          {metadata?.imdbRating && (
            <View style={styles.imdbBadge}>
              <Text style={styles.imdbIcon}>⭐</Text>
              <Text style={styles.imdbRating}>{formatImdbRating(metadata.imdbRating)}</Text>
            </View>
          )}
          {metadata?.duration && (
            <Text style={styles.metaItem}>{metadata.duration}</Text>
          )}
          {metadata?.genre && (
            <Text style={styles.metaItem}>{metadata.genre}</Text>
          )}
          {metadata?.seasonCount && (
            <Text style={styles.metaItem}>
              {metadata.seasonCount} {t('content.seasons')}
            </Text>
          )}
          {metadata?.episodeCount && (
            <Text style={styles.metaItem}>
              {metadata.episodeCount} {t('content.episodes')}
            </Text>
          )}
        </View>

        {/* Description */}
        {description && (
          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              focusedButton === 'play' && styles.buttonFocused,
            ]}
            onPress={onPlay}
            onFocus={() => setFocusedButton('play')}
            activeOpacity={0.8}
          >
            <Text style={styles.playIcon}>▶</Text>
            <Text style={styles.primaryButtonText}>{t('content.play')}</Text>
          </TouchableOpacity>

          {onAddToList && (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                focusedButton === 'list' && styles.buttonFocused,
              ]}
              onPress={onAddToList}
              onFocus={() => setFocusedButton('list')}
              activeOpacity={0.8}
            >
              <Text style={styles.listIcon}>{isInWatchlist ? '✓' : '+'}</Text>
              <Text style={styles.secondaryButtonText}>
                {isInWatchlist ? t('content.inList') : t('content.addToList')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Replay preview button when poster is shown */}
          {showPoster && (previewUrl || trailerUrl) && (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                focusedButton === 'preview' && styles.buttonFocused,
              ]}
              onPress={startPreview}
              onFocus={() => setFocusedButton('preview')}
              activeOpacity={0.8}
            >
              <Text style={styles.previewIcon}>🎬</Text>
              <Text style={styles.secondaryButtonText}>{t('content.preview')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Children slot for season/episode selectors */}
        {children && (
          <View style={styles.childrenContainer}>
            {children}
          </View>
        )}
      </Animated.View>

      {/* Preview indicator */}
      {isPreviewPlaying && (
        <View style={styles.previewIndicator}>
          <View style={styles.previewDot} />
          <Text style={styles.previewText}>{t('content.previewPlaying')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
    position: 'relative',
  },
  backdropContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
  },
  gradientLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '60%',
  },
  gradientTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 150,
  },
  content: {
    position: 'absolute',
    left: isTV ? 80 : 48,
    right: isTV ? 80 : 48,
    bottom: isTV ? 60 : 40,
    maxWidth: isTV ? 700 : 600,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  title: {
    fontSize: isTV ? 52 : 36,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metaItem: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  ratingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  imdbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,197,24,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  imdbIcon: {
    fontSize: fontSize.sm,
  },
  imdbRating: {
    fontSize: fontSize.sm,
    color: '#F5C518',
    fontWeight: '700',
  },
  description: {
    fontSize: isTV ? 18 : 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: isTV ? 28 : 22,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: isTV ? 32 : 24,
    paddingVertical: isTV ? 16 : 12,
    borderRadius: borderRadius.lg,
  },
  playIcon: {
    fontSize: isTV ? 20 : 16,
    color: colors.text,
  },
  primaryButtonText: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.text,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: isTV ? 24 : 20,
    paddingVertical: isTV ? 16 : 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  listIcon: {
    fontSize: isTV ? 18 : 14,
    color: colors.text,
  },
  previewIcon: {
    fontSize: isTV ? 16 : 14,
  },
  secondaryButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.text,
  },
  buttonFocused: {
    borderWidth: 3,
    borderColor: '#fff',
    transform: [{ scale: 1.05 }],
  },
  childrenContainer: {
    marginTop: spacing.md,
  },
  previewIndicator: {
    position: 'absolute',
    top: isTV ? 30 : 20,
    right: isTV ? 80 : 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
  },
  previewText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
});

export default PreviewHero;
