/**
 * Watch Page
 * Main page for watching VOD, live, radio, and podcast content
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';
import VideoPlayer from '@/components/player/VideoPlayer';
import AudioPlayer from '@/components/player/AudioPlayer';
import AIWandToggle from '@/components/player/AIWandToggle';
import { AICompanionSidebar } from '@/components/player/ai-companion';
import { useAICompanionStore } from '@/stores/aiCompanionStore';
import ContentCarousel from '@/components/content/ContentCarousel';
import { historyService } from '@/services/api';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { GlassButton } from '@bayit/shared/ui';
import api from '@/services/api';
import {
  AuthRequiredOverlay,
  BackButton,
  ContentActions,
  ContentMetadata,
  EpisodesList,
  LoadingState,
  NotFoundState,
  PlaylistPanel,
  ScheduleSection,
} from './components';
import {
  useChaptersLoader,
  useContentLoader,
  useEpisodePlayer,
  usePlaylistManager,
  useYouTubePlaylistChannel,
} from './hooks';
import { WatchPageProps, LocationState } from './types';

export function WatchPage({ type = 'vod' }: WatchPageProps) {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const notifications = useNotifications();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Check if content data was passed via navigation state (for scraped articles/events)
  const stateContentData = (location.state as LocationState)?.contentData;

  // Deep link timestamp from ?t= parameter (in seconds)
  const initialSeekTime = React.useMemo(() => {
    const timeParam = searchParams.get('t');
    if (timeParam) {
      const parsed = parseFloat(timeParam);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }, [searchParams]);

  const {
    playlist,
    playlistIndex,
    showPlaylistPanel,
    isInFlow,
    setShowPlaylistPanel,
    playItemAtIndex,
    handleContentEnded,
  } = usePlaylistManager();

  const currentPlaylistItem = playlist.length > 0 ? playlist[playlistIndex] : null;
  const contentId =
    currentPlaylistItem?.content_id ||
    params.contentId ||
    params.channelId ||
    params.stationId ||
    params.showId ||
    '';
  const effectiveType = (currentPlaylistItem?.content_type as typeof type) || type;

  // Debug: Log state data
  React.useEffect(() => {
    if (stateContentData) {
      logger.info('Navigation state content data received', 'WatchPage', {
        hasVideoUrl: Boolean(stateContentData.video_url),
        hasUrl: Boolean(stateContentData.url),
        contentId: stateContentData.id,
        contentType: stateContentData.type
      });
    } else {
      logger.debug('No navigation state content data', 'WatchPage', {
        hasState: Boolean(location.state),
        contentId
      });
    }
  }, [stateContentData, contentId]);

  const contentLoaderResult = useContentLoader(contentId, effectiveType, stateContentData);
  const {
    content,
    streamUrl: initialStreamUrl,
    streamType,
    related,
    loading,
    availableSubtitleLanguages,
    isTranscoded,
    directUrl,
  } = contentLoaderResult;

  // YouTube playlist channel support (e.g., Kan Educational)
  const isYouTubePlaylistChannel = streamType === 'youtube-playlist';
  const youtubePlaylist = useYouTubePlaylistChannel(contentId, isYouTubePlaylistChannel);

  // AI Companion sidebar state (for educational content)
  const { isVisible: isAICompanionVisible, toggle: toggleAICompanion, close: closeAICompanion } = useAICompanionStore();
  const showAIWand = isYouTubePlaylistChannel && youtubePlaylist.isAiEnhanced;

  // Local streamUrl state allows episode player to override the URL.
  // Use initialStreamUrl as fallback to avoid race condition where
  // the useEffect hasn't synced yet but render logic needs the URL.
  const [localStreamUrl, setStreamUrl] = React.useState<string | null>(initialStreamUrl);
  const streamUrl = localStreamUrl || initialStreamUrl;

  // Saved watch position for auto-resume
  const [savedPosition, setSavedPosition] = React.useState<number | null>(null);

  // Refresh state for podcast sync
  const [isRefreshing, setIsRefreshing] = useState(false);

  React.useEffect(() => {
    setStreamUrl(initialStreamUrl);
  }, [initialStreamUrl]);

  const { chapters, chaptersLoading, loadChapters } = useChaptersLoader();

  const { currentEpisodeId, handlePlayEpisode, handleDeleteEpisode } =
    useEpisodePlayer();

  // Effective content ID for podcast episodes (use episode ID if available)
  const progressContentId = effectiveType === 'podcast' && currentEpisodeId
    ? currentEpisodeId
    : contentId;

  // Fetch saved watch position on mount (and when episode changes for podcasts)
  React.useEffect(() => {
    logger.info('Watch position fetch effect triggered', 'WatchPage', {
      isAuthenticated,
      progressContentId,
      effectiveType,
    });

    const supportsResume = effectiveType === 'vod' || effectiveType === 'podcast';

    if (isAuthenticated && progressContentId && supportsResume) {
      logger.info('Fetching watch history', 'WatchPage', { progressContentId });
      historyService
        .getContinueWatching()
        .then((response) => {
          const items = response?.items || [];
          logger.info('Watch history received', 'WatchPage', {
            itemsCount: items.length,
          });
          const saved = items.find((i: any) => i.id === progressContentId);
          if (saved) {
            logger.info('Found saved position for content', 'WatchPage', {
              progressContentId,
              position: saved.position,
            });
            if (saved.position > 0) {
              setSavedPosition(saved.position);
            }
          } else {
            // Clear stale position when switching episodes
            setSavedPosition(null);
            logger.info('No saved position found for content', 'WatchPage', {
              progressContentId,
            });
          }
        })
        .catch((err) => {
          logger.error('Failed to fetch watch history', 'WatchPage', {
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        });
    } else {
      logger.info('Skipping watch history fetch', 'WatchPage', {
        isAuthenticated,
        hasContentId: !!progressContentId,
        effectiveType,
      });
    }
  }, [progressContentId, isAuthenticated, effectiveType]);

  useEffect(() => {
    if (
      contentId &&
      effectiveType !== 'live' &&
      effectiveType !== 'radio' &&
      effectiveType !== 'podcast'
    ) {
      loadChapters(contentId);
    }
  }, [contentId, effectiveType]);

  const handleProgress = React.useCallback(
    async (currentTime: number, duration: number) => {
      const supportsProgress = effectiveType === 'vod' || effectiveType === 'podcast';
      if (!isAuthenticated || !progressContentId || !supportsProgress) return;

      try {
        const percentage = (currentTime / duration) * 100;

        // Mark complete at 90% (send duration, not 0)
        const position = percentage >= 90 ? duration : currentTime;

        await historyService.updateProgress(progressContentId, effectiveType, position, duration);

        // Show completion notification once at 90%
        if (percentage >= 90 && percentage < 91) {
          notifications.show({
            level: 'success',
            title: t('watch.markedAsWatched', 'Marked as watched'),
            dismissable: true,
          });
        }
      } catch (error) {
        logger.error('Failed to save watch progress', 'WatchPage', {
          error: error instanceof Error ? error.message : 'Unknown error',
          progressContentId,
          currentTime,
          duration,
        });
        // Silent fail - don't interrupt playback
      }
    },
    [progressContentId, isAuthenticated, effectiveType, notifications, t]
  );

  const handleRestartComplete = React.useCallback(() => {
    setSavedPosition(null);
    logger.info('Watch position cleared after restart', 'WatchPage', { contentId });
  }, [contentId]);

  const handleRefreshPodcast = React.useCallback(async () => {
    if (effectiveType !== 'podcast' || !contentId) return;

    setIsRefreshing(true);
    logger.info('Refreshing podcast episodes', 'WatchPage', { contentId });

    try {
      const data = await api.post(`/podcasts/${contentId}/sync`);

      notifications.show({
        level: 'success',
        title: t('watch.podcastRefreshed', 'Podcast Refreshed'),
        message: data.episodes_added > 0
          ? (t as any)('watch.episodesAdded', { count: data.episodes_added }, `${data.episodes_added} new episode(s) added`)
          : t('watch.noNewEpisodes', 'No new episodes available'),
      });

      logger.info('Podcast refresh successful', 'WatchPage', {
        contentId,
        episodesAdded: data.episodes_added,
      });

      // Reload the page to show new episodes
      if (data.episodes_added > 0) {
        window.location.reload();
      }
    } catch (error: any) {
      logger.error('Failed to refresh podcast', 'WatchPage', { contentId, error: error.message || String(error) });
      notifications.show({
        level: 'error',
        title: t('watch.refreshFailed', 'Refresh Failed'),
        message: error.response?.data?.detail || t('watch.refreshError', 'Failed to refresh podcast. Please try again.'),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [effectiveType, contentId, notifications, t]);

  const onPlayEpisode = (episode: any) => {
    handlePlayEpisode(episode, setStreamUrl);
  };

  const onDeleteEpisode = (episodeId: string) => {
    notifications.show({
      level: 'warning',
      title: t('watch.deleteEpisode'),
      message: t('watch.confirmDeleteEpisode'),
      action: {
        label: t('common.delete'),
        type: 'action' as const,
        onPress: async () => {
          logger.info('Episode deletion confirmed', 'WatchPage', { contentId, episodeId })
          await handleDeleteEpisode(contentId, episodeId, () => {
            window.location.reload();
          });
        },
      },
      dismissable: true,
    });
  };

  // Show notification if user tries to access content without being logged in
  useEffect(() => {
    if (!loading && content && !streamUrl && !user) {
      logger.warn('Unauthenticated access attempt', 'WatchPage', {
        contentId,
        contentTitle: content.title || content.name
      })
      notifications.showError(
        t('auth.loginToWatch', { title: content.title || content.name || t('common.thisContent') }),
        t('auth.loginRequired')
      )
      // Redirect to login
      navigate('/auth/login')
    }
  }, [loading, content, streamUrl, user, navigate, t, contentId]);

  if (loading) {
    return <LoadingState />;
  }

  if (!content) {
    return (
      <NotFoundState
        notFoundLabel={t('watch.notFound')}
        backToHomeLabel={t('watch.backToHome')}
      />
    );
  }

  const isAudio = effectiveType === 'radio' || effectiveType === 'podcast';
  const isArticle = content.type === 'article' || content.content_format === 'article';
  const isEvent = content.type === 'event' || content.content_format === 'event';
  const hasVideo = Boolean(content.video_url);
  const isWebContent = (isArticle || isEvent) && !hasVideo; // Articles/events without video
  const isEmbedStream = streamType === 'dailymotion' || streamType === 'youtube';
  const title = content.title || content.name || '';
  const requiresAuth = !isWebContent && !hasVideo && !streamUrl && !isEmbedStream && !user;
  const hasStreamError = !loading && !streamUrl && user && !isWebContent && !hasVideo && !isEmbedStream;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerContainer}>
        <BackButton label={t('common.back')} onPress={() => window.history.back()} />
        {effectiveType === 'podcast' && (
          <GlassButton
            title={isRefreshing ? t('watch.refreshing', 'Refreshing...') : t('watch.refresh', 'Refresh')}
            variant="secondary"
            size="sm"
            onPress={handleRefreshPodcast}
            disabled={isRefreshing}
            style={styles.refreshButton}
          />
        )}
      </View>

      <View style={styles.playerContainer}>
        {requiresAuth ? (
          <AuthRequiredOverlay
            title={title}
            poster={content.backdrop || content.thumbnail}
          />
        ) : hasStreamError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>{t('watch.streamUnavailable', 'Stream Unavailable')}</Text>
            <Text style={styles.errorMessage}>
              {t('watch.streamError', 'Unable to load the stream. Please try again later.')}
            </Text>
          </View>
        ) : hasVideo && content.video_url ? (
          <VideoPlayer
            src={content.video_url}
            poster={content.backdrop || content.thumbnail}
            title={title}
            contentId={contentId}
            contentType={effectiveType}
            onProgress={handleProgress}
            isLive={false}
            availableSubtitleLanguages={availableSubtitleLanguages}
            chapters={chapters as any}
            chaptersLoading={chaptersLoading}
            initialSeekTime={initialSeekTime}
            savedPosition={savedPosition}
            onRestartComplete={handleRestartComplete}
            onEnded={handleContentEnded}
            onShowUpgrade={() => navigate('/subscribe')}
            isTranscoded={false}
            contentDuration={content.duration_hint}
            directUrl={content.video_url ?? undefined}
          />
        ) : isWebContent && content.url ? (
          <View style={styles.iframeContainer}>
            <iframe
              src={content.url}
              style={{
                width: '100%',
                height: '600px',
                border: 'none',
                borderRadius: '12px',
              }}
              title={title}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </View>
        ) : isEmbedStream && streamUrl ? (
          <View style={styles.iframeContainer}>
            <iframe
              src={streamUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '12px',
              }}
              title={title}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </View>
        ) : isYouTubePlaylistChannel && youtubePlaylist.streamUrl ? (
          <View style={styles.youtubePlaylistContainer}>
            {/* YouTube IFrame with synchronized playback */}
            <View style={styles.youtubePlayerRow}>
              <View style={styles.iframeContainer}>
                <iframe
                  src={youtubePlaylist.streamUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '12px',
                  }}
                  title={youtubePlaylist.currentProgram?.title || title}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                />
              </View>
              {/* AI Companion Sidebar */}
              <AICompanionSidebar
                contentId={contentId}
                programTitle={youtubePlaylist.currentProgram?.title}
                educationalTags={youtubePlaylist.aiFeatures}
                attribution={youtubePlaylist.attribution || undefined}
                isVisible={isAICompanionVisible}
                onClose={closeAICompanion}
              />
            </View>
            {/* Now Playing Info Bar with AI Wand Toggle */}
            {youtubePlaylist.currentProgram && (
              <View style={styles.nowPlayingBar}>
                <View style={styles.nowPlayingInfo}>
                  <Text style={styles.nowPlayingLabel}>{t('aiCompanion.nowPlaying')}</Text>
                  <Text style={styles.nowPlayingTitle}>{youtubePlaylist.currentProgram.title}</Text>
                </View>
                {youtubePlaylist.nextProgram && (
                  <View style={styles.upNextInfo}>
                    <Text style={styles.upNextLabel}>{t('aiCompanion.upNext')}</Text>
                    <Text style={styles.upNextTitle}>{youtubePlaylist.nextProgram.title}</Text>
                  </View>
                )}
                {/* AI Wand Toggle Button */}
                <AIWandToggle
                  isVisible={showAIWand}
                  isActive={isAICompanionVisible}
                  onToggle={toggleAICompanion}
                  features={youtubePlaylist.aiFeatures}
                />
              </View>
            )}
            {/* Attribution */}
            {youtubePlaylist.attribution && (
              <Text style={styles.attributionText}>{youtubePlaylist.attribution}</Text>
            )}
          </View>
        ) : isAudio ? (
          <AudioPlayer
            src={streamUrl || ''}
            title={title}
            artist={content.artist || content.author}
            cover={content.cover || content.logo || content.thumbnail}
            isLive={effectiveType === 'radio'}
            onEnded={handleContentEnded}
            onProgress={handleProgress}
            savedPosition={savedPosition}
          />
        ) : (
          <VideoPlayer
            src={streamUrl || ''}
            poster={content.backdrop || content.thumbnail}
            title={title}
            contentId={contentId}
            contentType={effectiveType}
            onProgress={handleProgress}
            isLive={effectiveType === 'live'}
            availableSubtitleLanguages={availableSubtitleLanguages}
            chapters={chapters as any}
            chaptersLoading={chaptersLoading}
            initialSeekTime={initialSeekTime}
            savedPosition={savedPosition}
            onRestartComplete={handleRestartComplete}
            onEnded={handleContentEnded}
            onShowUpgrade={() => navigate('/subscribe')}
            isTranscoded={isTranscoded}
            contentDuration={content.duration_hint}
            directUrl={directUrl ?? undefined}
          />
        )}
      </View>

      {showPlaylistPanel && isInFlow && (
        <PlaylistPanel
          playlist={playlist}
          playlistIndex={playlistIndex}
          isRTL={isRTL}
          onClose={() => setShowPlaylistPanel(false)}
          onSelectItem={playItemAtIndex}
        />
      )}

      <View style={styles.contentRow}>
        <View style={styles.mainContent}>
          {effectiveType === 'live' && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>{t('common.live')}</Text>
            </View>
          )}

          <Text style={styles.title}>{title}</Text>

          <ContentMetadata
            year={content.year}
            duration={content.duration}
            rating={content.rating}
            genre={content.genre}
            episodeCount={content.episodeCount}
            episodesLabel={t('watch.episodes')}
          />

          {content.description && (
            <Text style={styles.description}>{content.description}</Text>
          )}

          <ContentActions
            contentId={contentId}
            contentType={effectiveType}
            addToListLabel={t('watch.addToList')}
            inListLabel={t('content.inList')}
            likeLabel={t('watch.like')}
            shareLabel={t('watch.share')}
          />

          {content.cast && content.cast.length > 0 && (
            <View style={styles.castSection}>
              <Text style={styles.castTitle}>{t('watch.cast')}</Text>
              <Text style={styles.castText}>{content.cast.join(', ')}</Text>
            </View>
          )}

          {content.episodes && (
            <EpisodesList
              episodes={content.episodes}
              currentEpisodeId={currentEpisodeId}
              sectionTitle={t('watch.episodesList')}
              onPlayEpisode={onPlayEpisode}
              onDeleteEpisode={onDeleteEpisode}
            />
          )}
        </View>

        {effectiveType === 'live' && content.schedule && (
          <ScheduleSection
            schedule={content.schedule}
            sectionTitle={t('watch.schedule')}
            nowLabel={t('watch.now')}
          />
        )}
      </View>

      {related.length > 0 && (
        <ContentCarousel title={t('watch.related')} items={related} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    maxWidth: 1400,
    width: '100%',
  },
  refreshButton: {
  },
  playerContainer: {
    paddingHorizontal: spacing.md,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
    aspectRatio: 16 / 9,
    minHeight: 300,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  mainContent: {
    flex: 1,
  },
  liveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  liveBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.base,
    color: 'rgba(209, 213, 219, 1)',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  castSection: {
    marginTop: spacing.lg,
  },
  castTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  castText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius['2xl'],
  },
  errorTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.error.DEFAULT,
    marginBottom: spacing.md,
  },
  errorMessage: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  iframeContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  youtubePlaylistContainer: {
    width: '100%',
  },
  youtubePlayerRow: {
    flexDirection: 'row',
    position: 'relative',
  },
  nowPlayingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingLabel: {
    fontSize: fontSize.xs,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  nowPlayingTitle: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '600',
  },
  upNextInfo: {
    alignItems: 'flex-end',
  },
  upNextLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  upNextTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  attributionText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
