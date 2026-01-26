/**
 * Watch Page
 * Main page for watching VOD, live, radio, and podcast content
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';
import VideoPlayer from '@/components/player/VideoPlayer';
import AudioPlayer from '@/components/player/AudioPlayer';
import ContentCarousel from '@/components/content/ContentCarousel';
import { historyService } from '@/services/api';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
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
} from './hooks';
import { WatchPageProps } from './types';

export function WatchPage({ type = 'vod' }: WatchPageProps) {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const notifications = useNotifications();
  const user = useAuthStore((s) => s.user);
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  const contentLoaderResult = useContentLoader(contentId, effectiveType);
  const { content, streamUrl: initialStreamUrl, related, loading, availableSubtitleLanguages } =
    contentLoaderResult;

  const [streamUrl, setStreamUrl] = React.useState<string | null>(initialStreamUrl);

  React.useEffect(() => {
    setStreamUrl(initialStreamUrl);
  }, [initialStreamUrl]);

  const { chapters, chaptersLoading, loadChapters } = useChaptersLoader();

  const { currentEpisodeId, handlePlayEpisode, handleDeleteEpisode } =
    useEpisodePlayer();

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

  const handleProgress = async (position: number, duration: number) => {
    historyService
      .updateProgress(contentId, type, position, duration)
      .catch(() => {});
  };

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
  }, [loading, content, streamUrl, user, notifications, navigate, t, contentId]);

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
  const title = content.title || content.name || '';
  const requiresAuth = !streamUrl && !user;
  const hasStreamError = !loading && !streamUrl && user;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <BackButton label={t('common.back')} onPress={() => window.history.back()} />

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
        ) : isAudio ? (
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
            initialSeekTime={initialSeekTime}
            onEnded={handleContentEnded}
            onShowUpgrade={() => navigate('/subscribe')}
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
            addToListLabel={t('watch.addToList')}
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
});
