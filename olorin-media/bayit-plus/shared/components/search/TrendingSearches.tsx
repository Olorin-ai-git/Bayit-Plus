import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
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
        style={[
          styles.trendingChip,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.trendingChipFocused,
        ]}
      >
        <Text style={styles.trendingRankIcon}>{getRankIcon(item.rank)}</Text>
        <Text style={styles.trendingText} numberOfLines={1}>
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
      <View style={styles.container}>
        <Text style={[styles.title, { textAlign }]}>
          {t('search.trending', 'Trending Searches')}
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (trending.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t('search.trending', 'Trending Searches')}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: isTV ? spacing.xxl : spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  scrollContent: {
    gap: spacing.sm,
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: isTV ? spacing.sm : spacing.xs,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    gap: spacing.xs,
    maxWidth: isTV ? 300 : 200,
  },
  trendingChipFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    // @ts-ignore - Web CSS property
    boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)',
  },
  trendingRankIcon: {
    fontSize: isTV ? 18 : 16,
  },
  trendingText: {
    fontSize: isTV ? 16 : 14,
    color: colors.text,
    fontWeight: '600',
  },
});

export default TrendingSearches;
