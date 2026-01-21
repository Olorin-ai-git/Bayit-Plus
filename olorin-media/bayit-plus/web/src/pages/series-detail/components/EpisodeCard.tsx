/**
 * Episode Card Component
 * Displays individual episode information with thumbnail and progress
 */

import { View, Text, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import type { Episode } from '../types/series.types';

interface EpisodeCardProps {
  episode: Episode;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  flexDirection: 'row' | 'row-reverse';
}

export function EpisodeCard({
  episode,
  isSelected,
  onSelect,
  onPlay,
  flexDirection,
}: EpisodeCardProps) {
  const { t } = useTranslation();

  return (
    <View
      className={`flex-row bg-white/5 rounded-lg overflow-hidden border ${isSelected ? 'bg-white/10 border-[#6B21A8]' : 'border-transparent'} cursor-pointer`}
      onClick={isSelected ? onPlay : onSelect}
    >
      <View className="w-40 h-[90px] relative bg-black/30">
        {episode.thumbnail ? (
          <Image
            source={{ uri: episode.thumbnail }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full justify-center items-center">
            <Text className="text-[32px] opacity-50">🎬</Text>
          </View>
        )}

        <View className="absolute inset-0 justify-center items-center bg-black/30">
          <View className="w-9 h-9 rounded-[18px] bg-white/90 justify-center items-center">
            <Play size={16} color="#000" fill="#000" />
          </View>
        </View>

        {episode.duration && (
          <View className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded">
            <Text className="text-xs text-white font-medium">{episode.duration}</Text>
          </View>
        )}

        {episode.progress !== undefined && episode.progress > 0 && (
          <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/30">
            <View className="h-full bg-[#6B21A8]" style={{ width: `${episode.progress}%` }} />
          </View>
        )}
      </View>

      <View className="flex-1 p-4 justify-center">
        <Text className="text-xs text-white/70 mb-0.5 uppercase tracking-wider">
          {t('content.episode')} {episode.episode_number}
        </Text>
        <Text className="text-base font-semibold text-white mb-2" numberOfLines={2}>
          {episode.title}
        </Text>
        {episode.description && (
          <Text className="text-sm text-white/70 leading-[18px]" numberOfLines={2}>
            {episode.description}
          </Text>
        )}
      </View>

      {isSelected && (
        <View className="w-10 justify-center items-center bg-[#6B21A8]">
          <Play size={16} color="#fff" fill="#fff" />
        </View>
      )}
    </View>
  );
}
