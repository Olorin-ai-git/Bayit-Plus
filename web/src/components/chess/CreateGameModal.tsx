/**
 * Modal for creating a new chess game.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { useTranslation } from 'react-i18next';
import { GlassModal } from '@bayit/shared/ui';

interface CreateGameModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (color: 'white' | 'black', timeControl?: number) => Promise<void>;
}

export default function CreateGameModal({ visible, onClose, onCreate }: CreateGameModalProps) {
  const { t } = useTranslation();
  const [selectedColor, setSelectedColor] = useState<'white' | 'black'>('white');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreate(selectedColor);
      onClose();
    } catch (err) {
      console.error('Failed to create game:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <GlassModal visible={visible} title={t('chess.createGame')} onClose={onClose} dismissable={true}>
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
