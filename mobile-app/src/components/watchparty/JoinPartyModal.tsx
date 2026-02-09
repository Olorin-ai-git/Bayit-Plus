/**
 * JoinPartyModal - Modal for joining an existing Watch Party by room code.
 *
 * Provides a room-code input (auto-uppercased, alphanumeric only),
 * validates minimum length, and calls watchPartyStore.joinByCode.
 * Displays inline errors for invalid or expired codes.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWatchPartyStore } from '@bayit/shared-stores/watchPartyStore';
import { GlassButton, GlassInput, GlassModal, GlassErrorBanner, spacing } from '@olorin/glass-ui/native';
import { logger } from '../../utils/logger';
import Colors from '../../theme/colors';

const log = logger.scope('JoinPartyModal');
const MIN_CODE_LEN = 4;
const MAX_CODE_LEN = 8;
const CODE_FILTER = /[^A-Z0-9]/g;

interface JoinPartyModalProps {
  visible: boolean;
  onClose: () => void;
  onPartyJoined: (partyId: string) => void;
}

export const JoinPartyModal: React.FC<JoinPartyModalProps> = ({
  visible, onClose, onPartyJoined,
}) => {
  const { t } = useTranslation();
  const joinByCode = useWatchPartyStore((s) => s.joinByCode);

  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = useCallback((v: string) => {
    setRoomCode(v.toUpperCase().replace(CODE_FILTER, '').slice(0, MAX_CODE_LEN));
    if (error) setError(null);
  }, [error]);

  const resetForm = useCallback(() => { setRoomCode(''); setError(null); }, []);

  const handleClose = useCallback(() => {
    if (!isJoining) { resetForm(); onClose(); }
  }, [isJoining, resetForm, onClose]);

  const handleJoin = useCallback(async () => {
    const code = roomCode.trim();
    if (code.length < MIN_CODE_LEN) { setError(t('watchParty.errors.invalidCode')); return; }
    setIsJoining(true); setError(null);
    try {
      const party = await joinByCode(code);
      log.info('Joined watch party by code', { partyId: party.id, roomCode: code });
      resetForm(); onClose(); onPartyJoined(party.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('watchParty.errors.joinFailed');
      setError(msg); log.error('Failed to join party', err);
    } finally { setIsJoining(false); }
  }, [roomCode, joinByCode, onClose, onPartyJoined, t, resetForm]);

  const canJoin = roomCode.length >= MIN_CODE_LEN && !isJoining;

  return (
    <GlassModal visible={visible} onClose={handleClose} title={t('watchParty.joinParty')}>
      <View style={styles.container}>
        {error && <GlassErrorBanner message={error} onDismiss={() => setError(null)} />}
        <Text style={styles.description}>{t('watchParty.enterCode')}</Text>
        <GlassInput
          placeholder={t('watchParty.codePlaceholder')} value={roomCode}
          onChangeText={handleCodeChange} onSubmitEditing={handleJoin}
          autoCapitalize="characters" maxLength={MAX_CODE_LEN}
          editable={!isJoining} returnKeyType="join"
          accessibilityLabel={t('watchParty.roomCodeLabel')}
          accessibilityHint={t('watchParty.roomCodeHint')}
        />
        <Text style={styles.charCount}>{roomCode.length}/{MAX_CODE_LEN}</Text>
        <View style={styles.actions}>
          <GlassButton variant="secondary" onPress={handleClose}
            disabled={isJoining} style={styles.actionBtn}>{t('common.cancel')}</GlassButton>
          <GlassButton variant="primary" onPress={handleJoin}
            disabled={!canJoin} style={styles.actionBtn}>
            {isJoining
              ? <ActivityIndicator size="small" color={Colors.Text.primary} />
              : t('watchParty.join')}
          </GlassButton>
        </View>
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  description: { fontSize: 15, color: Colors.Text.secondary },
  charCount: { fontSize: 12, color: Colors.Text.muted, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
});

export default JoinPartyModal;
