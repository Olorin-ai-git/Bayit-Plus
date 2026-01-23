/**
 * Watch Page
 * Main page for watching VOD, live, radio, and podcast content
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useModal } from '@/contexts/ModalContext';
import VideoPlayer from '@/components/player/VideoPlayer';
import AudioPlayer from '@/components/player/AudioPlayer';
import ContentCarousel from '@/components/content/ContentCarousel';
import { historyService } from '@/services/api';
import { colors } from '@bayit/shared/theme';
import {
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
  const { showConfirm } = useModal();
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
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 96 }}>
      <BackButton label={t('common.back')} onPress={() => window.history.back()} />

      <View className="px-4 max-w-[1400px] mx-auto w-full aspect-video min-h-[300px] rounded-2xl overflow-hidden">
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

      <View className="flex-row px-4 pt-6 gap-6 max-w-[1400px] mx-auto w-full">
        <View className="flex-1">
          {effectiveType === 'live' && (
            <View className="bg-red-500 px-3 py-1 rounded self-start mb-4">
              <Text className="text-xs font-bold text-white tracking-widest">{t('common.live')}</Text>
            </View>
          )}

          <Text className="text-[28px] font-bold text-white mb-4">{title}</Text>

          <ContentMetadata
            year={content.year}
            duration={content.duration}
            rating={content.rating}
            genre={content.genre}
            episodeCount={content.episodeCount}
            episodesLabel={t('watch.episodes')}
          />

          {content.description && (
            <Text className="text-base text-gray-300 leading-6 mb-6">{content.description}</Text>
          )}

          <ContentActions
            addToListLabel={t('watch.addToList')}
            likeLabel={t('watch.like')}
            shareLabel={t('watch.share')}
          />

          {content.cast && content.cast.length > 0 && (
            <View className="mt-6">
              <Text className="text-lg font-semibold text-white mb-3">{t('watch.cast')}</Text>
              <Text className="text-sm text-gray-400">{content.cast.join(', ')}</Text>
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
