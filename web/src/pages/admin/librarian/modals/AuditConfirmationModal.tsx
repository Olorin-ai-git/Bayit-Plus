import { useTranslation } from 'react-i18next';
import { GlassModal } from '@bayit/shared/ui';

interface AuditConfirmationModalProps {
  visible: boolean;
  budgetLimit: number;
  dryRun: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const AuditConfirmationModal = ({
  visible,
  budgetLimit,
  dryRun,
  onClose,
  onConfirm,
}: AuditConfirmationModalProps) => {
  const { t } = useTranslation();

  return (
    <GlassModal
      visible={visible}
      type="warning"
      title={t('admin.librarian.modal.confirmAI.title')}
      message={t('admin.librarian.modal.confirmAI.message', {
        budget: budgetLimit.toFixed(2),
        dryRun: dryRun ? t('admin.librarian.modal.confirmAI.dryRunNote') : ''
      })}
      buttons={[
        {
          text: t('admin.librarian.modal.cancel'),
          onPress: onClose,
          variant: 'secondary',
        },
        {
          text: t('admin.librarian.modal.confirm'),
          onPress: onConfirm,
          variant: 'primary',
        },
      ]}
      dismissable
    />
  );
};
