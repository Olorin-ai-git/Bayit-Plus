import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Star, Bookmark } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassBadge } from '@bayit/shared/ui';
import { SubtitleFlags } from '@bayit/shared/components/SubtitleFlags';
import { useModeEnforcement } from '@bayit/shared-hooks';
import { useDirection } from '@/hooks/useDirection';
import { favoritesService, watchlistService } from '@/services/api';
import LinearGradient from 'react-native-linear-gradient';

interface Content {
  id: string;
  title: string;
  thumbnail?: string;
  type?: 'live' | 'radio' | 'podcast' | 'vod' | 'movie' | 'series';
  is_series?: boolean;
  duration?: string;
  progress?: number;
  year?: string;
  category?: string;
  total_episodes?: number;
  has_subtitles?: boolean;
  available_subtitle_languages?: string[];
}

interface ContentCardProps {
  content: Content;
  showProgress?: boolean;
  showActions?: boolean;
}

export default function ContentCard({ content, showProgress = false, showActions = true }: ContentCardProps) {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [isHovered, setIsHovered] = useState(false);
  const { isUIInteractionEnabled } = useModeEnforcement();

  // Action button states
  const [isFavorite, setIsFavorite] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [favoriteHovered, setFavoriteHovered] = useState(false);
  const [watchlistHovered, setWatchlistHovered] = useState(false);

  // Determine link destination based on content type
  const linkTo = content.type === 'live'
    ? `/live/${content.id}`
    : content.type === 'radio'
    ? `/radio/${content.id}`
    : content.type === 'podcast'
    ? `/podcasts/${content.id}`
    : content.type === 'series' || content.is_series
    ? `/vod/series/${content.id}`
    : `/vod/movie/${content.id}`;

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (favoriteLoading) return;
    setFavoriteLoading(true);

    try {
      const result = await favoritesService.toggleFavorite(content.id, content.type || 'vod');
      setIsFavorite(result.is_favorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleWatchlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (watchlistLoading) return;
    setWatchlistLoading(true);

    try {
      const result = await watchlistService.toggleWatchlist(content.id, content.type || 'vod');
      setInWatchlist(result.in_watchlist);
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    } finally {
      setWatchlistLoading(false);
    }
  };

  // In Voice Only mode, wrap in non-interactive View instead of Link
  const CardContent = (
    <Pressable
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      disabled={!isUIInteractionEnabled}
      style={!isUIInteractionEnabled ? { pointerEvents: 'none' } : undefined}
    >
      <GlassCard style={[
        styles.card,
        isHovered && styles.cardHovered,
        !isUIInteractionEnabled && { opacity: 0.6 },
      ]}>
          {/* Thumbnail */}
          <View style={styles.thumbnailContainer}>
            {content.thumbnail ? (
              <Image
                source={{ uri: content.thumbnail }}
                style={styles.thumbnail}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.thumbnailPlaceholder} />
            )}

            {/* Action Buttons - Show on hover */}
            {showActions && isHovered && (
              <div
                style={{ position: 'absolute', top: spacing.sm, right: isRTL ? 'auto' : spacing.sm, left: isRTL ? spacing.sm : 'auto', display: 'flex', flexDirection: 'row', gap: spacing.xs, zIndex: 10 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleFavoriteToggle}
                  onMouseEnter={() => setFavoriteHovered(true)}
                  onMouseLeave={() => setFavoriteHovered(false)}
                  disabled={favoriteLoading}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isFavorite ? 'rgba(255, 255, 255, 0.15)' : favoriteHovered ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.6)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s ease',
                    transform: favoriteHovered ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <Star
                    size={16}
                    color={isFavorite ? colors.warning : colors.text}
                    fill={isFavorite ? colors.warning : 'transparent'}
                  />
                </button>
                <button
                  onClick={handleWatchlistToggle}
                  onMouseEnter={() => setWatchlistHovered(true)}
                  onMouseLeave={() => setWatchlistHovered(false)}
                  disabled={watchlistLoading}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: inWatchlist ? 'rgba(255, 255, 255, 0.15)' : watchlistHovered ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.6)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s ease',
                    transform: watchlistHovered ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <Bookmark
                    size={16}
                    color={inWatchlist ? colors.primary : colors.text}
                    fill={inWatchlist ? colors.primary : 'transparent'}
                  />
                </button>
              </div>
            )}

            {/* Play Overlay */}
            {isHovered && (
              <View style={styles.playOverlay}>
                <LinearGradient
                  colors={['transparent', 'rgba(10, 10, 20, 0.8)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.playButton}>
                  <Play size={24} color={colors.text} fill={colors.text} />
                </View>
              </View>
            )}

            {/* Duration Badge - for movies */}
            {content.duration && !content.is_series && (
              <View style={[styles.durationBadge, isRTL ? { left: 'auto', right: spacing.sm } : {}]}>
                <Text style={styles.durationText}>{content.duration}</Text>
              </View>
            )}

            {/* Episode Count Badge - for series */}
            {(content.is_series || content.type === 'series') && content.total_episodes !== undefined && content.total_episodes > 0 && (
              <View style={[styles.episodesBadge, isRTL ? { left: 'auto', right: spacing.sm } : {}]}>
                <Text style={styles.episodesText}>
                  {content.total_episodes} {t('content.episodes')}
                </Text>
              </View>
            )}

            {/* Subtitle Flags */}
            {content.available_subtitle_languages && content.available_subtitle_languages.length > 0 && (
              <SubtitleFlags
                languages={content.available_subtitle_languages}
                position={isRTL ? 'bottom-left' : 'bottom-right'}
                isRTL={isRTL}
                size="small"
              />
            )}

            {/* Live Badge - positioned to avoid action buttons */}
            {content.type === 'live' && (
              <View style={[
                styles.liveBadge,
                isRTL ? { right: 'auto', left: spacing.sm } : {},
                // Move down when action buttons are shown
                showActions && { top: spacing.sm + 40 },
              ]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{t('common.live')}</Text>
              </View>
            )}

            {/* Progress Bar */}
            {showProgress && content.progress && content.progress > 0 && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${content.progress}%` }]} />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={[styles.title, isHovered && styles.titleHovered, { textAlign }]} numberOfLines={1}>
              {content.title}
            </Text>
            <View style={[styles.meta, { flexDirection }]}>
              {content.year && <Text style={styles.metaText}>{content.year}</Text>}
              {content.year && content.category && (
                <Text style={styles.metaDivider}>|</Text>
              )}
              {content.category && <Text style={styles.metaText}>{content.category}</Text>}
            </View>
          </View>
        </GlassCard>
      </Pressable>
  );

  // Wrap with Link only if UI interactions are enabled
  if (isUIInteractionEnabled) {
    return (
      <Link to={linkTo} style={{ textDecoration: 'none', flexShrink: 0 }}>
        {CardContent}
      </Link>
    );
  }

  // Otherwise return as unwrapped View for Voice Only mode
  return <View style={{ flexShrink: 0 }}>{CardContent}</View>;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: 0,
    overflow: 'hidden',
  },
  cardHovered: {
    transform: [{ translateY: -4 }],
    // @ts-ignore
    boxShadow: `0 8px 32px rgba(107, 33, 168, 0.3)`,
  },
  thumbnailContainer: {
    aspectRatio: 2 / 3, // Portrait aspect ratio for movie posters
    position: 'relative',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundDark, // Background for letterboxing
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.glass,
  },
  actionButtons: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    zIndex: 10,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    backdropFilter: 'blur(8px)',
    transition: 'all 0.2s ease',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    transform: [{ scale: 1.1 }],
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    // @ts-ignore
    backdropFilter: 'blur(8px)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    boxShadow: `0 0 20px ${colors.primary}`,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  episodesBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodesText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  durationText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '500',
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    // @ts-ignore
    boxShadow: `0 0 8px ${colors.primary}`,
  },
  info: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  titleHovered: {
    color: colors.primary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaDivider: {
    fontSize: 12,
    color: colors.backgroundLighter,
  },
});
