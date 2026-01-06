import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { colors, spacing, fontSize } from '../../theme';

interface WatchPartyJoinModalProps {
  visible: boolean;
  onClose: () => void;
  onJoin: (roomCode: string) => Promise<void>;
}

export const WatchPartyJoinModal: React.FC<WatchPartyJoinModalProps> = ({
  visible,
  onClose,
  onJoin,
}) => {
  const { t } = useTranslation();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError(t('watchParty.errors.invalidCode'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onJoin(code);
      handleClose();
    } catch (err: any) {
      const errorKey = err.code || 'connectionError';
      setError(t(`watchParty.errors.${errorKey}`, t('watchParty.errors.joinFailed')));
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string) => {
    const value = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomCode(value.slice(0, 8));
    if (error) setError('');
  };

  const handleClose = () => {
    setRoomCode('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <GlassView style={styles.modal} intensity="high">
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>🔗</Text>
                </View>
                <Text style={styles.title}>{t('watchParty.joinTitle')}</Text>
                <Text style={styles.subtitle}>{t('watchParty.enterCode')}</Text>
              </View>

              <GlassInput
                value={roomCode}
                onChangeText={handleCodeChange}
                placeholder="ABCD1234"
                error={error}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                inputStyle={styles.codeInput}
                hasTVPreferredFocus
              />

              <View style={styles.actions}>
                <GlassButton
                  title={t('common.cancel')}
                  onPress={handleClose}
                  variant="ghost"
                  size="md"
                />
                <GlassButton
                  title={t('watchParty.join')}
                  onPress={handleJoin}
                  variant="primary"
                  size="md"
                  loading={loading}
                  disabled={roomCode.length < 4}
                />
              </View>
            </GlassView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: fontSize.xxl,
    letterSpacing: 4,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
});

export default WatchPartyJoinModal;
