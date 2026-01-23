/**
 * Playlist Panel Component
 * Displays the current flow playlist with navigation
 */

import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { X, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlaylistItem } from '../types/watch.types';
import { colors } from '@bayit/shared/theme';

interface PlaylistPanelProps {
  playlist: PlaylistItem[];
  playlistIndex: number;
  isRTL: boolean;
  onClose: () => void;
  onSelectItem: (index: number) => void;
}

export function PlaylistPanel({
  playlist,
  playlistIndex,
  isRTL,
  onClose,
  onSelectItem,
}: PlaylistPanelProps) {
  const { t } = useTranslation();

  return (
    <View
      className="absolute top-[120px] w-[300px] max-h-[400px] bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 z-[100]"
      style={[
        // @ts-ignore
        { boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' },
        isRTL ? styles.panelRight : styles.panelLeft,
      ]}
    >
      <View className="flex-row justify-between items-center p-4 border-b border-white/10">
        <Text className="text-base font-semibold text-white">{t('watch.playlist') || 'Playlist'}</Text>
        <Pressable onPress={onClose}>
          <X size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView className="max-h-[320px]">
        {playlist.map((item, index) => (
          <Pressable
            key={`${item.content_id}-${index}`}
            className="flex-row items-center p-3 px-4 gap-3 border-b border-white/5"
            style={[index === playlistIndex && styles.itemActive]}
            onPress={() => onSelectItem(index)}
          >
            <Text className="w-6 text-xs text-gray-400 text-center">{index + 1}</Text>
            <View className="flex-1">
              <Text
                className="text-sm"
                style={[index === playlistIndex ? styles.textActive : styles.textInactive]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text className="text-[11px] text-gray-400 capitalize">{item.content_type}</Text>
            </View>
            {index === playlistIndex && (
              <View className="w-6 h-6 justify-center items-center">
                <Play size={14} color={colors.primary} fill={colors.primary} />
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panelLeft: {
    left: 16,
  },
  panelRight: {
    right: 16,
  },
  itemActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  textActive: {
    color: '#22c55e',
    fontWeight: '600',
  },
  textInactive: {
    color: '#ffffff',
  },
});
