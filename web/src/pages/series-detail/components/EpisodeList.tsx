/**
 * Episode List Component
 * Displays list of episodes for selected season
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@bayit/shared/theme';
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
              onSelect={() => onEpisodeSelect(episode)}
              onPlay={() => onEpisodePlay(episode)}
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
  );
}

const styles = StyleSheet.create({
  episodesSection: {
    paddingHorizontal: 48,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  episodesList: {
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
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
});
