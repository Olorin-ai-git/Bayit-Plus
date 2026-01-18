/**
 * Episodes List Component
 * Displays list of podcast/show episodes with play and delete actions
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Play, Trash2 } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
            styles.episodeItem,
            currentEpisodeId === episode.id && styles.episodeItemActive,
          ]}
          // @ts-ignore
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.playButton}
            onPress={() => onPlayEpisode(episode)}
            // @ts-ignore
            pointerEvents="auto"
          >
            <Play size={18} color={colors.primary} fill={colors.primary} />
          </Pressable>
          <Text style={styles.episodeNumber}>{i + 1}</Text>
          <Pressable
            style={styles.episodeInfoPress}
            onPress={() => onPlayEpisode(episode)}
            // @ts-ignore
            pointerEvents="auto"
          >
            <Text style={styles.episodeTitle}>{episode.title}</Text>
            <Text style={styles.episodeDuration}>{episode.duration}</Text>
          </Pressable>
          <Pressable
            style={styles.deleteButton}
            onPress={() => onDeleteEpisode(episode.id)}
            // @ts-ignore
            pointerEvents="auto"
          >
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
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
});
