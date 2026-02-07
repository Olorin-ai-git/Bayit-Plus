/**
 * RecommendationSection - Horizontal content shelf for a recommendation category
 *
 * TV-optimized horizontal FlatList with card items showing poster,
 * title, subtitle, and relevance badge. Focus navigation via D-pad.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';
import { config } from '../../../config/appConfig';
import type { RecommendationItem } from '../../../hooks/useAIRecommendations';

interface RecommendationSectionProps {
  title: string;
  items: RecommendationItem[];
  onItemPress: (item: RecommendationItem) => void;
  isLoading: boolean;
}

interface RecommendationCardProps {
  item: RecommendationItem;
  onPress: () => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  item,
  onPress,
}) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const relevancePercent = Math.round(item.relevance_score * 100);

  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={styles.cardContainer}
      accessible
      accessibilityLabel={`${item.title}, ${item.reason}`}
      accessibilityHint={t('tvos.aiRecommendations.selectToPlay')}
    >
      <View
        style={[
          styles.card,
          isFocused && styles.cardFocused,
        ]}
      >
        <View style={styles.thumbnailContainer}>
          {item.thumbnail_url ? (
            <Image
              source={{ uri: item.thumbnail_url }}
              style={styles.thumbnail}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.thumbnailPlaceholder} />
          )}

          {/* Relevance badge */}
          <View style={styles.relevanceBadge}>
            <Text style={styles.relevanceText}>
              {relevancePercent}%
            </Text>
          </View>
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.itemTitle} numberOfLines={2} ellipsizeMode="tail">
            {item.title}
          </Text>
          <Text style={styles.itemReason} numberOfLines={2} ellipsizeMode="tail">
            {item.reason}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  title,
  items,
  onItemPress,
  isLoading,
}) => {
  const { t } = useTranslation();

  const renderItem = useCallback(
    ({ item }: { item: RecommendationItem }) => (
      <RecommendationCard item={item} onPress={() => onItemPress(item)} />
    ),
    [onItemPress]
  );

  const keyExtractor = useCallback(
    (item: RecommendationItem) => item.id,
    []
  );

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.emptyText}>
          {t('tvos.aiRecommendations.noItems')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfContent}
      />
    </View>
  );
};

const fullSize = { width: '100%' as const, height: '100%' as const };

const styles = StyleSheet.create({
  section: { marginBottom: spacing[8] },
  sectionTitle: {
    fontSize: 36, fontWeight: 'bold', color: colors.white,
    paddingHorizontal: spacing[8], marginBottom: spacing[5],
  },
  shelfContent: { paddingHorizontal: spacing[8], gap: spacing[4] },
  cardContainer: { marginRight: spacing[2] },
  card: {
    width: config.tv.shelfItemWidth, borderRadius: 16, overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 35, 0.85)', borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardFocused: {
    borderColor: '#A855F7', borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: config.tv.focusScaleFactor }],
  },
  thumbnailContainer: {
    ...fullSize, height: config.tv.shelfItemHeight,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  thumbnail: fullSize,
  thumbnailPlaceholder: { ...fullSize, backgroundColor: 'rgba(168, 85, 247, 0.1)' },
  relevanceBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.85)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  relevanceText: { color: colors.white, fontSize: 20, fontWeight: '700' },
  contentSection: { padding: 12, gap: 4 },
  itemTitle: {
    fontSize: config.tv.minBodyTextSizePt, fontWeight: '600',
    color: colors.white, lineHeight: config.tv.minBodyTextSizePt * 1.2,
  },
  itemReason: {
    fontSize: config.tv.minButtonTextSizePt, color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: config.tv.minButtonTextSizePt * 1.3,
  },
  loadingRow: { height: 220, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 26, color: 'rgba(255, 255, 255, 0.4)', paddingHorizontal: spacing[8] },
});
