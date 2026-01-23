/**
 * Modal for joining an existing chess game by code.
 */
import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { useTranslation } from 'react-i18next';
import { GlassInput, GlassModal } from '@bayit/shared/ui';

interface JoinGameModalProps {
  visible: boolean;
  onClose: () => void;
  onJoin: (gameCode: string) => Promise<void>;
}

export default function JoinGameModal({ visible, onClose, onJoin }: JoinGameModalProps) {
  const { t } = useTranslation();
  const [gameCode, setGameCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    const trimmed = gameCode.trim().toUpperCase();

    if (trimmed.length !== 6) {
      setError(t('chess.invalidGameCode'));
      return;
    }

    setJoining(true);
    setError('');

    try {
      await onJoin(trimmed);
      setGameCode('');
      onClose();
    } catch (err: any) {
      setError(err.message || t('chess.joinFailed'));
    } finally {
      setJoining(false);
    }
  };

  const handleCodeChange = (text: string) => {
    // Only allow alphanumeric, auto-uppercase
    const cleaned = text.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
    setGameCode(cleaned);
    setError('');
  };

  const handleClose = () => {
    setGameCode('');
    setError('');
    onClose();
  };

  return (
    <GlassModal visible={visible} title={t('chess.joinGame')} onClose={handleClose} dismissable={true}>
      {/* Game code input */}
      <View className="mb-6">
        <Text className="text-sm font-semibold text-white mb-3">{t('chess.enterGameCode')}</Text>
        <GlassInput
          value={gameCode}
          onChangeText={handleCodeChange}
          placeholder="ABC123"
          inputStyle={{ fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: 4 }}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          error={error}
        />
      </View>

      {/* Actions */}
      <View className="flex-row gap-3">
        <Pressable className="flex-1 py-4 rounded-lg bg-white/10 items-center" onPress={handleClose}>
          <Text className="text-sm font-semibold text-white">{t('common.cancel')}</Text>
        </Pressable>

        <Pressable
          className="flex-1 py-4 rounded-lg bg-purple-500 items-center"
          style={[(joining || gameCode.length !== 6) && styles.disabled]}
          onPress={handleJoin}
          disabled={joining || gameCode.length !== 6}
        >
          <Text className="text-sm font-semibold text-black">
            {joining ? t('common.joining') : t('chess.join')}
          </Text>
        </Pressable>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
