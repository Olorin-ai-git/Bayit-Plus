import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Share2, ThumbsUp, Trash2, Play, SkipForward, SkipBack, ListMusic, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import VideoPlayer from '@/components/player/VideoPlayer';
import AudioPlayer from '@/components/player/AudioPlayer';
import ContentCarousel from '@/components/content/ContentCarousel';
import { contentService, liveService, radioService, podcastService, historyService, chaptersService } from '@/services/api';
import { podcastsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassView } from '@bayit/shared/ui';
import logger from '@/utils/logger';
import { useModal } from '@/contexts/ModalContext';

// Flow/Playlist item type
interface PlaylistItem {
  content_id: string;
  content_type: string;
  title: string;
  thumbnail?: string;
  duration_hint?: number;
  order: number;
}

interface WatchPageProps {
  type?: 'vod' | 'live' | 'radio' | 'podcast';
}

interface ContentData {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  cover?: string;
  logo?: string;
  year?: string;
  duration?: string;
  rating?: string;
  genre?: string;
  episodeCount?: number;
  cast?: string[];
  episodes?: Episode[];
  schedule?: ScheduleItem[];
  related?: any[];
  artist?: string;
  author?: string;
  latestEpisode?: {
    audioUrl: string;
  };
}

interface Episode {
  id: string;
  title: string;
  duration: string;
  audioUrl?: string;
}

interface ScheduleItem {
  time: string;
  title: string;
  isNow?: boolean;
}

interface Chapter {
  time: number;
  title: string;
}

export default function WatchPage({ type = 'vod' }: WatchPageProps) {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { showConfirm } = useModal();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Get playlist data from navigation state (for flows)
  const locationState = location.state as {
    flowId?: string;
    flowName?: string;
    playlist?: PlaylistItem[];
    currentIndex?: number;
  } | null;

  const [playlist, setPlaylist] = useState<PlaylistItem[]>(locationState?.playlist || []);
  const [playlistIndex, setPlaylistIndex] = useState(locationState?.currentIndex || 0);
  const [flowName, setFlowName] = useState(locationState?.flowName || '');
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(false);

  // Determine current content - from playlist or URL params
  const currentPlaylistItem = playlist.length > 0 ? playlist[playlistIndex] : null;
  const contentId = currentPlaylistItem?.content_id || params.contentId || params.channelId || params.stationId || params.showId || '';
  const effectiveType = currentPlaylistItem?.content_type as typeof type || type;

  const [content, setContent] = useState<ContentData | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [availableSubtitleLanguages, setAvailableSubtitleLanguages] = useState<string[]>([]);

  // Update playlist when location state changes
  useEffect(() => {
    if (locationState?.playlist) {
      setPlaylist(locationState.playlist);
      setPlaylistIndex(locationState.currentIndex || 0);
      setFlowName(locationState.flowName || '');
    }
  }, [locationState?.flowId]);

  useEffect(() => {
    loadContent();
  }, [contentId, effectiveType]);

  const loadContent = async () => {
    setLoading(true);
    try {
      let data: ContentData, stream: { url?: string } | undefined;
      // Use effectiveType which respects playlist item type
      const contentType = effectiveType;
      switch (contentType) {
        case 'live':
          [data, stream] = await Promise.all([
            liveService.getChannel(contentId),
            liveService.getStreamUrl(contentId),
          ]);
          // Extract available subtitle languages from channel config
          if ((data as any).available_translation_languages) {
            console.log('🌐 [WatchPage] Channel available_translation_languages:', (data as any).available_translation_languages);
            setAvailableSubtitleLanguages((data as any).available_translation_languages);
          } else {
            console.log('⚠️ [WatchPage] No available_translation_languages in channel data');
          }
          break;
        case 'radio':
          [data, stream] = await Promise.all([
            radioService.getStation(contentId),
            radioService.getStreamUrl(contentId),
          ]);
          break;
        case 'podcast':
          data = await podcastService.getShow(contentId);
          if (data.latestEpisode) {
            stream = { url: data.latestEpisode.audioUrl };
          }
          break;
        default:
          // vod, judaism, kids all use content service
          [data, stream] = await Promise.all([
            contentService.getById(contentId),
            contentService.getStreamUrl(contentId),
          ]);
      }
      setContent(data);
      setStreamUrl(stream?.url || null);

      if (data.related) {
        setRelated(data.related);
      }

      if (contentType !== 'live' && contentType !== 'radio' && contentType !== 'podcast') {
        loadChapters();
      }
    } catch (error) {
      logger.error('Failed to load content', 'WatchPage', error);
    } finally {
      setLoading(false);
    }
  };

  // Playlist navigation handlers
  const hasNextItem = playlist.length > 0 && playlistIndex < playlist.length - 1;
  const hasPrevItem = playlist.length > 0 && playlistIndex > 0;

  const playNextItem = useCallback(() => {
    if (hasNextItem) {
      setPlaylistIndex(prev => prev + 1);
    }
  }, [hasNextItem]);

  const playPrevItem = useCallback(() => {
    if (hasPrevItem) {
      setPlaylistIndex(prev => prev - 1);
    }
  }, [hasPrevItem]);

  const playItemAtIndex = useCallback((index: number) => {
    if (index >= 0 && index < playlist.length) {
      setPlaylistIndex(index);
    }
  }, [playlist.length]);

  const handleContentEnded = useCallback(() => {
    logger.info('Content ended, checking for next item', 'WatchPage');
    if (hasNextItem) {
      playNextItem();
    }
  }, [hasNextItem, playNextItem]);

  const exitFlow = useCallback(() => {
    setPlaylist([]);
    setFlowName('');
    navigate('/flows');
  }, [navigate]);

  const loadChapters = async () => {
    setChaptersLoading(true);
    try {
      const data = await chaptersService.getChapters(contentId);
      setChapters(data.chapters || []);
    } catch (error) {
      logger.error('Failed to load chapters', 'WatchPage', error);
      setChapters([]);
    } finally {
      setChaptersLoading(false);
    }
  };

  const handleProgress = async (position: number, duration: number) => {
    // Fire-and-forget: history update is non-critical and should not interrupt playback
    historyService.updateProgress(contentId, type, position, duration).catch(() => {});
  };

  const handlePlayEpisode = (episode: Episode) => {
    if (episode.audioUrl) {
      setStreamUrl(episode.audioUrl);
      setCurrentEpisodeId(episode.id);
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    showConfirm(
      t('watch.confirmDeleteEpisode'),
      async () => {
        try {
          await podcastsService.deleteEpisode(contentId, episodeId);
          // Reload content to refresh episodes list
          await loadContent();
          logger.info('Episode deleted successfully');
        } catch (error) {
          logger.error('Failed to delete episode', 'WatchPage', error);
        }
      },
      {
        title: t('watch.deleteEpisode'),
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
        destructive: true,
      }
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonPlayer} />
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonDescription} />
      </View>
    );
  }

  if (!content) {
    return (
      <View style={styles.notFoundContainer}>
        <GlassCard style={styles.notFoundCard}>
          <Text style={styles.notFoundTitle}>{t('watch.notFound')}</Text>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Text style={styles.notFoundLink}>{t('watch.backToHome')}</Text>
          </Link>
        </GlassCard>
      </View>
    );
  }

  const isAudio = effectiveType === 'radio' || effectiveType === 'podcast';
  const title = content.title || content.name || '';
  const isInFlow = playlist.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Back Button */}
      <View style={styles.backContainer}>
        <Pressable onPress={() => window.history.back()} style={styles.backButton}>
          <ArrowRight size={20} color={colors.text} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Pressable>
      </View>

      {/* Flow Header - shown when playing a flow */}
      {isInFlow && (
        <View style={[styles.flowHeader, isRTL && styles.flowHeaderRTL]}>
          <View style={[styles.flowHeaderLeft, isRTL && styles.flowHeaderLeftRTL]}>
            <Pressable onPress={() => setShowPlaylistPanel(!showPlaylistPanel)} style={styles.flowIconButton}>
              <ListMusic size={20} color={colors.primary} />
            </Pressable>
            <View>
              <Text style={styles.flowName}>{flowName}</Text>
              <Text style={styles.flowProgress}>
                {playlistIndex + 1} / {playlist.length}
              </Text>
            </View>
          </View>
          <View style={[styles.flowControls, isRTL && styles.flowControlsRTL]}>
            <Pressable
              onPress={playPrevItem}
              style={[styles.flowNavButton, !hasPrevItem && styles.flowNavButtonDisabled]}
              disabled={!hasPrevItem}
            >
              <SkipBack size={20} color={hasPrevItem ? colors.text : colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={playNextItem}
              style={[styles.flowNavButton, !hasNextItem && styles.flowNavButtonDisabled]}
              disabled={!hasNextItem}
            >
              <SkipForward size={20} color={hasNextItem ? colors.text : colors.textMuted} />
            </Pressable>
            <Pressable onPress={exitFlow} style={styles.flowExitButton}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Player */}
      <View style={styles.playerContainer}>
        {isAudio ? (
          <AudioPlayer
            src={streamUrl}
            title={title}
            artist={content.artist || content.author}
            cover={content.cover || content.logo || content.thumbnail}
            isLive={effectiveType === 'radio'}
            onEnded={handleContentEnded}
          />
        ) : (
          <VideoPlayer
            src={streamUrl}
            poster={content.backdrop || content.thumbnail}
            title={title}
            contentId={contentId}
            contentType={effectiveType}
            onProgress={handleProgress}
            isLive={effectiveType === 'live'}
            availableSubtitleLanguages={availableSubtitleLanguages}
            chapters={chapters}
            chaptersLoading={chaptersLoading}
            onEnded={handleContentEnded}
            onShowUpgrade={() => navigate('/subscribe')}
          />
        )}
      </View>

      {/* Playlist Panel */}
      {showPlaylistPanel && isInFlow && (
        <View style={[styles.playlistPanel, isRTL && styles.playlistPanelRTL]}>
          <View style={styles.playlistPanelHeader}>
            <Text style={styles.playlistPanelTitle}>{t('watch.playlist') || 'Playlist'}</Text>
            <Pressable onPress={() => setShowPlaylistPanel(false)}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={styles.playlistPanelScroll}>
            {playlist.map((item, index) => (
              <Pressable
                key={`${item.content_id}-${index}`}
                style={[
                  styles.playlistItem,
                  index === playlistIndex && styles.playlistItemActive,
                ]}
                onPress={() => playItemAtIndex(index)}
              >
                <Text style={styles.playlistItemNumber}>{index + 1}</Text>
                <View style={styles.playlistItemInfo}>
                  <Text
                    style={[
                      styles.playlistItemTitle,
                      index === playlistIndex && styles.playlistItemTitleActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.playlistItemType}>{item.content_type}</Text>
                </View>
                {index === playlistIndex && (
                  <View style={styles.playlistItemPlaying}>
                    <Play size={14} color={colors.primary} fill={colors.primary} />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content Info */}
      <View style={styles.infoContainer}>
        <View style={styles.mainInfo}>
          {/* Live Badge */}
          {effectiveType === 'live' && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>{t('common.live')}</Text>
            </View>
          )}

          <Text style={styles.title}>{title}</Text>

          {/* Metadata */}
          <View style={styles.metadataRow}>
            {content.year && (
              <GlassView style={styles.badge}>
                <Text style={styles.badgeText}>{content.year}</Text>
              </GlassView>
            )}
            {content.duration && (
              <GlassView style={styles.badge}>
                <Text style={styles.badgeText}>{content.duration}</Text>
              </GlassView>
            )}
            {content.rating && (
              <GlassView style={[styles.badge, styles.badgePrimary]}>
                <Text style={[styles.badgeText, styles.badgeTextPrimary]}>{content.rating}</Text>
              </GlassView>
            )}
            {content.genre && (
              <GlassView style={styles.badge}>
                <Text style={styles.badgeText}>{content.genre}</Text>
              </GlassView>
            )}
            {content.episodeCount && (
              <GlassView style={styles.badge}>
                <Text style={styles.badgeText}>{content.episodeCount} {t('watch.episodes')}</Text>
              </GlassView>
            )}
          </View>

          {/* Description */}
          {content.description && (
            <Text style={styles.description}>{content.description}</Text>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <GlassButton
              title={t('watch.addToList')}
              icon={<Plus size={18} color={colors.text} />}
            />
            <GlassButton
              title={t('watch.like')}
              icon={<ThumbsUp size={18} color={colors.text} />}
            />
            <Pressable style={styles.ghostButton}>
              <Share2 size={18} color={colors.textMuted} />
              <Text style={styles.ghostButtonText}>{t('watch.share')}</Text>
            </Pressable>
          </View>

          {/* Cast/Credits */}
          {content.cast && content.cast.length > 0 && (
            <View style={styles.castSection}>
              <Text style={styles.sectionTitle}>{t('watch.cast')}</Text>
              <Text style={styles.castText}>{content.cast.join(', ')}</Text>
            </View>
          )}

          {/* Episodes */}
          {content.episodes && content.episodes.length > 0 && (
            <View style={styles.episodesSection}>
              <Text style={styles.sectionTitle}>{t('watch.episodesList')}</Text>
              {content.episodes.map((episode, i) => (
                <View
                  key={episode.id}
                  style={[
                    styles.episodeItem,
                    currentEpisodeId === episode.id && styles.episodeItemActive
                  ]}
                  // @ts-ignore
                  pointerEvents="box-none"
                >
                  <Pressable
                    style={styles.playButton}
                    onPress={() => handlePlayEpisode(episode)}
                    // @ts-ignore
                    pointerEvents="auto"
                  >
                    <Play size={18} color={colors.primary} fill={colors.primary} />
                  </Pressable>
                  <Text style={styles.episodeNumber}>{i + 1}</Text>
                  <Pressable
                    style={styles.episodeInfoPress}
                    onPress={() => handlePlayEpisode(episode)}
                    // @ts-ignore
                    pointerEvents="auto"
                  >
                    <Text style={styles.episodeTitle}>{episode.title}</Text>
                    <Text style={styles.episodeDuration}>{episode.duration}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeleteEpisode(episode.id)}
                    // @ts-ignore
                    pointerEvents="auto"
                  >
                    <Trash2 size={16} color={colors.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* EPG / Schedule (for live) */}
        {effectiveType === 'live' && content.schedule && content.schedule.length > 0 && (
          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>{t('watch.schedule')}</Text>
            {content.schedule.map((show, i) => (
              <GlassCard
                key={i}
                style={[styles.scheduleItem, show.isNow && styles.scheduleItemNow]}
              >
                <View style={styles.scheduleHeader}>
                  <Text style={styles.scheduleTime}>{show.time}</Text>
                  {show.isNow && (
                    <View style={styles.nowBadge}>
                      <Text style={styles.nowBadgeText}>{t('watch.now')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.scheduleTitle}>{show.title}</Text>
              </GlassCard>
            ))}
          </View>
        )}
      </View>

      {/* Related Content */}
      {related.length > 0 && (
        <ContentCarousel
          title={t('watch.related')}
          items={related}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xl * 2,
  },
  backContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    color: colors.text,
  },
  playerContainer: {
    paddingHorizontal: spacing.md,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
    aspectRatio: 16 / 9,
    minHeight: 300,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  skeletonPlayer: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  skeletonTitle: {
    height: 32,
    width: 256,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  skeletonDescription: {
    height: 16,
    width: '80%',
    maxWidth: 600,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.md,
  },
  notFoundCard: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
  },
  notFoundTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  notFoundLink: {
    fontSize: 16,
    color: colors.primary,
  },
  infoContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  mainInfo: {
    flex: 1,
  },
  liveBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgePrimary: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  badgeText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  badgeTextPrimary: {
    color: colors.primary,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ghostButtonText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  castSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  castText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  episodesSection: {
    marginTop: spacing.lg,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  episodeItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  playButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    cursor: 'pointer',
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  deleteButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    cursor: 'pointer',
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  episodeNumber: {
    width: 24,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    flexShrink: 0,
  },
  episodeInfoPress: {
    flex: 1,
    cursor: 'pointer',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  episodeDuration: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  scheduleSection: {
    width: 320,
  },
  scheduleItem: {
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  scheduleItemNow: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  scheduleTime: {
    fontSize: 14,
    color: colors.textMuted,
  },
  nowBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  nowBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  // Flow/Playlist styles
  flowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
  },
  flowHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  flowHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flowHeaderLeftRTL: {
    flexDirection: 'row-reverse',
  },
  flowIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: borderRadius.md,
  },
  flowName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  flowProgress: {
    fontSize: 12,
    color: colors.textMuted,
  },
  flowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flowControlsRTL: {
    flexDirection: 'row-reverse',
  },
  flowNavButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
  },
  flowNavButtonDisabled: {
    opacity: 0.5,
  },
  flowExitButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  playlistPanel: {
    position: 'absolute' as any,
    top: 120,
    left: spacing.md,
    width: 300,
    maxHeight: 400,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 100,
    // @ts-ignore
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  playlistPanelRTL: {
    left: 'auto' as any,
    right: spacing.md,
  },
  playlistPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  playlistPanelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  playlistPanelScroll: {
    maxHeight: 320,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  playlistItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  playlistItemNumber: {
    width: 24,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  playlistItemInfo: {
    flex: 1,
  },
  playlistItemTitle: {
    fontSize: 14,
    color: colors.text,
  },
  playlistItemTitleActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  playlistItemType: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  playlistItemPlaying: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
