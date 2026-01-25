/**
 * Episode List Component
 * Displays list of episodes for selected season
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@olorin/design-tokens';
import { EpisodeCard } from './EpisodeCard';
import type { Episode } from '../types/series.types';

interface EpisodeListProps {
  episodes: Episode[];
  selectedSeason: number;
  selectedEpisode: Episode | null;
  episodesLoading: boolean;
  flexDirection: 'row' | 'row-reverse';
  onEpisodeSelect: (episode: Episode) => void;
  onEpisodePlay: (episode: Episode) => void;
}

export function EpisodeList({
  episodes,
  selectedSeason,
  selectedEpisode,
  episodesLoading,
  flexDirection,
  onEpisodeSelect,
  onEpisodePlay,
}: EpisodeListProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {episodes.length > 0 && (
        <Text style={styles.title}>
          {t('content.season')} {selectedSeason} • {episodes.length} {t('content.episodes')}
        </Text>
      )}

      {episodesLoading ? (
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      ) : episodes.length > 0 ? (
        <View style={styles.episodesContainer}>
          {episodes.map((episode) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              isSelected={selectedEpisode?.id === episode.id}
              onSelect={() => onEpisodeSelect(episode)}
              onPlay={() => onEpisodePlay(episode)}
              flexDirection={flexDirection}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('content.noEpisodes')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 48,
    paddingVertical: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  episodesContainer: {
    gap: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
});
