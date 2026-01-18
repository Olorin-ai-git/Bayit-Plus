import { useTranslation } from 'react-i18next';
import { GlassModal } from '@bayit/shared/ui';

interface ClearReportsModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ClearReportsModal = ({ visible, onClose, onConfirm }: ClearReportsModalProps) => {
  const { t } = useTranslation();

  return (
    <GlassModal
      visible={visible}
      type="warning"
      title={t('admin.librarian.reports.clearAll')}
      message={t('admin.librarian.reports.confirmClearAll')}
      buttons={[
        {
          text: t('common.cancel'),
          onPress: onClose,
          variant: 'secondary',
        },
        {
          text: t('admin.librarian.reports.clearAll'),
          onPress: onConfirm,
          variant: 'destructive',
        },
      ]}
      dismissable
    />
  );
};
