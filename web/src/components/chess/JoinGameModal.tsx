/**
 * Modal for joining an existing chess game by code.
 */
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
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
      <View style={styles.section}>
        <Text style={styles.label}>{t('chess.enterGameCode')}</Text>
        <GlassInput
          value={gameCode}
          onChangeText={handleCodeChange}
          placeholder="ABC123"
          inputStyle={styles.input}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          error={error}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.cancelButton]} onPress={handleClose}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.joinButton,
            (joining || gameCode.length !== 6) && styles.buttonDisabled
          ]}
          onPress={handleJoin}
          disabled={joining || gameCode.length !== 6}
        >
          <Text style={styles.joinText}>
            {joining ? t('common.joining') : t('chess.join')}
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
  input: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
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
  joinButton: {
    backgroundColor: colors.primary,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  joinText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
});
