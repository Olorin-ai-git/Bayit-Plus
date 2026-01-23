/**
 * Episodes List Component
 * Displays list of podcast/show episodes with play and delete actions
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Play, Trash2 } from 'lucide-react';
import { colors } from '@bayit/shared/theme';
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
    <View className="mt-6">
      <Text className="text-lg font-semibold text-white mb-3">{sectionTitle}</Text>
      {episodes.map((episode, i) => (
        <View
          key={episode.id}
          className="flex-row items-center gap-3 p-4 bg-white/10 backdrop-blur-xl rounded-lg mb-3"
          style={[currentEpisodeId === episode.id && styles.episodeActive]}
          // @ts-ignore
          pointerEvents="box-none"
        >
          <Pressable
            className="w-10 h-10 min-w-[40px] min-h-[40px] justify-center items-center rounded bg-green-500/10 cursor-pointer"
            onPress={() => onPlayEpisode(episode)}
            // @ts-ignore
            pointerEvents="auto"
          >
            <Play size={18} color={colors.primary} fill={colors.primary} />
          </Pressable>
          <Text className="w-6 text-xs text-gray-400 text-center shrink-0">{i + 1}</Text>
          <Pressable
            className="flex-1 cursor-pointer py-1 px-3"
            onPress={() => onPlayEpisode(episode)}
            // @ts-ignore
            pointerEvents="auto"
          >
            <Text className="text-base font-medium text-white">{episode.title}</Text>
            <Text className="text-sm text-gray-400 mt-0.5">{episode.duration}</Text>
          </Pressable>
          <Pressable
            className="w-10 h-10 min-w-[40px] min-h-[40px] justify-center items-center rounded bg-red-500/10 cursor-pointer"
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
  episodeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
});
