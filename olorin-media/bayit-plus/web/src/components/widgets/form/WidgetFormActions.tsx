/**
 * WidgetFormActions Component
 * Action buttons for widget form (Cancel/Save)
 */

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { platformClass } from '@/utils/platformClass';

interface WidgetFormActionsProps {
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export const WidgetFormActions: React.FC<WidgetFormActionsProps> = ({
  saving,
  onCancel,
  onSave,
}) => {
  const { t } = useTranslation();
  const { flexDirection } = useDirection();

  return (
    <View
      className={platformClass('flex gap-3 pt-3 border-t border-white/10')}
      style={{ flexDirection }}
    >
      <GlassButton
        title={t('widgets.form.cancel')}
        variant="ghost"
        onPress={onCancel}
        className={platformClass('flex-1')}
      />
      <GlassButton
        title={saving ? t('widgets.form.saving') : t('widgets.form.saveWidget')}
        variant="primary"
        onPress={onSave}
        loading={saving}
        disabled={saving}
        className={platformClass('flex-1')}
      />
    </View>
  );
};
