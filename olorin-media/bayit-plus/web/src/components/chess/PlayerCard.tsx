/**
 * Player card component showing player info and status.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';
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
    <View
      className="bg-black/30 backdrop-blur-xl rounded-xl p-4 my-2 border-2 shadow-md"
      style={[
        isCurrentTurn ? styles.cardActive : styles.cardInactive,
        !player.is_connected && styles.disconnected
      ]}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className="w-10 h-10 rounded-full justify-center items-center"
            style={[player.color === 'white' ? styles.colorWhite : styles.colorBlack]}
          >
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
            <Text
              className="text-base font-semibold tabular-nums"
              style={[isCurrentTurn ? styles.timeActive : styles.timeInactive]}
            >
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

const styles = StyleSheet.create({
  cardActive: {
    borderColor: '#a855f7',
    shadowColor: 'rgba(168, 85, 247, 0.4)',
  },
  cardInactive: {
    borderColor: 'transparent',
  },
  disconnected: {
    opacity: 0.6,
  },
  colorWhite: {
    backgroundColor: '#ffffff',
  },
  colorBlack: {
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  timeActive: {
    color: '#eab308',
  },
  timeInactive: {
    color: '#ffffff',
  },
});
