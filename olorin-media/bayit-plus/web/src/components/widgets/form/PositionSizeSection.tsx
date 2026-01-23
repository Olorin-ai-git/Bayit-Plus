/**
 * PositionSizeSection Component
 * Form section for widget position and size configuration
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassInput } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { platformClass } from '@/utils/platformClass';

export const PositionSizeSchema = z.object({
  position_x: z.number().min(0),
  position_y: z.number().min(0),
  position_width: z.number().min(100),
  position_height: z.number().min(100),
});

export type PositionSizeData = z.infer<typeof PositionSizeSchema>;

interface PositionSizeSectionProps {
  positionX: number;
  positionY: number;
  positionWidth: number;
  positionHeight: number;
  onUpdateField: (
    field: 'position_x' | 'position_y' | 'position_width' | 'position_height',
    value: number
  ) => void;
}

interface PositionFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  textAlign: 'left' | 'right' | 'center';
}

const PositionField: React.FC<PositionFieldProps> = ({ label, value, onChange, textAlign }) => {
  return (
    <View className={platformClass('flex-1 flex flex-col')}>
      <Text
        className={platformClass('text-xs text-gray-400 mb-1 font-semibold')}
        style={{ textAlign }}
      >
        {label}
      </Text>
      <GlassInput
        className={platformClass(
          'bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white min-h-[36px]'
        )}
        value={String(value)}
        onChangeText={(v) => onChange(parseInt(v) || 0)}
        keyboardType="number-pad"
      />
    </View>
  );
};

export const PositionSizeSection: React.FC<PositionSizeSectionProps> = ({
  positionX,
  positionY,
  positionWidth,
  positionHeight,
  onUpdateField,
}) => {
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useDirection();

  return (
    <View className={platformClass('flex flex-col gap-3')}>
      <Text
        className={platformClass(
          'text-sm font-semibold text-gray-400 uppercase tracking-wider',
          'text-sm font-semibold text-gray-400'
        )}
        style={{ textAlign }}
      >
        {t('widgets.form.positionSize')}
      </Text>

      <View className={platformClass('flex gap-2')} style={{ flexDirection }}>
        <PositionField
          label="X"
          value={positionX}
          onChange={(v) => onUpdateField('position_x', v)}
          textAlign={textAlign}
        />
        <PositionField
          label="Y"
          value={positionY}
          onChange={(v) => onUpdateField('position_y', v)}
          textAlign={textAlign}
        />
        <PositionField
          label="Width"
          value={positionWidth}
          onChange={(v) => onUpdateField('position_width', v)}
          textAlign={textAlign}
        />
        <PositionField
          label="Height"
          value={positionHeight}
          onChange={(v) => onUpdateField('position_height', v)}
          textAlign={textAlign}
        />
      </View>
    </View>
  );
};
