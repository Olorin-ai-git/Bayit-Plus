import { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassModal, GlassInput, GlassButton } from '@bayit/shared/ui';
import { platformClass } from '@/utils/platformClass';

/**
 * Zod schema for PinModal props
 */
const PinModalPropsSchema = z.object({
  isOpen: z.boolean(),
  onClose: z.function().args().returns(z.void()),
  onSubmit: z.function().args(z.string()).returns(z.void()),
  error: z.string(),
  isLoading: z.boolean(),
});

type PinModalProps = z.infer<typeof PinModalPropsSchema>;

/**
 * PinModal - Modal for entering profile PIN
 *
 * @component
 * @example
 * <PinModal
 *   isOpen={true}
 *   onClose={handleClose}
 *   onSubmit={handleSubmit}
 *   error=""
 *   isLoading={false}
 * />
 */
export function PinModal(props: PinModalProps) {
  const validatedProps = PinModalPropsSchema.parse(props);
  const { isOpen, onClose, onSubmit, error, isLoading } = validatedProps;
  const { t } = useTranslation();
  const [pin, setPin] = useState('');

  // Reset PIN when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  const handlePinChange = (text: string) => {
    // Only allow numeric input
    setPin(text.replace(/\D/g, ''));
  };

  return (
    <GlassModal
      visible={isOpen}
      title={t('profiles.enterPin')}
      onClose={onClose}
      dismissable={true}
    >
      {/* PIN Input */}
      <GlassInput
        secureTextEntry
        keyboardType="numeric"
        maxLength={6}
        value={pin}
        onChangeText={handlePinChange}
        inputStyle={{
          fontSize: 24,
          textAlign: 'center',
          letterSpacing: 8,
        }}
        placeholder={t('placeholder.pin')}
        error={error}
        autoFocus
      />

      {/* Action Buttons */}
      <View
        className={platformClass(
          'flex-row gap-2 mt-4',
          'flex-row gap-2 mt-4'
        )}
      >
        <View className="flex-1">
          <GlassButton
            title={t('common.cancel')}
            onPress={onClose}
          />
        </View>
        <View className="flex-1">
          <GlassButton
            title={isLoading ? '' : t('common.confirm')}
            onPress={handleSubmit}
            disabled={pin.length < 4 || isLoading}
            variant="primary"
          />
        </View>
      </View>
    </GlassModal>
  );
}
