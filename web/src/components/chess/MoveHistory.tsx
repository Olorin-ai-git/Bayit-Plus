/**
 * Move history component displaying chess moves in Standard Algebraic Notation (SAN).
 */
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { useTranslation } from 'react-i18next';

interface Move {
  san: string;
  player: 'white' | 'black';
}

interface MoveHistoryProps {
  moves: Move[];
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  const { t } = useTranslation();
  // Group moves into pairs (white, black)
  const movePairs: Array<{ moveNumber: number; white?: Move; black?: Move }> = [];

  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <View className="bg-black/30 backdrop-blur-xl rounded-2xl p-4 mb-4 flex-1 max-h-[300px] shadow-lg">
      <Text className="text-base font-semibold text-white mb-3 pb-3 border-b border-white/10">
        {t('chess.moveHistory')}
      </Text>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 8 }}>
        {movePairs.map((pair, idx) => (
          <View key={idx} className="flex-row items-center py-1.5 gap-3">
            <Text className="text-sm font-semibold text-gray-400 w-[30px]">{pair.moveNumber}.</Text>
            <Text className="text-sm font-medium text-white tabular-nums flex-1">{pair.white?.san || ''}</Text>
            <Text className="text-sm font-medium text-gray-400 tabular-nums flex-1">{pair.black?.san || '...'}</Text>
          </View>
        ))}

        {moves.length === 0 && (
          <Text className="text-sm text-gray-400 text-center py-6 italic">{t('chess.noMoves')}</Text>
        )}
      </ScrollView>
    </View>
  );
}
