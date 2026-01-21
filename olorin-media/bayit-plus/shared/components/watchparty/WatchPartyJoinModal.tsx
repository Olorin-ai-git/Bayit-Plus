import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';

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
        <View className="flex-1 bg-black/80 justify-center items-center p-6">
          <TouchableWithoutFeedback>
            <GlassView className="w-full max-w-[400px] p-8 gap-6" intensity="high">
              <View className="items-center gap-3">
                <View className="w-16 h-16 rounded-full bg-purple-500/20 items-center justify-center mb-3">
                  <Text className="text-[32px]">🔗</Text>
                </View>
                <Text className="text-2xl font-semibold text-white">{t('watchParty.joinTitle')}</Text>
                <Text className="text-sm text-white/70">{t('watchParty.enterCode')}</Text>
              </View>

              <GlassInput
                value={roomCode}
                onChangeText={handleCodeChange}
                placeholder="ABCD1234"
                error={error}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                inputStyle={{ textAlign: 'center', fontSize: 32, letterSpacing: 4, fontWeight: '700' }}
                hasTVPreferredFocus
              />

              <View className="flex-row gap-3 justify-end">
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

export default WatchPartyJoinModal;
