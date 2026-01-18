import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassModal, GlassButton } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';

interface SuccessModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

export const SuccessModal = ({ visible, message, onClose }: SuccessModalProps) => {
  const { t } = useTranslation();

  return (
    <GlassModal
      visible={visible}
      title={t('common.success')}
      onClose={onClose}
      dismissable={true}
    >
      <Text style={styles.modalText}>{message}</Text>
      <View style={styles.modalActions}>
        <GlassButton
          title={t('common.ok')}
          onPress={onClose}
          variant="secondary"
          style={styles.modalButton}
        />
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  modalText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalButton: {
    minWidth: 100,
  },
});
