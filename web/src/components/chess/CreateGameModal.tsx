/**
 * Modal for creating a new chess game.
 */
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { useTranslation } from 'react-i18next';
import { GlassModal } from '@bayit/shared/ui';
import { Users, Bot } from 'lucide-react';

type GameMode = 'pvp' | 'bot';
type BotDifficulty = 'easy' | 'medium' | 'hard';

interface CreateGameModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (
    color: 'white' | 'black',
    timeControl?: number,
    gameMode?: GameMode,
    botDifficulty?: BotDifficulty
  ) => Promise<void>;
}

export default function CreateGameModal({ visible, onClose, onCreate }: CreateGameModalProps) {
  const { t } = useTranslation();
  const [selectedColor, setSelectedColor] = useState<'white' | 'black'>('white');
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreate(
        selectedColor,
        undefined,
        gameMode,
        gameMode === 'bot' ? botDifficulty : undefined
      );
      onClose();
    } catch (err) {
      console.error('Failed to create game:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <GlassModal visible={visible} title={t('chess.createGame')} onClose={onClose} dismissable={true}>
      {/* Game Mode Selection */}
      <View className="mb-6">
        <Text className="text-sm font-semibold text-white mb-3">{t('chess.gameMode')}</Text>
        <View className="flex-row gap-4">
          <Pressable
            className={`flex-1 flex-row items-center justify-center gap-3 p-4 rounded-lg bg-white/5 border-2 ${
              gameMode === 'pvp' ? 'border-purple-500 bg-purple-500/10' : 'border-transparent'
            }`}
            onPress={() => setGameMode('pvp')}
          >
            <Users size={20} color={gameMode === 'pvp' ? colors.primary : colors.textSecondary} />
            <Text className={`text-sm ${
              gameMode === 'pvp' ? 'text-purple-500 font-semibold' : 'text-gray-400'
            }`}>
              {t('chess.playVsFriend')}
            </Text>
          </Pressable>

          <Pressable
            className={`flex-1 flex-row items-center justify-center gap-3 p-4 rounded-lg bg-white/5 border-2 ${
              gameMode === 'bot' ? 'border-purple-500 bg-purple-500/10' : 'border-transparent'
            }`}
            onPress={() => setGameMode('bot')}
          >
            <Bot size={20} color={gameMode === 'bot' ? colors.primary : colors.textSecondary} />
            <Text className={`text-sm ${
              gameMode === 'bot' ? 'text-purple-500 font-semibold' : 'text-gray-400'
            }`}>
              {t('chess.playVsBot')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Bot Difficulty Selection (only shown for bot mode) */}
      {gameMode === 'bot' && (
        <View className="mb-6">
          <Text className="text-sm font-semibold text-white mb-3">{t('chess.difficulty')}</Text>
          <View className="flex-row gap-2">
            <Pressable
              className={`flex-1 py-3 px-4 rounded-md bg-white/5 border-2 items-center ${
                botDifficulty === 'easy' ? 'border-purple-500 bg-purple-500/10' : 'border-transparent'
              }`}
              onPress={() => setBotDifficulty('easy')}
            >
              <Text className={`text-sm ${
                botDifficulty === 'easy' ? 'text-purple-500 font-semibold' : 'text-gray-400'
              }`}>
                {t('chess.easy')}
              </Text>
            </Pressable>

            <Pressable
              className={`flex-1 py-3 px-4 rounded-md bg-white/5 border-2 items-center ${
                botDifficulty === 'medium' ? 'border-purple-500 bg-purple-500/10' : 'border-transparent'
              }`}
              onPress={() => setBotDifficulty('medium')}
            >
              <Text className={`text-sm ${
                botDifficulty === 'medium' ? 'text-purple-500 font-semibold' : 'text-gray-400'
              }`}>
                {t('chess.medium')}
              </Text>
            </Pressable>

            <Pressable
              className={`flex-1 py-3 px-4 rounded-md bg-white/5 border-2 items-center ${
                botDifficulty === 'hard' ? 'border-purple-500 bg-purple-500/10' : 'border-transparent'
              }`}
              onPress={() => setBotDifficulty('hard')}
            >
              <Text className={`text-sm ${
                botDifficulty === 'hard' ? 'text-purple-500 font-semibold' : 'text-gray-400'
              }`}>
                {t('chess.hard')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Color selection */}
      <View className="mb-6">
        <Text className="text-sm font-semibold text-white mb-3">{t('chess.chooseColor')}</Text>
        <View className="flex-row gap-4">
          <Pressable
            className={`flex-1 flex-row items-center gap-3 p-4 rounded-lg bg-white/5 border-2 ${
              selectedColor === 'white' ? 'border-purple-500 bg-purple-500/10' : 'border-transparent'
            }`}
            onPress={() => setSelectedColor('white')}
          >
            <View className="w-6 h-6 rounded-full bg-white" />
            <Text className="text-sm text-white">{t('chess.white')}</Text>
          </Pressable>

          <Pressable
            className={`flex-1 flex-row items-center gap-3 p-4 rounded-lg bg-white/5 border-2 ${
              selectedColor === 'black' ? 'border-purple-500 bg-purple-500/10' : 'border-transparent'
            }`}
            onPress={() => setSelectedColor('black')}
          >
            <View className="w-6 h-6 rounded-full bg-black border-2 border-white" />
            <Text className="text-sm text-white">{t('chess.black')}</Text>
          </Pressable>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row gap-3">
        <Pressable className="flex-1 py-4 rounded-lg bg-white/10 items-center" onPress={onClose}>
          <Text className="text-sm font-semibold text-white">{t('common.cancel')}</Text>
        </Pressable>

        <Pressable
          className={`flex-1 py-4 rounded-lg bg-purple-500 items-center ${
            creating ? 'opacity-50' : ''
          }`}
          onPress={handleCreate}
          disabled={creating}
        >
          <Text className="text-sm font-semibold text-black">
            {creating ? t('common.creating') : t('chess.create')}
          </Text>
        </Pressable>
      </View>
    </GlassModal>
  );
}
