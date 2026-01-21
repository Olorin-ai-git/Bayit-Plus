import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Image, Dimensions } from 'react-native';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Check, Share2, Star } from 'lucide-react';
import Hls from 'hls.js';
import LinearGradient from 'react-native-linear-gradient';
import { useDirection } from '@/hooks/useDirection';
import ContentCarousel from '@/components/content/ContentCarousel';
import { contentService, watchlistService, favoritesService, subtitlesService } from '@/services/api';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';
import { getLanguageInfo, SubtitleTrack } from '@/types/subtitle';
import { GlassCard, GlassButton, GlassView, GlassBadge, GlassTooltip } from '@bayit/shared/ui';
import { useFullscreenPlayerStore } from '@/stores/fullscreenPlayerStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MovieData {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  category?: string;
  duration?: string;
  year?: number;
  rating?: string;
  genre?: string;
  cast?: string[];
  director?: string;
  trailer_url?: string;
  preview_url?: string;
  stream_url?: string;
  tmdb_id?: number;
  imdb_id?: string;
  imdb_rating?: number;
  imdb_votes?: number;
  related: any[];
  available_subtitle_languages?: string[];
  has_subtitles?: boolean;
}

export default function MovieDetailPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { movieId } = useParams<{ movieId: string }>();
  const navigate = useNavigate();

  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleTrack[]>([]);
  const openPlayer = useFullscreenPlayerStore((state) => state.openPlayer);

  // Video preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load movie details
  useEffect(() => {
    if (movieId) {
      loadMovieDetails();
    }
    return () => {
      cleanup();
    };
  }, [movieId]);

  // Load available subtitles
  useEffect(() => {
    if (movieId) {
      subtitlesService.getTracks(movieId)
        .then((response) => {
          if (response?.tracks) {
            setAvailableSubtitles(response.tracks);
          }
        })
        .catch(() => {
          // Subtitles may not be available, ignore error
        });
    }
  }, [movieId]);

  // Get preview URL with stream fallback
  const getPreviewUrl = useCallback((): string | null => {
    if (movie?.preview_url) return movie.preview_url;
    if (movie?.trailer_url) return movie.trailer_url;
    if (movie?.stream_url) return movie.stream_url;  // Fallback to first 5 sec of movie
    return null;
  }, [movie]);

  // Auto-start preview on load
  useEffect(() => {
    const previewUrl = getPreviewUrl();
    if (previewUrl && showPoster) {
      const timer = setTimeout(() => {
        startPreview();
      }, 800);
      return () => clearTimeout(timer);
    }
    return () => stopPreview();
  }, [movie?.id, getPreviewUrl]);

  const cleanup = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
  };

  const loadMovieDetails = async () => {
    setLoading(true);
    try {
      const data = await contentService.getMovieDetails(movieId!);
      setMovie(data);
    } catch (error) {
      console.error('Failed to load movie details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if URL is a YouTube URL (can't be previewed inline)
  const isYouTubeUrl = useCallback((url: string | null): boolean => {
    if (!url) return false;
    return url.includes('youtube.com/embed/') || url.includes('youtu.be/') || url.includes('youtube.com/watch');
  }, []);

  // Video preview functions
  const startPreview = useCallback(() => {
    const previewUrl = getPreviewUrl();
    if (!previewUrl) return;

    // Skip preview for YouTube URLs - they can't be played inline
    if (isYouTubeUrl(previewUrl)) {
      return;
    }

    // Ensure video element exists
    if (!videoRef.current) {
      setTimeout(() => startPreview(), 100);
      return;
    }

    setIsPreviewPlaying(true);
    setShowPoster(false);

    const video = videoRef.current;
    video.muted = true;
    video.playsInline = true;

    if (previewUrl.includes('.m3u8') && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hls = new Hls({
        startLevel: -1,
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.loadSource(previewUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => stopPreview());
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) stopPreview();
      });
    } else if (previewUrl.includes('.m3u8') && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = previewUrl;
      video.load();
      video.play().catch(() => stopPreview());
    } else {
      video.src = previewUrl;
      video.load();
      video.play().catch(() => stopPreview());
    }

    // Stop after 20 seconds
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
    previewTimerRef.current = setTimeout(() => {
      stopPreview();
    }, 20000);
  }, [getPreviewUrl, isPreviewPlaying]);

  const stopPreview = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
    }

    // CSS transition handles the fade
    setIsPreviewPlaying(false);
    setShowPoster(true);
  }, []);

  const handlePlay = () => {
    if (movie) {
      openPlayer({
        id: movie.id,
        title: movie.title,
        src: '', // Will be fetched by the overlay
        poster: movie.backdrop || movie.thumbnail,
        type: 'movie',
      });
    }
  };

  const toggleWatchlist = async () => {
    if (!movie) return;
    try {
      const result = await watchlistService.toggleWatchlist(movie.id, 'movie');
      setInWatchlist(result.in_watchlist);
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    }
  };

  // Format IMDB votes
  const formatVotes = (votes?: number): string => {
    if (!votes) return '';
    if (votes >= 1000000) {
      return `${(votes / 1000000).toFixed(1)}M`;
    }
    if (votes >= 1000) {
      return `${(votes / 1000).toFixed(0)}K`;
    }
    return votes.toString();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0A0A0F]">
        <Text className="text-[#94A3B8] text-base">{t('common.loading')}</Text>
      </View>
    );
  }

  if (!movie) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0A0A0F]">
        <Text className="text-[#94A3B8] text-lg">{t('content.notFound')}</Text>
      </View>
    );
  }

  const backdropUrl = movie.backdrop || movie.thumbnail;

  return (
    <ScrollView className="flex-1 bg-[#0A0A0F]">
      {/* Hero Section */}
      <View className="relative" style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 }}>
        {/* Background Poster */}
        <View
          className="absolute inset-0"
          style={{
            opacity: isPreviewPlaying ? 0 : 1,
            // @ts-ignore - Web CSS transition
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          <Image
            source={{ uri: backdropUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>

        {/* Video Preview - always render for ref availability */}
        <View
          className="absolute inset-0"
          style={{
            opacity: isPreviewPlaying ? 1 : 0,
            // @ts-ignore - Web CSS transition
            transition: 'opacity 0.5s ease-in-out',
            zIndex: isPreviewPlaying ? 5 : 1,
          }}
          pointerEvents="none"
        >
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            muted
            autoPlay
            playsInline
          />
        </View>

        {/* Gradients */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)']}
          className="absolute left-0 right-0 bottom-0"
          style={{ height: '75%' }}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="absolute left-0 top-0 bottom-0"
          style={{ width: '60%' }}
          pointerEvents="none"
        />

        {/* Content */}
        <View className="absolute left-12 right-12 bottom-12 max-w-[650px]">
          {/* Category Badge */}
          {movie.category && (
            <GlassView className="self-start px-4 py-1 rounded-full mb-4">
              <Text className="text-sm text-white font-medium">{movie.category}</Text>
            </GlassView>
          )}

          {/* Title */}
          <Text className="text-[42px] font-bold text-white mb-2">{movie.title}</Text>

          {/* Metadata Row */}
          <View className="flex-row items-center flex-wrap gap-4 mb-4" style={{ flexDirection }}>
            {movie.year && <Text className="text-base text-[#94A3B8]">{movie.year}</Text>}
            {movie.rating && (
              <GlassBadge variant="default" size="sm">{movie.rating}</GlassBadge>
            )}
            {movie.duration && <Text className="text-base text-[#94A3B8]">{movie.duration}</Text>}
            {movie.genre && <Text className="text-base text-[#94A3B8]">{movie.genre}</Text>}
          </View>

          {/* IMDB Rating */}
          {movie.imdb_rating && (
            <View className="flex-row items-center gap-2 mb-4 bg-black/40 px-4 py-2 rounded-lg self-start">
              <View className="bg-[#F5C518] px-2 py-0.5 rounded">
                <Text className="text-sm font-black text-black" style={{ letterSpacing: -0.5 }}>IMDb</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Star size={18} color="#F5C518" fill="#F5C518" />
                <Text className="text-xl font-bold text-[#F5C518]">
                  {movie.imdb_rating.toFixed(1)}
                </Text>
                <Text className="text-base text-[#94A3B8]">/10</Text>
              </View>
              {movie.imdb_votes && (
                <Text className="text-sm text-[#94A3B8]">
                  ({formatVotes(movie.imdb_votes)} {t('content.votes')})
                </Text>
              )}
            </View>
          )}

          {/* Available Subtitles */}
          {availableSubtitles.length > 0 && (
            <View className="flex-row items-center gap-2 mb-4 bg-black/40 px-4 py-2 rounded-lg self-start">
              <Text className="text-sm text-[#94A3B8] font-medium">{t('subtitles.available', 'Subtitles')}:</Text>
              <View className="flex-row items-center gap-1">
                {availableSubtitles.map((track) => {
                  const langInfo = getLanguageInfo(track.language);
                  return (
                    <Text key={track.id} className="text-xl">
                      {langInfo?.flag || '🌐'}
                    </Text>
                  );
                })}
              </View>
            </View>
          )}

          {/* Description */}
          {movie.description && (
            <Text className="text-base text-white/85 leading-6 mb-6" style={{ textAlign }} numberOfLines={4}>
              {movie.description}
            </Text>
          )}

          {/* Action Buttons */}
          <View className="flex-row flex-wrap gap-4 mb-6" style={{ flexDirection }}>
            <GlassButton
              onPress={handlePlay}
              variant="primary"
              size="lg"
              icon={<Play size={20} color="#fff" fill="#fff" />}
              title={t('content.play')}
            />

            <GlassButton
              onPress={toggleWatchlist}
              variant="ghost"
              size="lg"
              icon={inWatchlist ? <Check size={20} color="#fff" /> : <Plus size={20} color="#fff" />}
              title={inWatchlist ? t('content.inList') : t('content.addToList')}
            />

            {movie.trailer_url ? (
              <GlassButton
                onPress={() => {
                  // Open trailer in fullscreen player
                  openPlayer({
                    id: `${movie.id}-trailer`,
                    title: `${movie.title} - ${t('content.trailer')}`,
                    src: movie.trailer_url!,
                    poster: movie.backdrop || movie.thumbnail,
                    type: 'vod',
                  });
                }}
                variant="ghost"
                size="lg"
                title={t('content.watchTrailer')}
              />
            ) : (
              <GlassTooltip content={t('content.trailerNotAvailable', 'Trailer not available for this title')}>
                <GlassButton
                  variant="ghost"
                  size="lg"
                  title={t('content.watchTrailer')}
                  disabled
                  style={{ opacity: 0.5 }}
                />
              </GlassTooltip>
            )}
          </View>

          {/* Preview indicator */}
          {isPreviewPlaying && (
            <View className="flex-row items-center gap-2 bg-black/60 px-4 py-2 rounded-full self-start">
              <View className="w-2 h-2 rounded-full bg-[#ff4444]" />
              <Text className="text-sm text-white font-medium">{t('content.trailerPlaying')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Movie Facts Section */}
      <View className="px-12 py-6">
        <Text className="text-lg font-semibold text-white mb-4">{t('content.details')}</Text>

        <GlassCard className="p-6">
          {movie.director && (
            <View className="flex-row mb-2">
              <Text className="w-[100px] text-base text-[#94A3B8]">{t('content.director')}</Text>
              <Text className="flex-1 text-base text-white font-medium">{movie.director}</Text>
            </View>
          )}
          {movie.cast && movie.cast.length > 0 && (
            <View className="flex-row mb-2">
              <Text className="w-[100px] text-base text-[#94A3B8]">{t('content.starring')}</Text>
              <Text className="flex-1 text-base text-white font-medium" numberOfLines={2}>
                {movie.cast.slice(0, 5).join(', ')}
              </Text>
            </View>
          )}
          {movie.genre && (
            <View className="flex-row mb-2">
              <Text className="w-[100px] text-base text-[#94A3B8]">{t('content.genre')}</Text>
              <Text className="flex-1 text-base text-white font-medium">{movie.genre}</Text>
            </View>
          )}
          {movie.duration && (
            <View className="flex-row mb-2">
              <Text className="w-[100px] text-base text-[#94A3B8]">{t('content.runtime')}</Text>
              <Text className="flex-1 text-base text-white font-medium">{movie.duration}</Text>
            </View>
          )}
          {movie.year && (
            <View className="flex-row mb-2">
              <Text className="w-[100px] text-base text-[#94A3B8]">{t('content.released')}</Text>
              <Text className="flex-1 text-base text-white font-medium">{movie.year}</Text>
            </View>
          )}
        </GlassCard>
      </View>

      {/* Synopsis Section */}
      {movie.description && (
        <View className="px-12 py-6">
          <Text className="text-lg font-semibold text-white mb-4">{t('content.synopsis')}</Text>
          <Text className="text-base text-[#94A3B8] leading-[26px]" style={{ textAlign }}>
            {movie.description}
          </Text>
        </View>
      )}

      {/* Related Content */}
      {movie.related && movie.related.length > 0 && (
        <ContentCarousel
          title={t('content.youMayAlsoLike')}
          items={movie.related}
        />
      )}
    </ScrollView>
  );
}
