/**
 * SpotlightSection - Spotlight carousel with featured content
 *
 * Auto-scrolling hero carousel with pagination dots,
 * large hero cards with gradient overlay, and RTL support.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  Dimensions,
  StyleSheet,
  ViewToken,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('SpotlightSection');

interface SpotlightItem {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
}

interface SpotlightSectionProps {
  items: SpotlightItem[];
  onItemPress: (item: SpotlightItem) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const AUTO_SCROLL_INTERVAL_MS = 5000;

export const SpotlightSection: React.FC<SpotlightSectionProps> = ({
  items,
  onItemPress,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const reduceMotion = useReducedMotion();
  const flatListRef = useRef<FlatList<SpotlightItem>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const orderedItems = isRTL ? [...items].reverse() : items;

  const startAutoScroll = useCallback(() => {
    if (reduceMotion || orderedItems.length <= 1) return;
    autoScrollTimer.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % orderedItems.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_INTERVAL_MS);
  }, [orderedItems.length, reduceMotion]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoScroll();
    return stopAutoScroll;
  }, [startAutoScroll, stopAutoScroll]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handlePress = useCallback(
    (item: SpotlightItem) => {
      stopAutoScroll();
      onItemPress(item);
    },
    [onItemPress, stopAutoScroll],
  );

  const renderItem = useCallback(
    ({ item }: { item: SpotlightItem }) => (
      <Pressable
        onPress={() => handlePress(item)}
        style={styles.card}
        accessibilityLabel={t('spotlight.itemLabel', { title: item.title })}
        accessibilityHint={t('spotlight.itemHint')}
        accessibilityRole="button"
      >
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
        >
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.description, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {item.description}
          </Text>
        </LinearGradient>
      </Pressable>
    ),
    [handlePress, isRTL, t],
  );

  if (orderedItems.length === 0) return null;

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('spotlight.sectionLabel')}
      accessibilityRole="list"
    >
      <FlatList
        ref={flatListRef}
        data={orderedItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollBeginDrag={stopAutoScroll}
        onScrollEndDrag={startAutoScroll}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
      {orderedItems.length > 1 && (
        <View style={styles.dotsContainer}>
          {orderedItems.map((_, idx) => (
            <View
              key={orderedItems[idx].id}
              style={[styles.dot, idx === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  card: { width: SCREEN_WIDTH, height: 220, position: 'relative' },
  image: { width: '100%', height: '100%' },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.xxl,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  description: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: fontSize.sm * 1.4 },
  dotsContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: spacing.sm, gap: spacing.xs,
  },
  dot: { width: 8, height: 8, borderRadius: borderRadius.full, backgroundColor: colors.textMuted, opacity: 0.4 },
  dotActive: { backgroundColor: colors.primary, opacity: 1, width: 24 },
});
