import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Image, Dimensions, StyleSheet, Pressable, Modal } from 'react-native';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Check, Share2, Star, ChevronRight, X } from 'lucide-react';
import { NativeIcon } from '@olorin/shared-icons/native';
import Hls from 'hls.js';
import LinearGradient from 'react-native-linear-gradient';
import { useDirection } from '@/hooks/useDirection';
import ContentCarousel from '@/components/content/ContentCarousel';
import { contentService, watchlistService, favoritesService, subtitlesService } from '@/services/api';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { SubtitleTrack } from '@/types/subtitle';
import { FlagWithSparkle } from '@/components/common/FlagWithSparkle';
import { GlassCard, GlassButton, GlassView, GlassBadge, GlassTooltip } from '@bayit/shared/ui';
import { useFullscreenPlayerStore } from '@/stores/fullscreenPlayerStore';
import logger from '@/utils/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_MOBILE = SCREEN_WIDTH < 768;

// IMDB brand colors
const IMDB_YELLOW = '#f5c518';
const IMDB_TEXT = '#000000';

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
  is_kids_content?: boolean;
  age_rating?: string;
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
  const [showSubtitleModal, setShowSubtitleModal] = useState(false);
  const [selectedSubtitleLang, setSelectedSubtitleLang] = useState<string | null>(null);
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
      logger.error('Failed to load movie details', 'MovieDetailPage', error);
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
      logger.info('Opening player with pre-selected subtitle', 'MovieDetailPage', {
        movieId: movie.id,
        selectedSubtitle: selectedSubtitleLang
      });

      openPlayer({
        id: movie.id,
        title: movie.title,
        src: '', // Will be fetched by the overlay
        poster: movie.backdrop || movie.thumbnail,
        type: 'movie',
        is_kids_content: movie.is_kids_content,
        initialSubtitleLang: selectedSubtitleLang, // Pass pre-selected subtitle
      });
    }
  };

  const handleSubtitleSelect = (language: string) => {
    setSelectedSubtitleLang(language);
    setShowSubtitleModal(false);
    logger.info('Pre-selected subtitle', 'MovieDetailPage', { language });
  };

  const handleSubtitlePanelClick = () => {
    if (availableSubtitles.length > 0) {
      setShowSubtitleModal(true);
    }
  };

  const toggleWatchlist = async () => {
    if (!movie) return;
    try {
      const result = await watchlistService.toggleWatchlist(movie.id, 'movie');
      setInWatchlist(result.in_watchlist);
    } catch (error) {
      logger.error('Failed to toggle watchlist', 'MovieDetailPage', error);
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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>{t('content.notFound')}</Text>
      </View>
    );
  }

  const backdropUrl = movie.backdrop || movie.thumbnail;

  return (
    <ScrollView style={styles.scrollView}>
      {/* Hero Section */}
      <View style={[styles.heroSection, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 }]}>
        {/* Background Poster */}
        <View
          style={[
            styles.posterContainer,
            {
              opacity: isPreviewPlaying ? 0 : 1,
              // @ts-ignore - Web CSS transition
              transition: 'opacity 0.5s ease-in-out',
            },
          ]}
        >
          <Image
            source={{ uri: backdropUrl }}
            style={styles.backdropImage}
            resizeMode="cover"
          />
        </View>

        {/* Video Preview - always render for ref availability */}
        <View
          style={[
            styles.videoContainer,
            {
              opacity: isPreviewPlaying ? 1 : 0,
              // @ts-ignore - Web CSS transition
              transition: 'opacity 0.5s ease-in-out',
              zIndex: isPreviewPlaying ? 5 : 1,
            },
          ]}
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
          style={styles.bottomGradient}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.leftGradient}
          pointerEvents="none"
        />

        {/* Content */}
        <View style={[styles.heroContent, IS_MOBILE && styles.heroContentMobile]}>
          {/* Category Badge - hidden on mobile */}
          {!IS_MOBILE && movie.category && (
            <GlassView style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{movie.category}</Text>
            </GlassView>
          )}

          {/* Title */}
          <Text style={[styles.movieTitle, IS_MOBILE && styles.movieTitleMobile]}>{movie.title}</Text>

          {/* Metadata Row - hidden on mobile */}
          {!IS_MOBILE && (
            <View style={[styles.metadataRow, { flexDirection }]}>
              {movie.year && <Text style={styles.metadataText}>{movie.year}</Text>}
              {movie.rating && (
                <GlassBadge variant="default" size="sm">{movie.rating}</GlassBadge>
              )}
              {movie.duration && <Text style={styles.metadataText}>{movie.duration}</Text>}
              {movie.genre && <Text style={styles.metadataText}>{movie.genre}</Text>}
            </View>
          )}

          {/* IMDB Rating - hidden on mobile */}
          {!IS_MOBILE && movie.imdb_rating && (
            <View style={styles.imdbContainer}>
              <View style={styles.imdbBadge}>
                <Text style={styles.imdbLogoText}>IMDb</Text>
              </View>
              <View style={styles.imdbRatingRow}>
                <Star size={18} color={IMDB_YELLOW} fill={IMDB_YELLOW} />
                <Text style={styles.imdbRating}>
                  {movie.imdb_rating.toFixed(1)}
                </Text>
                <Text style={styles.imdbMaxRating}>/10</Text>
              </View>
              {movie.imdb_votes && (
                <Text style={styles.imdbVotes}>
                  ({formatVotes(movie.imdb_votes)} {t('content.votes')})
                </Text>
              )}
            </View>
          )}

          {/* Available Subtitles - hidden on mobile */}
          {!IS_MOBILE && availableSubtitles.length > 0 && (
            <Pressable onPress={handleSubtitlePanelClick} style={({ pressed }) => [
              styles.subtitlesContainer,
              pressed && styles.subtitlesContainerPressed
            ]}>
              <Text style={styles.subtitlesLabel}>{t('subtitles.available', 'Subtitles')}:</Text>
              <View style={styles.subtitlesFlagRow}>
                {/* Deduplicate tracks by language, keeping first occurrence */}
                {availableSubtitles
                  .filter((track, index, self) =>
                    self.findIndex(t => t.language === track.language) === index
                  )
                  .slice(0, 5)
                  .map((track) => {
                    // Check if track has any AI-enhanced versions
                    const hasAI = !!(
                      track.has_nikud_version ||
                      track.has_shoresh_version ||
                      track.has_heblish_version ||
                      track.has_grammar_flip_version ||
                      track.has_slang_synthesis_version
                    );
                    const isSelected = selectedSubtitleLang === track.language;
                    return (
                      <View key={track.id} style={[styles.subtitleFlag, isSelected && styles.subtitleFlagSelected]}>
                        <FlagWithSparkle
                          language={track.language}
                          hasAI={hasAI}
                          size="large"
                          showTooltip={true}
                        />
                      </View>
                    );
                  })}
                {availableSubtitles.length > 5 && (
                  <Text style={styles.moreSubtitlesText}>+{availableSubtitles.length - 5}</Text>
                )}
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
              {selectedSubtitleLang && (
                <View style={styles.selectedIndicator}>
                  <Check size={14} color={colors.primary.DEFAULT} />
                </View>
              )}
            </Pressable>
          )}

          {/* Description - hidden on mobile */}
          {!IS_MOBILE && movie.description && (
            <Text style={[styles.heroDescription, { textAlign }]} numberOfLines={4}>
              {movie.description}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={[
            styles.actionButtonsRow,
            { flexDirection },
            IS_MOBILE && styles.actionButtonsRowMobile,
          ]}>
            <GlassButton
              onPress={handlePlay}
              variant="primary"
              size="lg"
              icon={<Play size={20} color={colors.text} fill={colors.text} />}
              title={t('content.play')}
            />

            {/* Hide Add to List and Watch Trailer on mobile */}
            {!IS_MOBILE && (
              <>
                <GlassButton
                  onPress={toggleWatchlist}
                  variant="ghost"
                  size="lg"
                  icon={inWatchlist ? <Check size={20} color={colors.text} /> : <Plus size={20} color={colors.text} />}
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
                      style={styles.disabledButton}
                    />
                  </GlassTooltip>
                )}
              </>
            )}
          </View>

          {/* Preview indicator */}
          {isPreviewPlaying && (
            <View style={styles.previewIndicator}>
              <View style={styles.liveIndicatorDot} />
              <Text style={styles.previewIndicatorText}>{t('content.trailerPlaying')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Movie Facts Section - hidden on mobile */}
      {!IS_MOBILE && (
        <View style={styles.factsSection}>
          <Text style={styles.sectionTitle}>{t('content.details')}</Text>

          <GlassCard style={styles.factsCard}>
            {movie.director && (
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>{t('content.director')}</Text>
                <Text style={styles.factValue}>{movie.director}</Text>
              </View>
            )}
            {movie.cast && movie.cast.length > 0 && (
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>{t('content.starring')}</Text>
                <Text style={styles.factValue} numberOfLines={2}>
                  {movie.cast.slice(0, 5).join(', ')}
                </Text>
              </View>
            )}
            {movie.genre && (
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>{t('content.genre')}</Text>
                <Text style={styles.factValue}>{movie.genre}</Text>
              </View>
            )}
            {movie.duration && (
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>{t('content.runtime')}</Text>
                <Text style={styles.factValue}>{movie.duration}</Text>
              </View>
            )}
            {movie.year && (
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>{t('content.released')}</Text>
                <Text style={styles.factValue}>{movie.year}</Text>
              </View>
            )}
          </GlassCard>
        </View>
      )}

      {/* Synopsis Section - hidden on mobile */}
      {!IS_MOBILE && movie.description && (
        <View style={styles.synopsisSection}>
          <Text style={styles.sectionTitle}>{t('content.synopsis')}</Text>
          <Text style={[styles.synopsisText, { textAlign }]}>
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

      {/* Subtitle Selection Modal */}
      <Modal
        visible={showSubtitleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubtitleModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSubtitleModal(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <GlassView style={styles.subtitleModal}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('subtitles.selectLanguage')}</Text>
                <Pressable
                  onPress={() => setShowSubtitleModal(false)}
                  style={styles.closeButton}
                >
                  <X size={20} color={colors.text} />
                </Pressable>
              </View>

              {/* Subtitle List */}
              <ScrollView style={styles.subtitleList}>
                {/* Off Option */}
                <Pressable
                  onPress={() => {
                    setSelectedSubtitleLang(null);
                    setShowSubtitleModal(false);
                  }}
                  style={({ pressed }) => [
                    styles.subtitleItem,
                    !selectedSubtitleLang && styles.subtitleItemSelected,
                    pressed && styles.subtitleItemPressed
                  ]}
                >
                  <Text style={styles.subtitleItemText}>{t('subtitles.off', 'Off')}</Text>
                  {!selectedSubtitleLang && (
                    <Check size={20} color={colors.primary.DEFAULT} />
                  )}
                </Pressable>

                {/* Language Options */}
                {availableSubtitles
                  .filter((track, index, self) =>
                    self.findIndex(t => t.language === track.language) === index
                  )
                  .map((track) => {
                    const hasAI = !!(
                      track.has_nikud_version ||
                      track.has_shoresh_version ||
                      track.has_heblish_version ||
                      track.has_grammar_flip_version ||
                      track.has_slang_synthesis_version
                    );
                    const isSelected = selectedSubtitleLang === track.language;

                    return (
                      <Pressable
                        key={track.id}
                        onPress={() => handleSubtitleSelect(track.language)}
                        style={({ pressed }) => [
                          styles.subtitleItem,
                          isSelected && styles.subtitleItemSelected,
                          pressed && styles.subtitleItemPressed
                        ]}
                      >
                        <View style={styles.subtitleItemContent}>
                          <FlagWithSparkle
                            language={track.language}
                            hasAI={hasAI}
                            size="medium"
                            showTooltip={false}
                          />
                          <Text style={styles.subtitleItemText}>
                            {track.language_name || track.language.toUpperCase()}
                          </Text>
                        </View>
                        {isSelected && (
                          <Check size={20} color={colors.primary.DEFAULT} />
                        )}
                      </Pressable>
                    );
                  })}
              </ScrollView>
            </GlassView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
  },
  notFoundText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
  },
  heroSection: {
    position: 'relative',
  },
  posterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
  },
  leftGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '60%',
  },
  heroContent: {
    position: 'absolute',
    left: spacing.xl * 3,
    right: spacing.xl * 3,
    bottom: spacing.xl * 3,
    maxWidth: 650,
  },
  heroContentMobile: {
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    alignItems: 'center',
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
  movieTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  movieTitleMobile: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metadataText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  imdbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignSelf: 'flex-start',
  },
  imdbBadge: {
    backgroundColor: IMDB_YELLOW,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  imdbLogoText: {
    fontSize: fontSize.sm,
    fontWeight: '900',
    color: IMDB_TEXT,
    letterSpacing: -0.5,
  },
  imdbRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imdbRating: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: IMDB_YELLOW,
  },
  imdbMaxRating: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  imdbVotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  subtitlesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignSelf: 'flex-start',
    cursor: 'pointer',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subtitlesContainerPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderColor: colors.primary.DEFAULT,
  },
  subtitlesLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  subtitlesFlagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtitleFlag: {
    fontSize: fontSize.xl,
    opacity: 0.7,
  },
  subtitleFlagSelected: {
    opacity: 1,
    // @ts-ignore
    transform: 'scale(1.1)',
  },
  moreSubtitlesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  selectedIndicator: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDescription: {
    fontSize: fontSize.base,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButtonsRowMobile: {
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  previewIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error.DEFAULT,
  },
  previewIndicatorText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  factsSection: {
    paddingHorizontal: spacing.xl * 3,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  factsCard: {
    padding: spacing.lg,
  },
  factRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  factLabel: {
    width: 100,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  factValue: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: '500',
  },
  synopsisSection: {
    paddingHorizontal: spacing.xl * 3,
    paddingVertical: spacing.lg,
  },
  synopsisText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  subtitleModal: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: 600,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.3)',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  subtitleList: {
    maxHeight: 400,
  },
  subtitleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subtitleItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: colors.primary.DEFAULT,
  },
  subtitleItemPressed: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  subtitleItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  subtitleItemText: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: '500',
  },
});
