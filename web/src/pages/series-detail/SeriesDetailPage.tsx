/**
 * Series Detail Page
 * Main orchestrator for series detail view
 */

import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import ContentCarousel from '@/components/content/ContentCarousel';
import { colors } from '@bayit/shared/theme';
import { useFullscreenPlayerStore } from '@/stores/fullscreenPlayerStore';
import { useSeriesData, useVideoPreview } from './hooks';
import { SeriesHero, SeasonSelector, EpisodeList, CastSection } from './components';
import type { Episode } from './types';

export default function SeriesDetailPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { seriesId } = useParams<{ seriesId: string }>();
  const openPlayer = useFullscreenPlayerStore((state) => state.openPlayer);

  const {
    series,
    episodes,
    selectedSeason,
    selectedEpisode,
    loading,
    episodesLoading,
    inWatchlist,
    setSelectedSeason,
    setSelectedEpisode,
    toggleWatchlist,
  } = useSeriesData({ seriesId });

  const { isPreviewPlaying, showPoster, videoRef, startPreview, stopPreview, cleanup } =
    useVideoPreview({
      selectedEpisode,
      series,
      episodes,
    });

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const handlePlay = () => {
    const episodeToPlay = selectedEpisode || episodes[0];
    if (episodeToPlay) {
      openPlayer({
        id: episodeToPlay.id,
        title: `${series?.title} - ${episodeToPlay.title}`,
        src: '',
        poster: episodeToPlay.thumbnail || series?.backdrop || series?.thumbnail,
        type: 'series',
        seriesId: series?.id,
        episodeId: episodeToPlay.id,
      });
    }
  };

  const handleEpisodeSelect = (episode: Episode) => {
    setSelectedEpisode(episode);
  };

  const handleEpisodePlay = (episode: Episode) => {
    openPlayer({
      id: episode.id,
      title: `${series?.title} - ${episode.title}`,
      src: '',
      poster: episode.thumbnail || series?.backdrop || series?.thumbnail,
      type: 'series',
      seriesId: series?.id,
      episodeId: episode.id,
    });
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <SeriesHero
        series={series}
        selectedEpisode={selectedEpisode}
        selectedSeason={selectedSeason}
        episodes={episodes}
        inWatchlist={inWatchlist}
        isPreviewPlaying={isPreviewPlaying}
        showPoster={showPoster}
        videoRef={videoRef}
        flexDirection={flexDirection}
        textAlign={textAlign}
        onPlay={handlePlay}
        toggleWatchlist={toggleWatchlist}
        startPreview={startPreview}
      />

      <SeasonSelector
        seasons={series.seasons || []}
        selectedSeason={selectedSeason}
        onSeasonChange={setSelectedSeason}
        flexDirection={flexDirection}
      />

      <EpisodeList
        episodes={episodes}
        selectedSeason={selectedSeason}
        selectedEpisode={selectedEpisode}
        episodesLoading={episodesLoading}
        flexDirection={flexDirection}
        onEpisodeSelect={handleEpisodeSelect}
        onEpisodePlay={handleEpisodePlay}
      />

      <CastSection cast={series.cast} textAlign={textAlign} />

      {series.related && series.related.length > 0 && (
        <ContentCarousel title={t('content.youMayAlsoLike')} items={series.related} />
      )}
    </ScrollView>
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
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 18,
  },
});
