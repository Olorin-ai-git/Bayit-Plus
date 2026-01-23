import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Film } from 'lucide-react';
import { z } from 'zod';
import { GlassCard } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import { platformClass } from '@/utils/platformClass';

const VODPageEmptyStatePropsSchema = z.object({
  variant: z.enum(['section', 'full']).default('full'),
  message: z.string().optional(),
});

type VODPageEmptyStateProps = z.infer<typeof VODPageEmptyStatePropsSchema>;

/**
 * VODPage Empty State Component
 *
 * Shows when no content is available (section or full page)
 */
export default function VODPageEmptyState({
  variant = 'full',
  message,
}: VODPageEmptyStateProps) {
  const { t } = useTranslation();

  if (variant === 'section') {
    return (
      <View className={platformClass('py-8 items-center')}>
        <Text className={platformClass('text-base text-gray-400')}>
          {message || t('vod.noMovies')}
        </Text>
      </View>
    );
  }

  return (
    <View className={platformClass('flex-1 justify-center items-center py-16')}>
      <GlassCard className={platformClass('p-12 items-center')}>
        <Film size={64} color={colors.textMuted} />
        <Text className={platformClass('text-xl font-semibold text-white mt-4 mb-2')}>
          {t('vod.emptyTitle')}
        </Text>
        <Text className={platformClass('text-base text-gray-300')}>
          {t('vod.emptyDescription')}
        </Text>
      </GlassCard>
    </View>
  );
}
