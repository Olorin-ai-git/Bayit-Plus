import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { isTV } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';
import { searchService } from '../../services/api';

export interface TrendingItem {
  query: string;
  rank: number;
  category?: string;
}

export interface TrendingSearchesProps {
  onSearchSelect: (query: string) => void;
  maxItems?: number;
}

const TrendingChip: React.FC<{
  item: TrendingItem;
  onPress: () => void;
  index: number;
}> = ({ item, onPress, index }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  const getRankIcon = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🔥';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.7}
      // @ts-ignore - TV preferred focus
      hasTVPreferredFocus={index === 0 && isTV}
    >
      <Animated.View
        className={`flex-row items-center bg-purple-500/10 rounded-2xl border-2 gap-1 ${
          isFocused ? 'border-purple-500 bg-purple-500/20' : 'border-purple-500/30'
        } ${isTV ? 'px-3 py-2 max-w-[300px]' : 'px-3 py-1 max-w-[200px]'}`}
        style={{
          transform: [{ scale: scaleAnim }],
          ...(isFocused && { boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)' } as any),
        }}
      >
        <Text className={isTV ? 'text-lg' : 'text-base'}>{getRankIcon(item.rank)}</Text>
        <Text className={`text-white font-semibold ${isTV ? 'text-base' : 'text-sm'}`} numberOfLines={1}>
          {item.query}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const TrendingSearches: React.FC<TrendingSearchesProps> = ({
  onSearchSelect,
  maxItems = 10,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setIsLoading(true);
    try {
      // Try to get trending searches from API
      const response = await (searchService as any).getTrending?.();
      if (response && Array.isArray(response.trending)) {
        const items = response.trending
          .slice(0, maxItems)
          .map((item: any, index: number) => ({
            query: item.query || item,
            rank: index + 1,
            category: item.category,
          }));
        setTrending(items);
      } else {
        // Fallback to popular content if trending API not available
        setTrending([]);
      }
    } catch (error) {
      console.error('Failed to load trending searches:', error);
      // Show empty instead of error to not break UI
      setTrending([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View className={isTV ? 'px-8 pb-4' : 'px-4 pb-4'}>
        <Text className={`text-white font-semibold mb-3 ${isTV ? 'text-xl' : 'text-lg'}`} style={{ textAlign }}>
          {t('search.trending', 'Trending Searches')}
        </Text>
        <View className="py-6 items-center">
          <ActivityIndicator size="small" color="#a855f7" />
        </View>
      </View>
    );
  }

  if (trending.length === 0) {
    return null;
  }

  return (
    <View className={isTV ? 'px-8 pb-4' : 'px-4 pb-4'}>
      <Text className={`text-white font-semibold mb-3 ${isTV ? 'text-xl' : 'text-lg'}`} style={{ textAlign }}>
        {t('search.trending', 'Trending Searches')}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {trending.map((item, index) => (
          <TrendingChip
            key={`${item.query}-${index}`}
            item={item}
            onPress={() => onSearchSelect(item.query)}
            index={index}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default TrendingSearches;
