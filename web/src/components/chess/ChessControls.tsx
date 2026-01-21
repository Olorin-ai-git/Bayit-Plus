/**
 * Chess game controls component (resign, offer draw, new game).
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { Flag, RotateCcw, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCheckbox } from '@bayit/shared/ui';

interface ChessControlsProps {
  game: any;
  onResign: () => void;
  onOfferDraw: () => void;
  onNewGame?: () => void;
  showHints?: boolean;
  onToggleHints?: (show: boolean) => void;
}

export default function ChessControls({
  game,
  onResign,
  onOfferDraw,
  onNewGame,
  showHints = false,
  onToggleHints
}: ChessControlsProps) {
  const { t } = useTranslation();
  const isGameActive = game?.status === 'active';

  return (
    <View className="mt-4">
      {/* Hints Toggle */}
      <View className="bg-black/30 backdrop-blur-xl rounded-xl p-4 mb-2 shadow-lg">
        <GlassCheckbox
          label={t('chess.showHints')}
          checked={showHints}
          onChange={onToggleHints}
        />
      </View>

      {/* Game Controls */}
      <View className="flex-row gap-3">
        <Pressable
          className={`flex-1 flex-row items-center justify-center gap-2 py-3 px-4 rounded-lg bg-red-500/20 ${
            !isGameActive ? 'opacity-50' : ''
          }`}
          onPress={onResign}
          disabled={!isGameActive}
        >
          <Flag size={16} color={colors.error} />
          <Text className="text-sm font-semibold text-red-500">{t('chess.resign')}</Text>
        </Pressable>

        <Pressable
          className={`flex-1 flex-row items-center justify-center gap-2 py-3 px-4 rounded-lg bg-yellow-500/20 ${
            !isGameActive ? 'opacity-50' : ''
          }`}
          onPress={onOfferDraw}
          disabled={!isGameActive}
        >
          <Text className="text-base mr-2">🤝</Text>
          <Text className="text-sm font-semibold text-yellow-500">{t('chess.offerDraw')}</Text>
        </Pressable>

        {onNewGame && (
          <Pressable
            className="flex-1 flex-row items-center justify-center gap-2 py-3 px-4 rounded-lg bg-green-500/20"
            onPress={onNewGame}
          >
            <RotateCcw size={16} color={colors.success} />
            <Text className="text-sm font-semibold text-green-500">{t('chess.newGame')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
