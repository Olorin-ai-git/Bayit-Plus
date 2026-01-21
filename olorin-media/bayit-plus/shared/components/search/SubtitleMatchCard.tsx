/**
 * SubtitleMatchCard Component
 *
 * Displays search results with subtitle matches, showing dialogue snippets
 * and timestamps for subtitle-based search results.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SearchResult } from '../../hooks/useSearch';

interface SubtitleMatchCardProps {
  result: SearchResult;
  onPress: () => void;
  maxMatches?: number;
}

export function SubtitleMatchCard({
  result,
  onPress,
  maxMatches = 3
}: SubtitleMatchCardProps) {
  const matches = result.subtitle_matches?.slice(0, maxMatches) || [];

  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Strip HTML <mark> tags and extract highlighted text
  const renderHighlightedText = (html: string) => {
    // Simple HTML parser for <mark> tags
    const parts = html.split(/<\/?mark>/);
    return (
      <Text className="text-white/80 text-sm leading-relaxed">
        {parts.map((part, idx) => {
          // Odd indices are inside <mark> tags
          const isHighlighted = idx % 2 === 1;
          return (
            <Text
              key={idx}
              className={isHighlighted ? 'bg-yellow-400/30 text-yellow-200 font-medium' : ''}
            >
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-black/20 backdrop-blur-xl rounded-2xl border border-purple-500/30 overflow-hidden mb-3"
      activeOpacity={0.8}
    >
      <View className="flex-row">
        {/* Thumbnail */}
        {result.thumbnail ? (
          <Image
            source={{ uri: result.thumbnail }}
            className="w-32 h-32 bg-white/5"
            resizeMode="cover"
          />
        ) : (
          <View className="w-32 h-32 bg-white/5 items-center justify-center">
            <Text className="text-4xl">🎬</Text>
          </View>
        )}

        {/* Content Info */}
        <View className="flex-1 p-4">
          {/* Title */}
          <Text className="text-white font-bold text-base mb-1" numberOfLines={1}>
            {result.title}
          </Text>

          {/* Subtitle Match Badge */}
          <View className="flex-row items-center gap-2 mb-2">
            <View className="px-2 py-1 bg-purple-500/20 rounded">
              <Text className="text-purple-300 text-xs font-medium">
                📝 {matches.length} subtitle match{matches.length > 1 ? 'es' : ''}
              </Text>
            </View>
            {result.year && (
              <Text className="text-white/60 text-xs">{result.year}</Text>
            )}
          </View>

          {/* First Subtitle Match Preview */}
          {matches.length > 0 && (
            <View className="mt-1">
              <Text className="text-purple-400 text-xs font-medium mb-1">
                {formatTimestamp(matches[0].timestamp)}
              </Text>
              {renderHighlightedText(matches[0].highlighted_text)}
            </View>
          )}
        </View>
      </View>

      {/* Additional Matches */}
      {matches.length > 1 && (
        <View className="px-4 pb-3 border-t border-white/5">
          {matches.slice(1).map((match, idx) => (
            <View key={idx} className="mt-2">
              <Text className="text-purple-400 text-xs font-medium mb-1">
                {formatTimestamp(match.timestamp)}
              </Text>
              {renderHighlightedText(match.highlighted_text)}
            </View>
          ))}
        </View>
      )}

      {/* Play Button */}
      <View className="px-4 pb-3">
        <View className="flex-row items-center gap-2 pt-2 border-t border-white/5">
          <View className="flex-1">
            <Text className="text-white/60 text-xs">
              Play from first match at {formatTimestamp(matches[0]?.timestamp || 0)}
            </Text>
          </View>
          <View className="w-10 h-10 bg-purple-500/30 rounded-full items-center justify-center">
            <Text className="text-purple-300 text-xl">▶</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default SubtitleMatchCard;
