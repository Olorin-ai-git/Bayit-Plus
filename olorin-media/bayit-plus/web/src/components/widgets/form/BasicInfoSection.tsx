/**
 * BasicInfoSection Component
 * Form section for widget basic information (title, description, icon)
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassInput } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { platformClass } from '@/utils/platformClass';

export const BasicInfoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  icon: z.string().max(2).optional(),
});

export type BasicInfoData = z.infer<typeof BasicInfoSchema>;

interface BasicInfoSectionProps {
  title: string;
  description: string;
  icon: string;
  onUpdateField: (field: 'title' | 'description' | 'icon', value: string) => void;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  title,
  description,
  icon,
  onUpdateField,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  return (
    <View className={platformClass('flex flex-col gap-3')}>
      <Text
        className={platformClass(
          'text-sm font-semibold text-gray-400 uppercase tracking-wider',
          'text-sm font-semibold text-gray-400'
        )}
        style={{ textAlign }}
      >
        {t('widgets.form.basicInfo')}
      </Text>

      <GlassInput
        className={platformClass(
          'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[44px]'
        )}
        placeholder={t('widgets.form.titlePlaceholder')}
        value={title}
        onChangeText={(v) => onUpdateField('title', v)}
      />

      <GlassInput
        className={platformClass(
          'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[44px]'
        )}
        placeholder={t('widgets.form.descriptionPlaceholder')}
        value={description}
        onChangeText={(v) => onUpdateField('description', v)}
        multiline
        numberOfLines={2}
      />

      <GlassInput
        className={platformClass(
          'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[44px]'
        )}
        placeholder={t('widgets.form.iconPlaceholder')}
        value={icon}
        onChangeText={(v) => onUpdateField('icon', v)}
        maxLength={2}
      />
    </View>
  );
};
