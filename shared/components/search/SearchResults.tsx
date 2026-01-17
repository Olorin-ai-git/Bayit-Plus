/**
 * SearchResults Component
 *
 * Responsive grid display of search results with Glass design.
 * Supports different layouts for mobile, tablet, and TV.
 */

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SearchResult } from '../../hooks/useSearch';
import SubtitleMatchCard from './SubtitleMatchCard';

interface SearchResultsProps {
  results: SearchResult[];
  loading?: boolean;
  onResultPress: (result: SearchResult, index: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  emptyMessage?: string;
  numColumns?: number;
}

export function SearchResults({
  results,
  loading = false,
  onResultPress,
  onLoadMore,
  hasMore = false,
  emptyMessage = 'No results found',
  numColumns = 2,
}: SearchResultsProps) {
  const renderItem = ({ item, index }: { item: SearchResult; index: number }) => {
    // Check if this is a subtitle search result
    if (item.subtitle_matches && item.subtitle_matches.length > 0) {
      return (
        <SubtitleMatchCard
          result={item}
          onPress={() => onResultPress(item, index)}
        />
      );
    }

    return (
      <ContentCard
        result={item}
        onPress={() => onResultPress(item, index)}
      />
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;

    if (loading) {
      return (
        <View className="py-8 items-center">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={onLoadMore}
        className="my-4 mx-auto px-6 py-3 bg-white/10 rounded-full"
        activeOpacity={0.7}
      >
        <Text className="text-white font-medium">Load More</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-white/60 mt-4">Searching...</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center py-20">
        <Text className="text-6xl mb-4">🔍</Text>
        <Text className="text-white text-lg">{emptyMessage}</Text>
        <Text className="text-white/60 text-sm mt-2">Try different keywords or filters</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      key={`grid-${numColumns}`}
      columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={hasMore && !loading ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
    />
  );
}

function ContentCard({ result, onPress }: { result: SearchResult; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
      activeOpacity={0.8}
      style={{ minWidth: 150 }}
    >
      {/* Thumbnail */}
      {result.thumbnail ? (
        <Image
          source={{ uri: result.thumbnail }}
          className="w-full aspect-video bg-white/5"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full aspect-video bg-white/5 items-center justify-center">
          <Text className="text-4xl">🎬</Text>
        </View>
      )}

      {/* Content Info */}
      <View className="p-3">
        {/* Title */}
        <Text className="text-white font-semibold text-base mb-1" numberOfLines={2}>
          {result.title}
        </Text>

        {/* Metadata Row */}
        <View className="flex-row items-center gap-2 flex-wrap">
          {result.year && (
            <Text className="text-white/60 text-xs">{result.year}</Text>
          )}
          {result.rating && (
            <View className="flex-row items-center gap-1">
              <Text className="text-yellow-400 text-xs">⭐</Text>
              <Text className="text-white/60 text-xs">{result.rating}</Text>
            </View>
          )}
          {result.duration && (
            <Text className="text-white/60 text-xs">{result.duration}</Text>
          )}
        </View>

        {/* Genres */}
        {result.genres && result.genres.length > 0 && (
          <View className="flex-row gap-1 mt-2">
            {result.genres.slice(0, 2).map((genre, idx) => (
              <View key={idx} className="px-2 py-1 bg-white/10 rounded">
                <Text className="text-white/80 text-xs">{genre}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Badges */}
        <View className="flex-row gap-2 mt-2">
          {result.is_featured && (
            <View className="px-2 py-1 bg-yellow-500/20 rounded">
              <Text className="text-yellow-400 text-xs">⭐ Featured</Text>
            </View>
          )}
          {result.has_subtitles && (
            <View className="px-2 py-1 bg-purple-500/20 rounded">
              <Text className="text-purple-300 text-xs">CC</Text>
            </View>
          )}
          {result.is_kids_content && (
            <View className="px-2 py-1 bg-pink-500/20 rounded">
              <Text className="text-pink-300 text-xs">👶 Kids</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default SearchResults;
