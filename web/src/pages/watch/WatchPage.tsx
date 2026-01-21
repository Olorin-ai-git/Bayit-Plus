/**
 * Watch Page
 * Main page for watching VOD, live, radio, and podcast content
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useModal } from '@/contexts/ModalContext';
import VideoPlayer from '@/components/player/VideoPlayer';
import AudioPlayer from '@/components/player/AudioPlayer';
import ContentCarousel from '@/components/content/ContentCarousel';
import { historyService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';
import {
  BackButton,
  ContentActions,
  ContentMetadata,
  EpisodesList,
  FlowHeader,
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
  const { showConfirm } = useModal();
  const params = useParams();
  const navigate = useNavigate();

  const {
    playlist,
    playlistIndex,
    flowName,
    showPlaylistPanel,
    hasNextItem,
    hasPrevItem,
    isInFlow,
    setShowPlaylistPanel,
    playNextItem,
    playPrevItem,
    playItemAtIndex,
    handleContentEnded,
    exitFlow,
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
    showConfirm(
      t('watch.confirmDeleteEpisode'),
      async () => {
        await handleDeleteEpisode(contentId, episodeId, () => {
          window.location.reload();
        });
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <BackButton label={t('common.back')} onPress={() => window.history.back()} />

      {isInFlow && (
        <FlowHeader
          flowName={flowName}
          playlistIndex={playlistIndex}
          playlistLength={playlist.length}
          hasPrevItem={hasPrevItem}
          hasNextItem={hasNextItem}
          isRTL={isRTL}
          onTogglePlaylist={() => setShowPlaylistPanel(!showPlaylistPanel)}
          onPlayPrev={playPrevItem}
          onPlayNext={playNextItem}
          onExit={exitFlow}
        />
      )}

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

      {showPlaylistPanel && isInFlow && (
        <PlaylistPanel
          playlist={playlist}
          playlistIndex={playlistIndex}
          isRTL={isRTL}
          onClose={() => setShowPlaylistPanel(false)}
          onSelectItem={playItemAtIndex}
        />
      )}

      <View style={styles.infoContainer}>
        <View style={styles.mainInfo}>
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
              <Text style={styles.sectionTitle}>{t('watch.cast')}</Text>
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
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xl * 2,
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
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
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
});
