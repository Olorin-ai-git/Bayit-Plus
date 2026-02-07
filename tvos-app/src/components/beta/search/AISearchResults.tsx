/**
 * AISearchResults - Grid display of AI search results for tvOS
 *
 * Renders a 5-column FlatList grid of content cards with poster images,
 * titles, and type badges. Includes empty and loading states.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared';
import { colors, spacing } from '@olorin/design-tokens';
import type { SearchResult } from '../../../hooks/useAISearch';

interface AISearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  onItemPress: (item: SearchResult) => void;
}

const GRID_COLUMNS = 5;

const TYPE_BADGE_COLORS: Record<string, string> = {
  movie: '#7C3AED',
  series: '#2563EB',
  live_tv: '#DC2626',
  radio: '#059669',
  podcast: '#D97706',
};

export const AISearchResults: React.FC<AISearchResultsProps> = ({
  results,
  isLoading,
  onItemPress,
}) => {
  const { t } = useTranslation();

  if (isLoading && results.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={styles.loadingText}>
          {t('tvos.aiSearch.searching')}
        </Text>
      </View>
    );
  }

  if (!isLoading && results.length === 0) {
    return (
      <GlassView style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          {t('tvos.aiSearch.emptyTitle')}
        </Text>
        <Text style={styles.emptySubtitle}>
          {t('tvos.aiSearch.emptySubtitle')}
        </Text>
      </GlassView>
    );
  }

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <ResultCard item={item} onPress={onItemPress} />
    ),
    [onItemPress],
  );

  const keyExtractor = useCallback((item: SearchResult) => item.id, []);

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={GRID_COLUMNS}
      contentContainerStyle={styles.gridContent}
      columnWrapperStyle={styles.gridRow}
      showsVerticalScrollIndicator={false}
    />
  );
};

interface ResultCardProps {
  item: SearchResult;
  onPress: (item: SearchResult) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ item, onPress }) => {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const badgeColor = TYPE_BADGE_COLORS[item.content_type] ?? '#6B7280';

  return (
    <Pressable
      onPress={() => onPress(item)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.card, focused && styles.cardFocused]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${item.title} - ${t(`tvos.aiSearch.types.${item.content_type}`)}`}
    >
      <Image
        source={{ uri: item.thumbnail_url }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={[styles.typeBadge, { backgroundColor: badgeColor }]}>
          <Text style={styles.typeBadgeText}>
            {t(`tvos.aiSearch.types.${item.content_type}`)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing[12] },
  loadingText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 26, marginTop: spacing[4] },
  emptyContainer: {
    marginHorizontal: spacing[8], marginTop: spacing[8],
    paddingVertical: spacing[12], alignItems: 'center', borderRadius: 20,
  },
  emptyTitle: { color: colors.white, fontSize: 32, fontWeight: '600', marginBottom: spacing[3] },
  emptySubtitle: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 24, textAlign: 'center' },
  gridContent: { paddingHorizontal: spacing[8], paddingBottom: spacing[12] },
  gridRow: { gap: spacing[4], marginBottom: spacing[4] },
  card: {
    flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden',
  },
  cardFocused: { borderColor: '#A855F7', transform: [{ scale: 1.05 }], backgroundColor: 'rgba(168, 85, 247, 0.12)' },
  thumbnail: { width: '100%', aspectRatio: 16 / 9, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  cardInfo: { padding: spacing[3] },
  cardTitle: { color: colors.white, fontSize: 22, fontWeight: '600', marginBottom: spacing[2] },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing[3], paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
