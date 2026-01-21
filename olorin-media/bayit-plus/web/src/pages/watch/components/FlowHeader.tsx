/**
 * Flow Header Component
 * Displays flow information and navigation controls
 */

import { View, Text, Pressable } from 'react-native';
import { ListMusic, SkipBack, SkipForward, X } from 'lucide-react';
import { colors } from '@bayit/shared/theme';

interface FlowHeaderProps {
  flowName: string;
  playlistIndex: number;
  playlistLength: number;
  hasPrevItem: boolean;
  hasNextItem: boolean;
  isRTL: boolean;
  onTogglePlaylist: () => void;
  onPlayPrev: () => void;
  onPlayNext: () => void;
  onExit: () => void;
}

export function FlowHeader({
  flowName,
  playlistIndex,
  playlistLength,
  hasPrevItem,
  hasNextItem,
  isRTL,
  onTogglePlaylist,
  onPlayPrev,
  onPlayNext,
  onExit,
}: FlowHeaderProps) {
  return (
    <View className={`flex-row justify-between items-center px-4 py-3 mb-3 max-w-[1400px] mx-auto w-full bg-white/10 backdrop-blur-xl rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
      <View className={`flex-row items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Pressable onPress={onTogglePlaylist} className="w-10 h-10 justify-center items-center bg-green-500/10 rounded-lg">
          <ListMusic size={20} color={colors.primary} />
        </Pressable>
        <View>
          <Text className="text-base font-semibold text-white">{flowName}</Text>
          <Text className="text-xs text-gray-400">
            {playlistIndex + 1} / {playlistLength}
          </Text>
        </View>
      </View>
      <View className={`flex-row items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Pressable
          onPress={onPlayPrev}
          className={`w-9 h-9 justify-center items-center bg-white/10 backdrop-blur-xl rounded-lg ${!hasPrevItem ? 'opacity-50' : ''}`}
          disabled={!hasPrevItem}
        >
          <SkipBack size={20} color={hasPrevItem ? colors.text : colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={onPlayNext}
          className={`w-9 h-9 justify-center items-center bg-white/10 backdrop-blur-xl rounded-lg ${!hasNextItem ? 'opacity-50' : ''}`}
          disabled={!hasNextItem}
        >
          <SkipForward size={20} color={hasNextItem ? colors.text : colors.textMuted} />
        </Pressable>
        <Pressable onPress={onExit} className="w-9 h-9 justify-center items-center ml-3">
          <X size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}
