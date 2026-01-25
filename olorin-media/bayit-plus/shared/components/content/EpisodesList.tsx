import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { isTV } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';

export interface Episode {
  id: string;
  episode_number: number;
  season_number: number;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  progress?: number; // 0-100
}

export interface EpisodesListProps {
  episodes: Episode[];
  onEpisodePress?: (episode: Episode) => void;
  selectedEpisodeId?: string;
}

const EpisodeCard: React.FC<{
  episode: Episode;
  onPress?: () => void;
  isSelected?: boolean;
  index: number;
}> = ({ episode, onPress, isSelected, index }) => {
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.03,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      className={`${isTV ? 'flex-1/3 p-2' : 'flex-1 mb-4'}`}
    >
      <Animated.View
        style={{ transform: [{ scale: scaleAnim }] }}
        className={`bg-white/5 rounded-lg overflow-hidden border-2 ${
          isSelected ? 'border-secondary bg-secondary/15' : 'border-transparent'
        } ${isFocused ? 'border-primary bg-primary/15' : ''}`}
      >
        <View className="aspect-video relative bg-white/5 overflow-hidden">
          {episode.thumbnail ? (
            <Image
              source={{ uri: episode.thumbnail }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 justify-center items-center bg-primary/20">
              <Text className={`${isTV ? 'text-[42px]' : 'text-[28px]'} font-bold text-white`}>
                E{episode.episode_number}
              </Text>
            </View>
          )}

          {/* Play Overlay */}
          {(isFocused || isSelected) && (
            <View className="absolute inset-0 bg-black/40 justify-center items-center">
              <View className={`${isTV ? 'w-[60px] h-[60px]' : 'w-10 h-10'} rounded-full bg-primary justify-center items-center`}>
                <Text className={`${isTV ? 'text-2xl' : 'text-base'} text-background ml-1`}>▶</Text>
              </View>
            </View>
          )}

          {/* Progress Bar */}
          {episode.progress !== undefined && episode.progress > 0 && (
            <View className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <View
                style={{ width: `${episode.progress}%` }}
                className="h-full bg-primary"
              />
            </View>
          )}

          {/* Duration Badge */}
          {episode.duration && (
            <View className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded">
              <Text className={`${isTV ? 'text-sm' : 'text-xs'} text-white font-medium`}>{episode.duration}</Text>
            </View>
          )}
        </View>

        <View className={`${isTV ? 'p-4' : 'p-2'}`}>
          <Text style={{ textAlign }} className={`${isTV ? 'text-sm' : 'text-xs'} text-textMuted mb-0.5 uppercase font-semibold`}>
            Episode {episode.episode_number}
          </Text>
          <Text style={{ textAlign }} className={`${isTV ? 'text-lg' : 'text-sm'} font-semibold text-white mb-1 ${isTV ? 'leading-6' : 'leading-[18px]'}`} numberOfLines={2}>
            {episode.title}
          </Text>
          {episode.description && (
            <Text style={{ textAlign }} className={`${isTV ? 'text-sm' : 'text-xs'} text-textSecondary ${isTV ? 'leading-5' : 'leading-4'}`} numberOfLines={2}>
              {episode.description}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const EpisodesList: React.FC<EpisodesListProps> = ({
  episodes,
  onEpisodePress,
  selectedEpisodeId,
}) => {
  const { t } = useTranslation();

  if (!episodes || episodes.length === 0) {
    return (
      <View className={`${isTV ? 'p-12' : 'p-8'} items-center`}>
        <Text className={`${isTV ? 'text-xl' : 'text-base'} text-textMuted`}>{t('content.noEpisodes', 'No episodes available')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={episodes}
      keyExtractor={(item) => item.id}
      numColumns={isTV ? 3 : 1}
      key={isTV ? 'tv' : 'mobile'}
      contentContainerClassName={`${isTV ? 'px-8' : 'px-6'} py-4`}
      renderItem={({ item, index }) => (
        <EpisodeCard
          episode={item}
          onPress={() => onEpisodePress?.(item)}
          isSelected={item.id === selectedEpisodeId}
          index={index}
        />
      )}
    />
  );
};

export default EpisodesList;
