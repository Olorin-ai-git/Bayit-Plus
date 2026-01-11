import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Check, Share2 } from 'lucide-react';
import Hls from 'hls.js';
import LinearGradient from 'react-native-linear-gradient';
import { useDirection } from '@/hooks/useDirection';
import ContentCarousel from '@/components/content/ContentCarousel';
import { contentService, watchlistService, favoritesService } from '@/services/api';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassView, GlassBadge } from '@bayit/shared/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Season {
  season_number: number;
  episode_count: number;
  first_episode_id?: string;
  first_episode_thumbnail?: string;
}

interface Episode {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  episode_number: number;
  duration?: string;
  preview_url?: string;
  stream_url?: string;
  progress?: number;
}

interface SeriesData {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  category?: string;
  year?: number;
  rating?: string;
  genre?: string;
  cast?: string[];
  director?: string;
  total_seasons: number;
  total_episodes: number;
  trailer_url?: string;
  preview_url?: string;
  seasons: Season[];
  related: any[];
}

export default function SeriesDetailPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();

  const [series, setSeries] = useState<SeriesData | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Video preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load series details
  useEffect(() => {
    if (seriesId) {
      loadSeriesDetails();
    }
    return () => {
      cleanup();
    };
  }, [seriesId]);

  // Load episodes when season changes
  useEffect(() => {
    if (seriesId && selectedSeason) {
      loadSeasonEpisodes();
    }
  }, [seriesId, selectedSeason]);

  // Get the preview URL - use stream_url as fallback for testing
  const getPreviewUrl = useCallback((): string | null => {
    // Priority: episode preview > series preview > series trailer > episode stream (fallback)
    if (selectedEpisode?.preview_url) return selectedEpisode.preview_url;
    if (series?.preview_url) return series.preview_url;
    if (series?.trailer_url) return series.trailer_url;
    // Fallback to first 5 seconds of actual content stream
    if (selectedEpisode?.stream_url) return selectedEpisode.stream_url;
    if (episodes.length > 0 && (episodes[0] as any).stream_url) return (episodes[0] as any).stream_url;
    return null;
  }, [selectedEpisode, series, episodes]);

  // Auto-start preview when episode is selected or on initial load
  useEffect(() => {
    const previewUrl = getPreviewUrl();
    if (previewUrl && showPoster) {
      // Small delay to ensure video element is ready
      const startTimer = setTimeout(() => {
        startPreview();
      }, 800);
      return () => clearTimeout(startTimer);
    }
    return () => stopPreview();
  }, [selectedEpisode?.id, series?.id, getPreviewUrl]);

  const cleanup = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
  };

  const loadSeriesDetails = async () => {
    setLoading(true);
    try {
      const data = await contentService.getSeriesDetails(seriesId!);
      setSeries(data);

      // Set default season
      if (data.seasons && data.seasons.length > 0) {
        setSelectedSeason(data.seasons[0].season_number);
      }
    } catch (error) {
      console.error('Failed to load series details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasonEpisodes = async () => {
    setEpisodesLoading(true);
    try {
      const data = await contentService.getSeasonEpisodes(seriesId!, selectedSeason);
      setEpisodes(data.episodes || []);

      // Select first episode by default
      if (data.episodes && data.episodes.length > 0 && !selectedEpisode) {
        setSelectedEpisode(data.episodes[0]);
      }
    } catch (error) {
      console.error('Failed to load episodes:', error);
    } finally {
      setEpisodesLoading(false);
    }
  };

  // Video preview functions
  const startPreview = useCallback(() => {
    const previewUrl = getPreviewUrl();
    if (!previewUrl) return;

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
    if (selectedEpisode) {
      navigate(`/vod/${selectedEpisode.id}`);
    } else if (episodes.length > 0) {
      navigate(`/vod/${episodes[0].id}`);
    }
  };

  const handleEpisodeSelect = (episode: Episode) => {
    setSelectedEpisode(episode);
  };

  const handleEpisodePlay = (episode: Episode) => {
    navigate(`/vod/${episode.id}`);
  };

  const toggleWatchlist = async () => {
    if (!series) return;
    try {
      const result = await watchlistService.toggleWatchlist(series.id, 'series');
      setInWatchlist(result.in_watchlist);
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!series) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('content.notFound')}</Text>
      </View>
    );
  }

  const backdropUrl = selectedEpisode?.thumbnail || series.backdrop || series.thumbnail;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.heroContainer}>
        {/* Background Poster */}
        <View style={[
          styles.backdropContainer,
          {
            opacity: isPreviewPlaying ? 0 : 1,
            // @ts-ignore - Web CSS transition
            transition: 'opacity 0.5s ease-in-out',
          }
        ]}>
          <Image
            source={{ uri: backdropUrl }}
            style={styles.backdrop}
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
            }
          ]}
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
          style={styles.gradientBottom}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientLeft}
        />

        {/* Content */}
        <View style={styles.heroContent}>
          {/* Category Badge */}
          {series.category && (
            <GlassView style={styles.categoryBadge} intensity="light">
              <Text style={styles.categoryText}>{series.category}</Text>
            </GlassView>
          )}

          {/* Title */}
          <Text style={styles.title}>{series.title}</Text>

          {/* Metadata */}
          <View style={[styles.metadata, { flexDirection }]}>
            {series.year && <Text style={styles.metaItem}>{series.year}</Text>}
            {series.rating && (
              <GlassBadge variant="default" size="sm">{series.rating}</GlassBadge>
            )}
            {(series.total_seasons > 0 || (series.seasons && series.seasons.length > 0)) && (
              <Text style={styles.metaItem}>
                {series.total_seasons || series.seasons?.length || 1} {t('content.seasons')}
              </Text>
            )}
            {(series.total_episodes > 0 || episodes.length > 0) && (
              <Text style={styles.metaItem}>
                {series.total_episodes || episodes.length} {t('content.episodes')}
              </Text>
            )}
          </View>

          {/* Description */}
          {series.description && (
            <Text style={[styles.description, { textAlign }]} numberOfLines={3}>
              {series.description}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={[styles.actions, { flexDirection }]}>
            <GlassButton
              onPress={handlePlay}
              variant="primary"
              size="lg"
              icon={<Play size={20} color="#fff" fill="#fff" />}
              title={selectedEpisode
                ? `${t('content.play')} S${selectedSeason}E${selectedEpisode.episode_number}`
                : t('content.play')}
            />

            <GlassButton
              onPress={toggleWatchlist}
              variant="ghost"
              size="lg"
              icon={inWatchlist ? <Check size={20} color="#fff" /> : <Plus size={20} color="#fff" />}
              title={inWatchlist ? t('content.inList') : t('content.addToList')}
            />

            {showPoster && (series.preview_url || series.trailer_url) && (
              <GlassButton
                onPress={startPreview}
                variant="ghost"
                size="lg"
                title={t('content.preview')}
              />
            )}
          </View>

          {/* Preview indicator */}
          {isPreviewPlaying && (
            <View style={styles.previewIndicator}>
              <View style={styles.previewDot} />
              <Text style={styles.previewText}>{t('content.previewPlaying')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Season Selector */}
      {series.seasons && series.seasons.length > 1 && (
        <View style={styles.seasonSelector}>
          <Text style={styles.sectionTitle}>{t('content.selectSeason')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.seasonPills, { flexDirection }]}>
              {series.seasons.map((season) => (
                <GlassButton
                  key={season.season_number}
                  onPress={() => setSelectedSeason(season.season_number)}
                  variant={selectedSeason === season.season_number ? 'primary' : 'ghost'}
                  size="md"
                  title={`${t('content.season')} ${season.season_number}`}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Episodes List */}
      <View style={styles.episodesSection}>
        {episodes.length > 0 && (
          <Text style={styles.sectionTitle}>
            {t('content.season')} {selectedSeason} • {episodes.length} {t('content.episodes')}
          </Text>
        )}

        {episodesLoading ? (
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        ) : episodes.length > 0 ? (
          <View style={styles.episodesList}>
            {episodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                isSelected={selectedEpisode?.id === episode.id}
                onSelect={() => handleEpisodeSelect(episode)}
                onPlay={() => handleEpisodePlay(episode)}
                flexDirection={flexDirection}
              />
            ))}
          </View>
        ) : (
          <View style={styles.noEpisodes}>
            <Text style={styles.noEpisodesText}>{t('content.noEpisodes')}</Text>
          </View>
        )}
      </View>

      {/* Cast Section */}
      {series.cast && series.cast.length > 0 && (
        <View style={styles.castSection}>
          <Text style={styles.sectionTitle}>{t('content.cast')}</Text>
          <Text style={[styles.castText, { textAlign }]}>
            {series.cast.join(', ')}
          </Text>
        </View>
      )}

      {/* Related Content */}
      {series.related && series.related.length > 0 && (
        <ContentCarousel
          title={t('content.youMayAlsoLike')}
          items={series.related}
        />
      )}
    </ScrollView>
  );
}

// Episode Card Component
interface EpisodeCardProps {
  episode: Episode;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  flexDirection: 'row' | 'row-reverse';
}

function EpisodeCard({ episode, isSelected, onSelect, onPlay, flexDirection }: EpisodeCardProps) {
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.episodeCard,
        isSelected && styles.episodeCardSelected,
      ]}
      onClick={isSelected ? onPlay : onSelect}
    >
      {/* Thumbnail */}
      <View style={styles.episodeThumbnail}>
        {episode.thumbnail ? (
          <Image
            source={{ uri: episode.thumbnail }}
            style={styles.episodeThumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.episodeThumbnailPlaceholder}>
            <Text style={styles.episodeThumbnailIcon}>🎬</Text>
          </View>
        )}

        {/* Play overlay */}
        <View style={styles.episodePlayOverlay}>
          <View style={styles.episodePlayButton}>
            <Play size={16} color="#000" fill="#000" />
          </View>
        </View>

        {/* Duration */}
        {episode.duration && (
          <View style={styles.episodeDuration}>
            <Text style={styles.episodeDurationText}>{episode.duration}</Text>
          </View>
        )}

        {/* Progress bar */}
        {episode.progress !== undefined && episode.progress > 0 && (
          <View style={styles.episodeProgress}>
            <View style={[styles.episodeProgressBar, { width: `${episode.progress}%` }]} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.episodeContent}>
        <Text style={styles.episodeNumber}>
          {t('content.episode')} {episode.episode_number}
        </Text>
        <Text style={styles.episodeTitle} numberOfLines={2}>
          {episode.title}
        </Text>
        {episode.description && (
          <Text style={styles.episodeDescription} numberOfLines={2}>
            {episode.description}
          </Text>
        )}
      </View>

      {/* Selected indicator */}
      {isSelected && (
        <View style={styles.episodeSelectedIndicator}>
          <Play size={16} color="#fff" fill="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    fontSize: fontSize.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
  },
  heroContainer: {
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
    objectFit: 'cover',
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
  heroContent: {
    position: 'absolute',
    left: 48,
    right: 48,
    bottom: 40,
    maxWidth: 600,
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
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
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
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  previewIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
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
  seasonSelector: {
    paddingHorizontal: 48,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  seasonPills: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  episodesSection: {
    paddingHorizontal: 48,
    paddingVertical: spacing.lg,
  },
  episodesList: {
    gap: spacing.md,
  },
  noEpisodes: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEpisodesText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    cursor: 'pointer',
  },
  episodeCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: colors.primary,
  },
  episodeThumbnail: {
    width: 160,
    height: 90,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  episodeThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  episodeThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeThumbnailIcon: {
    fontSize: 32,
    opacity: 0.5,
  },
  episodePlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  episodePlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeDuration: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  episodeDurationText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '500',
  },
  episodeProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  episodeProgressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  episodeContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  episodeNumber: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  episodeTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  episodeDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  episodeSelectedIndicator: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  castSection: {
    paddingHorizontal: 48,
    paddingVertical: spacing.lg,
  },
  castText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
