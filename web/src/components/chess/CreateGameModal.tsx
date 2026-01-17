/**
 * Modal for creating a new chess game.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
      <View style={styles.section}>
        <Text style={styles.label}>{t('chess.gameMode')}</Text>
        <View style={styles.modeOptions}>
          <Pressable
            style={[styles.modeButton, gameMode === 'pvp' && styles.modeButtonSelected]}
            onPress={() => setGameMode('pvp')}
          >
            <Users size={20} color={gameMode === 'pvp' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.modeText, gameMode === 'pvp' && styles.modeTextSelected]}>
              {t('chess.playVsFriend')}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.modeButton, gameMode === 'bot' && styles.modeButtonSelected]}
            onPress={() => setGameMode('bot')}
          >
            <Bot size={20} color={gameMode === 'bot' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.modeText, gameMode === 'bot' && styles.modeTextSelected]}>
              {t('chess.playVsBot')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Bot Difficulty Selection (only shown for bot mode) */}
      {gameMode === 'bot' && (
        <View style={styles.section}>
          <Text style={styles.label}>{t('chess.difficulty')}</Text>
          <View style={styles.difficultyOptions}>
            <Pressable
              style={[styles.difficultyButton, botDifficulty === 'easy' && styles.difficultyButtonSelected]}
              onPress={() => setBotDifficulty('easy')}
            >
              <Text style={[styles.difficultyText, botDifficulty === 'easy' && styles.difficultyTextSelected]}>
                {t('chess.easy')}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.difficultyButton, botDifficulty === 'medium' && styles.difficultyButtonSelected]}
              onPress={() => setBotDifficulty('medium')}
            >
              <Text style={[styles.difficultyText, botDifficulty === 'medium' && styles.difficultyTextSelected]}>
                {t('chess.medium')}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.difficultyButton, botDifficulty === 'hard' && styles.difficultyButtonSelected]}
              onPress={() => setBotDifficulty('hard')}
            >
              <Text style={[styles.difficultyText, botDifficulty === 'hard' && styles.difficultyTextSelected]}>
                {t('chess.hard')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Color selection */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('chess.chooseColor')}</Text>
        <View style={styles.colorOptions}>
          <Pressable
            style={[styles.colorButton, selectedColor === 'white' && styles.colorButtonSelected]}
            onPress={() => setSelectedColor('white')}
          >
            <View style={[styles.colorCircle, styles.whiteCircle]} />
            <Text style={styles.colorText}>{t('chess.white')}</Text>
          </Pressable>

          <Pressable
            style={[styles.colorButton, selectedColor === 'black' && styles.colorButtonSelected]}
            onPress={() => setSelectedColor('black')}
          >
            <View style={[styles.colorCircle, styles.blackCircle]} />
            <Text style={styles.colorText}>{t('chess.black')}</Text>
          </Pressable>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.createButton, creating && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={creating}
        >
          <Text style={styles.createText}>
            {creating ? t('common.creating') : t('chess.create')}
          </Text>
        </Pressable>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modeOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  modeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modeTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  difficultyOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  difficultyButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  difficultyText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  difficultyTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  colorOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  whiteCircle: {
    backgroundColor: colors.text,
  },
  blackCircle: {
    backgroundColor: colors.dark,
    borderWidth: 2,
    borderColor: colors.text,
  },
  colorText: {
    fontSize: 14,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  createButton: {
    backgroundColor: colors.primary,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  createText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
});
