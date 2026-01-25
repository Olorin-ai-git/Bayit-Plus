/**
 * SearchResultsCards Component
 *
 * Detailed card layout for search results
 * Large cards with backdrop, full metadata, and description
 */

import React, { useCallback, memo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SearchResultCard } from './SearchResultCard';
import type { SearchResult } from '../../../../shared/hooks/useSearch';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';

interface SearchResultsCardsProps {
  /** Search results to display */
  results: SearchResult[];
  /** Callback when result clicked */
  onResultClick?: (result: SearchResult, position: number) => void;
  /** Callback for pagination */
  onLoadMore?: () => void;
  /** Loading state for pagination */
  isLoadingMore?: boolean;
}

/**
 * Cards view for search results - detailed cards
 * Memoized for performance
 */
export const SearchResultsCards = memo(function SearchResultsCards({
  results,
  onResultClick,
  onLoadMore,
  isLoadingMore,
}: SearchResultsCardsProps) {
  const renderItem = useCallback(
    ({ item, index }: { item: SearchResult; index: number }) => (
      <SearchResultCard result={item} position={index} onPress={onResultClick} />
    ),
    [onResultClick]
  );

  const keyExtractor = useCallback((item: SearchResult) => item.id, []);

  const ListFooterComponent = useCallback(
    () =>
      isLoadingMore ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>Loading more results...</Text>
        </View>
      ) : null,
    [isLoadingMore]
  );

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.container}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      updateCellsBatchingPeriod={50}
      ListFooterComponent={ListFooterComponent}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  loader: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loaderText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
