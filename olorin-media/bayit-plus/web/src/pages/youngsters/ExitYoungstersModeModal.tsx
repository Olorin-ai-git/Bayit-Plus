/**
 * ExitYoungstersModeModal - PIN verification modal for exiting youngsters mode
 */

import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { z } from 'zod';
import { GlassModal } from '@bayit/shared/ui';
import { platformClass } from '@/utils/platformClass';

const ExitYoungstersModeModalPropsSchema = z.object({
  isOpen: z.boolean(),
  onClose: z.function().args().returns(z.void()),
  onVerify: z.function().args(z.string()).returns(z.promise(z.void())),
});

type ExitYoungstersModeModalProps = z.infer<typeof ExitYoungstersModeModalPropsSchema>;

/**
 * Modal for verifying PIN to exit youngsters mode
 * Provides secure exit mechanism with parent verification
 */
export default function ExitYoungstersModeModal({
  isOpen,
  onClose,
  onVerify,
}: ExitYoungstersModeModalProps) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (pin.length < 4) return;

    setIsLoading(true);
    setError('');

    try {
      await onVerify(pin);
      onClose();
      setPin('');
    } catch (err: any) {
      setError(err.message || t('youngsters.wrongCode'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassModal
      visible={isOpen}
      title={t('youngsters.exitYoungstersMode')}
      onClose={onClose}
      dismissable={true}
    >
      <View className={platformClass(
        'w-16 h-16 rounded-full bg-purple-500/20 justify-center items-center self-center mb-4'
      )}>
        <Lock size={32} color="#a855f7" />
      </View>

      <Text className={platformClass('text-sm text-gray-400 text-center mb-6')}>
        {t('youngsters.exitDescription')}
      </Text>

      <TextInput
        value={pin}
        onChangeText={(text) => setPin(text.replace(/\D/g, ''))}
        maxLength={6}
        keyboardType="numeric"
        secureTextEntry
        autoFocus
        className={platformClass(
          'bg-white/5 border border-white/10 rounded-lg p-4 text-2xl text-white text-center mb-4',
          'bg-white/5 border border-white/10 rounded-lg p-4 text-2xl text-white text-center mb-4'
        )}
        style={{ letterSpacing: 8 }}
      />

      {error && (
        <Text className={platformClass('text-sm text-red-500 text-center mb-4')}>
          {error}
        </Text>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={pin.length < 4 || isLoading}
        className={platformClass(
          pin.length < 4 || isLoading
            ? 'bg-purple-500/50 py-4 rounded-lg items-center'
            : 'bg-purple-500 py-4 rounded-lg items-center',
          pin.length < 4 || isLoading
            ? 'bg-purple-500/50 py-4 rounded-lg items-center'
            : 'bg-purple-500 py-4 rounded-lg items-center'
        )}
      >
        {isLoading ? (
          <ActivityIndicator color="#581c87" />
        ) : (
          <Text className={platformClass('text-base font-bold text-purple-900')}>
            {t('youngsters.confirm')}
          </Text>
        )}
      </Pressable>
    </GlassModal>
  );
}
