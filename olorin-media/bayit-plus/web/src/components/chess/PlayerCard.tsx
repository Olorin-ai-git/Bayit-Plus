/**
 * Player card component showing player info and status.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { User, Crown } from 'lucide-react';

interface PlayerCardProps {
  player?: {
    user_name: string;
    color: 'white' | 'black';
    is_connected: boolean;
    time_remaining_ms?: number;
  };
  isCurrentTurn: boolean;
  isHost?: boolean;
}

export default function PlayerCard({ player, isCurrentTurn, isHost = false }: PlayerCardProps) {
  if (!player) {
    return (
      <View className="bg-black/30 backdrop-blur-xl rounded-xl p-4 my-2 border-2 border-transparent items-center justify-center py-6 shadow-md">
        <Text className="text-gray-400 text-sm italic">Waiting for opponent...</Text>
      </View>
    );
  }

  const formatTime = (ms?: number) => {
    if (!ms) return null;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View className={`bg-black/30 backdrop-blur-xl rounded-xl p-4 my-2 border-2 shadow-md ${
      isCurrentTurn ? 'border-purple-500 shadow-purple-500/40' : 'border-transparent'
    } ${!player.is_connected ? 'opacity-60' : ''}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View className={`w-10 h-10 rounded-full justify-center items-center ${
            player.color === 'white' ? 'bg-white' : 'bg-black border-2 border-white'
          }`}>
            <User size={20} color={player.color === 'white' ? colors.dark : colors.text} />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-white text-base font-semibold">{player.user_name}</Text>
              {isHost && <Crown size={14} color={colors.warning} />}
            </View>
            <Text className="text-gray-400 text-xs mt-0.5">{player.color.toUpperCase()}</Text>
          </View>
        </View>

        {player.time_remaining_ms !== undefined && (
          <View className="bg-black/30 px-3 py-1.5 rounded-lg">
            <Text className={`text-base font-semibold tabular-nums ${
              isCurrentTurn ? 'text-yellow-500' : 'text-white'
            }`}>
              {formatTime(player.time_remaining_ms)}
            </Text>
          </View>
        )}
      </View>

      {!player.is_connected && (
        <Text className="text-red-500 text-xs mt-2 italic">Disconnected</Text>
      )}

      {isCurrentTurn && (
        <View className="flex-row items-center gap-2 mt-3">
          <View className="w-2 h-2 rounded-full bg-green-500" />
          <Text className="text-green-500 text-xs font-medium">Their turn</Text>
        </View>
      )}
    </View>
  );
}
