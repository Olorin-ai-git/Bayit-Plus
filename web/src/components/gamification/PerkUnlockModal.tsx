import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/shared/components/ui/GlassButton';
import type { UnlockedPerk } from '@/stores/gamificationStore.types';

interface PerkUnlockModalProps {
  perk: UnlockedPerk | null;
  onClaim: (perkId: string) => void;
  visible: boolean;
  onClose: () => void;
}

export function PerkUnlockModal({
  perk,
  onClaim,
  visible,
  onClose,
}: PerkUnlockModalProps) {
  const { t } = useTranslation();

  if (!perk) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.content}>
            <Text style={styles.icon}>
              {perk.perk_type === 'outfit' ? '👕' : '🎁'}
            </Text>
            <Text style={styles.title}>
              {t(`gamification.perks.${perk.perk_id}`, { defaultValue: perk.perk_id })}
            </Text>
            <Text style={styles.subtitle}>
              {t('gamification.unlockedAtLevel', { level: perk.level_unlocked })}
            </Text>
            <Text style={styles.description}>
              {t(`gamification.perkDescriptions.${perk.perk_id}`, {
                defaultValue: t('gamification.perkUnlocked'),
              })}
            </Text>

            <View style={styles.buttonContainer}>
              <GlassButton
                title={t('gamification.claim')}
                onPress={() => onClaim(perk.perk_id)}
                variant="primary"
                size="md"
              />
              <GlassButton
                title={t('common.close')}
                onPress={onClose}
                variant="secondary"
                size="md"
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '90%',
    backdropFilter: 'blur(10px)',
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#E5C07B',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
});

export default PerkUnlockModal;
