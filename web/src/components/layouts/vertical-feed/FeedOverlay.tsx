/**
 * FeedOverlay Component
 * Content info overlay with title, description, meta, and action buttons
 */

import { View, Text, Pressable } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { FeedItem } from './schemas';

interface FeedOverlayProps {
  item: FeedItem;
}

export function FeedOverlay({ item }: FeedOverlayProps) {
  const navigate = useNavigate();

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View className="absolute left-0 right-0 bottom-0 p-6 pb-24 bg-gradient-to-t from-black/80 to-transparent">
      <View className="mb-6">
        <Text className="text-2xl font-bold text-white text-right mb-2">
          {item.title}
        </Text>
        {item.description && (
          <Text className="text-sm text-gray-400 text-right mb-2" numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View className="flex-row justify-end gap-4">
          {item.category && (
            <Text className="text-xs text-purple-500 px-2 py-1 bg-purple-700/30 rounded">
              {item.category}
            </Text>
          )}
          {item.duration && (
            <Text className="text-xs text-gray-500 font-mono">
              {formatDuration(item.duration)}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-col absolute right-4 bottom-24 gap-6">
        <Pressable
          className="items-center gap-1 p-2 rounded-lg hover:bg-white/10"
          onPress={() => item.id && navigate(`/watch/${item.id}`)}
        >
          <Text className="text-2xl">▶️</Text>
          <Text className="text-xs text-white">צפה</Text>
        </Pressable>
        <Pressable className="items-center gap-1 p-2 rounded-lg hover:bg-white/10">
          <Text className="text-2xl">➕</Text>
          <Text className="text-xs text-white">שמור</Text>
        </Pressable>
        <Pressable className="items-center gap-1 p-2 rounded-lg hover:bg-white/10">
          <Text className="text-2xl">↗️</Text>
          <Text className="text-xs text-white">שתף</Text>
        </Pressable>
      </View>
    </View>
  );
}
