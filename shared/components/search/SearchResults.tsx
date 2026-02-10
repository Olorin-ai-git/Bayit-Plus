/**
 * SearchResults Component
 *
 * Responsive grid display of search results with Glass design.
 * Supports different layouts for mobile, tablet, and TV.
 */

import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { useTranslation } from 'react-i18next';
import { SearchResult } from '../../hooks/useSearch';
import SubtitleMatchCard from './SubtitleMatchCard';
import { NativeIcon } from '@olorin/shared-icons/native';
import {
  speakSearchResult,
  speakSearchResults,
  stopSearchTTS,
  isSearchTTSPlaying,
  pauseSearchTTS,
  resumeSearchTTS,
} from '../../utils/searchTTS';

interface SearchResultsProps {
  results: SearchResult[];
  loading?: boolean;
  onResultPress: (result: SearchResult, index: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  emptyMessage?: string;
  numColumns?: number;
  enableTTS?: boolean; // Enable TTS controls
}

export function SearchResults({
  results,
  loading = false,
  onResultPress,
  onLoadMore,
  hasMore = false,
  emptyMessage = 'No results found',
  numColumns = 2,
  enableTTS = true,
}: SearchResultsProps) {
  const { t, i18n } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleReadAll = () => {
    if (isSpeaking) {
      stopSearchTTS();
      setIsSpeaking(false);
    } else {
      speakSearchResults(results, i18n.language, 10);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), results.length * 5000);
    }
  };

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
        index={index}
        onPress={() => onResultPress(item, index)}
        onReadAloud={() => speakSearchResult(item, i18n.language, 'high')}
        enableTTS={enableTTS}
        t={t}
      />
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;

    if (loading) {
      return (
        <View className="py-8 items-center">
          <GlassLoadingSpinner size="large" />
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={onLoadMore}
        className="my-4 mx-auto px-6 py-3 bg-white/10 rounded-full"
        activeOpacity={0.7}
      >
        <Text className="text-white font-medium">{t('common.loadMore')}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <GlassLoadingSpinner size="large" />
          <Text className="text-white/60 mt-4">{t('search.searching')}</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center py-20">
        <View className="mb-4">
          <NativeIcon name="search" size="3xl" color="#9ca3af" />
        </View>
        <Text className="text-white text-lg">{emptyMessage || t('search.noResults')}</Text>
        <Text className="text-white/60 text-sm mt-2">{t('search.tryDifferentKeywords')}</Text>
      </View>
    );
  };

  const renderHeader = () => {
    if (!enableTTS || results.length === 0) return null;

    return (
      <View className="mb-4">
        <TouchableOpacity
          onPress={handleReadAll}
          className="flex-row items-center gap-2 px-4 py-3 bg-purple-500/20 border border-purple-400/50 rounded-xl"
          activeOpacity={0.7}
        >
          <NativeIcon name={isSpeaking ? 'pause' : 'volume2'} size="xl" color="#a855f7" />
          <Text className="text-white font-medium">
            {isSpeaking ? t('search.stopReading') : t('search.readAllResults')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={(item: any) => item.id}
      numColumns={numColumns}
      key={`grid-${numColumns}`}
      columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={hasMore && !loading ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
    />
  );
}

function ContentCard({
  result,
  index,
  onPress,
  onReadAloud,
  enableTTS = true,
  t,
}: {
  result: SearchResult;
  index: number;
  onPress: () => void;
  onReadAloud?: () => void;
  enableTTS?: boolean;
  t: any;
}) {
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
          <NativeIcon name="film" size="2xl" color="#a855f7" />
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
              <NativeIcon name="star" size="xs" color="#fbbf24" />
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
              <Text className="text-yellow-400 text-xs">{t('search.featured')}</Text>
            </View>
          )}
          {result.has_subtitles && (
            <View className="px-2 py-1 bg-purple-500/20 rounded">
              <Text className="text-purple-300 text-xs">{t('search.closedCaptions')}</Text>
            </View>
          )}
          {result.is_kids_content && (
            <View className="px-2 py-1 bg-pink-500/20 rounded">
              <Text className="text-pink-300 text-xs">{t('search.kids')}</Text>
            </View>
          )}
        </View>

        {/* Read Aloud Button */}
        {enableTTS && onReadAloud && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onReadAloud();
            }}
            className="mt-3 flex-row items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-400/50 rounded-lg"
            activeOpacity={0.7}
          >
            <NativeIcon name="volume2" size="md" color="#a855f7" />
            <Text className="text-purple-200 text-xs font-medium">{t('search.readAloud')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default SearchResults;
