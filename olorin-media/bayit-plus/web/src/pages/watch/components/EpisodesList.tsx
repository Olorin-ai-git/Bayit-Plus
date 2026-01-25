/**
 * Episodes List Component
 * Displays list of podcast/show episodes with play and delete actions
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Play, Trash2 } from 'lucide-react';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { Episode } from '../types';

interface EpisodesListProps {
  episodes: Episode[];
  currentEpisodeId: string | null;
  sectionTitle: string;
  onPlayEpisode: (episode: Episode) => void;
  onDeleteEpisode: (episodeId: string) => void;
}

export function EpisodesList({
  episodes,
  currentEpisodeId,
  sectionTitle,
  onPlayEpisode,
  onDeleteEpisode,
}: EpisodesListProps) {
  if (!episodes || episodes.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      {episodes.map((episode, i) => (
        <View
          key={episode.id}
          style={[
            styles.episodeRow,
            currentEpisodeId === episode.id && styles.episodeActive,
          ]}
        >
          <Pressable style={styles.playButton} onPress={() => onPlayEpisode(episode)}>
            <Play size={18} color={colors.primary} fill={colors.primary} />
          </Pressable>
          <Text style={styles.episodeNumber}>{i + 1}</Text>
          <Pressable style={styles.episodeContent} onPress={() => onPlayEpisode(episode)}>
            <Text style={styles.episodeTitle}>{episode.title}</Text>
            <Text style={styles.episodeDuration}>{episode.duration}</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={() => onDeleteEpisode(episode.id)}>
            <Trash2 size={16} color={colors.error} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  episodeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  playButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  episodeNumber: {
    width: 24,
    fontSize: fontSize.xs,
    color: 'rgba(156, 163, 175, 1)',
    textAlign: 'center',
  },
  episodeContent: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  episodeTitle: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.text,
  },
  episodeDuration: {
    fontSize: fontSize.sm,
    color: 'rgba(156, 163, 175, 1)',
    marginTop: 2,
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
  },
});
