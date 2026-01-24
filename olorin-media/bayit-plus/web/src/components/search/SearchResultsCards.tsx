/**
 * SearchResultsCards Component
 *
 * Detailed card layout for search results
 * Large cards with backdrop, full metadata, and description
 */

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SearchResultCard } from './SearchResultCard';
import type { SearchResult } from '../../../../shared/hooks/useSearch';
import { colors, borderRadius, spacing } from '../../theme/colors';

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
 */
export function SearchResultsCards({
  results,
  onResultClick,
  onLoadMore,
  isLoadingMore,
}: SearchResultsCardsProps) {
  const renderItem = ({ item, index }: { item: SearchResult; index: number }) => (
    <SearchResultCard result={item} position={index} onPress={onResultClick} />
  );

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.loader}>
            <Text style={styles.loaderText}>Loading...</Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loader: {
    padding: 20,
    alignItems: 'center',
  },
  loaderText: {
    color: 'rgba(255,255,255,0.6)',
  },
});
