import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';
import { useYouTubeThumbnail } from '../../hooks/useYouTubeThumbnail';

export interface RecommendedContent {
  id: string;
  title: string;
  thumbnail?: string;
  type?: string;
  year?: number | string;
  rating?: string;
  imdb_rating?: number;
}

export interface RecommendationsCarouselProps {
  recommendations: RecommendedContent[];
  onItemPress?: (item: RecommendedContent) => void;
  title?: string;
}

const RecommendationCard: React.FC<{
  item: RecommendedContent;
  onPress?: () => void;
  index: number;
}> = ({ item, onPress, index }) => {
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { thumbnailUrl, handleError } = useYouTubeThumbnail(item.thumbnail);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.05,
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
      className={`${isTV ? 'mr-6' : 'mr-4'}`}
    >
      <Animated.View
        style={{ transform: [{ scale: scaleAnim }] }}
        className={`${isTV ? 'w-[280px]' : 'w-[180px]'} rounded-lg bg-white/5 overflow-hidden border-2 ${
          isFocused ? 'border-primary bg-primary/15' : 'border-transparent'
        }`}
      >
        <View className="aspect-video relative bg-white/5 overflow-hidden">
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              className="w-full h-full"
              resizeMode="cover"
              onError={handleError}
            />
          ) : (
            <View className="flex-1 justify-center items-center bg-white/5">
              <Text className={`${isTV ? 'text-5xl' : 'text-[32px]'}`}>🎬</Text>
            </View>
          )}
          {item.imdb_rating && (
            <View className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded">
              <Text className={`${isTV ? 'text-sm' : 'text-xs'} text-white font-semibold`}>⭐ {item.imdb_rating.toFixed(1)}</Text>
            </View>
          )}
          {item.type && (
            <View className="absolute top-2 left-2 bg-primary px-2 py-0.5 rounded">
              <Text className={`${isTV ? 'text-xs' : 'text-[10px]'} text-white font-semibold`}>{item.type.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View className={`${isTV ? 'p-4' : 'p-2'}`}>
          <Text style={{ textAlign }} className={`${isTV ? 'text-lg leading-6' : 'text-sm leading-[18px]'} font-semibold text-white mb-1`} numberOfLines={2}>
            {item.title}
          </Text>
          {(item.year || item.rating) && (
            <Text style={{ textAlign }} className={`${isTV ? 'text-sm' : 'text-xs'} text-textMuted`} numberOfLines={1}>
              {item.year}{item.year && item.rating && ' • '}{item.rating}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const RecommendationsCarousel: React.FC<RecommendationsCarouselProps> = ({
  recommendations,
  onItemPress,
  title,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const displayTitle = title || t('content.youMayAlsoLike', 'You May Also Like');

  return (
    <View className={`${isTV ? 'my-8' : 'my-6'}`}>
      <Text style={{ textAlign }} className={`${isTV ? 'text-[28px]' : 'text-xl'} font-semibold text-white ${
        isTV ? 'mb-6' : 'mb-4'
      } ${isTV ? 'px-8' : 'px-6'}`}>{displayTitle}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={`${isTV ? 'px-8' : 'px-6'} py-2`}
        className="overflow-visible"
      >
        {recommendations.map((item, index) => (
          <RecommendationCard
            key={item.id}
            item={item}
            onPress={() => onItemPress?.(item)}
            index={index}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default RecommendationsCarousel;
