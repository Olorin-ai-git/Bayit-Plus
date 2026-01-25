import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { isTV } from '../../utils/platform';
import { GlassProgressBar } from '../ui/GlassProgressBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Episode {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  episodeNumber: number;
  duration?: string;
  previewUrl?: string;
  progress?: number; // 0-100 percentage watched
}

interface EpisodeListProps {
  episodes: Episode[];
  selectedEpisodeId?: string;
  onEpisodeSelect: (episode: Episode) => void;
  onEpisodePlay: (episode: Episode) => void;
  showProgress?: boolean;
  seasonNumber?: number;
}

/**
 * EpisodeList Component
 * Vertical list of episodes with thumbnails, progress, and selection.
 * Supports TV focus navigation.
 */
export const EpisodeList: React.FC<EpisodeListProps> = ({
  episodes,
  selectedEpisodeId,
  onEpisodeSelect,
  onEpisodePlay,
  showProgress = true,
  seasonNumber,
}) => {
  const { t } = useTranslation();

  if (episodes.length === 0) {
    return (
      <View className="p-8 items-center">
        <Text className="text-base text-textSecondary">{t('content.noEpisodes')}</Text>
      </View>
    );
  }

  const renderEpisode = ({ item, index }: { item: Episode; index: number }) => (
    <EpisodeCard
      episode={item}
      isSelected={item.id === selectedEpisodeId}
      onSelect={() => onEpisodeSelect(item)}
      onPlay={() => onEpisodePlay(item)}
      showProgress={showProgress}
      hasTVPreferredFocus={index === 0}
    />
  );

  return (
    <View className="flex-1 py-4">
      <Text className="text-lg font-semibold text-white mb-4 px-2">
        {seasonNumber
          ? `${t('content.season')} ${seasonNumber} • ${episodes.length} ${t('content.episodes')}`
          : `${episodes.length} ${t('content.episodes')}`}
      </Text>
      <FlatList
        data={episodes}
        renderItem={renderEpisode}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-2 pb-8"
        ItemSeparatorComponent={() => <View className="h-4" />}
      />
    </View>
  );
};

interface EpisodeCardProps {
  episode: Episode;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  showProgress: boolean;
  hasTVPreferredFocus?: boolean;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  isSelected,
  onSelect,
  onPlay,
  showProgress,
  hasTVPreferredFocus,
}) => {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      friction: 6,
      useNativeDriver: true,
    }).start();
    // Also trigger select on focus for TV
    if (isTV) {
      onSelect();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (isTV) {
      // On TV, pressing selects + plays
      onPlay();
    } else {
      // On mobile/web, first press selects, second plays
      if (isSelected) {
        onPlay();
      } else {
        onSelect();
      }
    }
  };

  const thumbnailWidth = isTV ? 200 : 140;
  const thumbnailHeight = thumbnailWidth * 9 / 16;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        className={`flex-row bg-white/5 rounded-lg overflow-hidden border ${
          isSelected ? 'bg-white/10 border-primary' : 'border-transparent'
        } ${isFocused ? 'border-2 border-white bg-white/15' : ''}`}
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        activeOpacity={0.8}
        // @ts-ignore - TV prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        {/* Thumbnail */}
        <View style={{ width: thumbnailWidth, height: thumbnailHeight }} className="relative bg-black/30">
          {episode.thumbnail ? (
            <Image
              source={{ uri: episode.thumbnail }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full justify-center items-center bg-black/30">
              <Text className="text-[32px] opacity-50">🎬</Text>
            </View>
          )}

          {/* Play icon overlay */}
          <View className="absolute inset-0 justify-center items-center bg-black/30 opacity-80">
            <View className={`${isTV ? 'w-12 h-12' : 'w-9 h-9'} rounded-full bg-white/90 justify-center items-center`}>
              <Text className={`${isTV ? 'text-base' : 'text-xs'} text-black ml-0.5`}>▶</Text>
            </View>
          </View>

          {/* Duration badge */}
          {episode.duration && (
            <View className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded">
              <Text className="text-xs text-white font-medium">{episode.duration}</Text>
            </View>
          )}

          {/* Progress bar */}
          {showProgress && episode.progress !== undefined && episode.progress > 0 && (
            <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/30">
              <View
                style={{ width: `${episode.progress}%` }}
                className="h-full bg-primary"
              />
            </View>
          )}
        </View>

        {/* Content */}
        <View className={`flex-1 ${isTV ? 'p-4' : 'p-2'} justify-center`}>
          <Text className="text-xs text-textSecondary mb-0.5 uppercase tracking-wider">
            {t('content.episode')} {episode.episodeNumber}
          </Text>
          <Text className={`${isTV ? 'text-lg' : 'text-base'} font-semibold text-white mb-2`} numberOfLines={2}>
            {episode.title}
          </Text>
          {episode.description && (
            <Text className={`${isTV ? 'text-sm leading-5' : 'text-xs leading-4'} text-textSecondary`} numberOfLines={2}>
              {episode.description}
            </Text>
          )}
        </View>

        {/* Selected indicator */}
        {isSelected && (
          <View className={`${isTV ? 'w-12' : 'w-10'} justify-center items-center bg-primary`}>
            <Text className={`${isTV ? 'text-lg' : 'text-sm'} text-white`}>▶</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default EpisodeList;
