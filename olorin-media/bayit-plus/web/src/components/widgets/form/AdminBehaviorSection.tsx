/**
 * AdminBehaviorSection Component
 * Admin-specific form section for widget behavior and targeting
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassInput, GlassToggle } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { platformClass } from '@/utils/platformClass';

export const AdminBehaviorSchema = z.object({
  is_muted: z.boolean().optional(),
  is_closable: z.boolean().optional(),
  is_draggable: z.boolean().optional(),
  visible_to_roles: z.array(z.string()).optional(),
  target_pages: z.array(z.string()).optional(),
  order: z.number().optional(),
});

export type AdminBehaviorData = z.infer<typeof AdminBehaviorSchema>;

interface AdminBehaviorSectionProps {
  isMuted: boolean;
  isClosable: boolean;
  isDraggable: boolean;
  order: number;
  onUpdateField: (
    field: 'is_muted' | 'is_closable' | 'is_draggable' | 'order',
    value: boolean | number
  ) => void;
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  flexDirection: 'row' | 'row-reverse';
  textAlign: 'left' | 'right' | 'center';
  isRTL: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  value,
  onChange,
  flexDirection,
  textAlign,
  isRTL,
}) => {
  return (
    <View
      className={platformClass('flex items-center justify-between')}
      style={{ flexDirection }}
    >
      <Text className={platformClass('text-sm text-white')} style={{ textAlign }}>
        {label}
      </Text>
      <GlassToggle value={value} onValueChange={onChange} size="small" isRTL={isRTL} />
    </View>
  );
};

export const AdminBehaviorSection: React.FC<AdminBehaviorSectionProps> = ({
  isMuted,
  isClosable,
  isDraggable,
  order,
  onUpdateField,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  return (
    <>
      {/* Behavior Section */}
      <View className={platformClass('flex flex-col gap-3')}>
        <Text
          className={platformClass(
            'text-sm font-semibold text-gray-400 uppercase tracking-wider',
            'text-sm font-semibold text-gray-400'
          )}
          style={{ textAlign }}
        >
          {t('widgets.form.behavior')}
        </Text>

        <View className={platformClass('flex flex-col gap-3')}>
          <ToggleRow
            label={t('widgets.form.mutedByDefault')}
            value={isMuted}
            onChange={(v) => onUpdateField('is_muted', v)}
            flexDirection={flexDirection}
            textAlign={textAlign}
            isRTL={isRTL}
          />
          <ToggleRow
            label={t('widgets.form.closable')}
            value={isClosable}
            onChange={(v) => onUpdateField('is_closable', v)}
            flexDirection={flexDirection}
            textAlign={textAlign}
            isRTL={isRTL}
          />
          <ToggleRow
            label={t('widgets.form.draggable')}
            value={isDraggable}
            onChange={(v) => onUpdateField('is_draggable', v)}
            flexDirection={flexDirection}
            textAlign={textAlign}
            isRTL={isRTL}
          />
        </View>
      </View>

      {/* Order Section */}
      <View className={platformClass('flex flex-col gap-3')}>
        <Text
          className={platformClass(
            'text-sm font-semibold text-gray-400 uppercase tracking-wider',
            'text-sm font-semibold text-gray-400'
          )}
          style={{ textAlign }}
        >
          {t('widgets.form.widgetOrder')}
        </Text>
        <GlassInput
          className={platformClass(
            'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[44px]'
          )}
          placeholder={t('widgets.form.orderPlaceholder')}
          value={String(order || 0)}
          onChangeText={(v) => onUpdateField('order', parseInt(v) || 0)}
          keyboardType="number-pad"
        />
      </View>
    </>
  );
};
