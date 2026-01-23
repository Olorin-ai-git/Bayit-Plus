import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Film } from 'lucide-react';
import { z } from 'zod';
import { GlassView, GlassCard } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import { platformClass } from '@/utils/platformClass';

const VODPageLoadingStatePropsSchema = z.object({
  variant: z.enum(['full', 'skeleton']).default('full'),
  numColumns: z.number().optional().default(4),
});

type VODPageLoadingStateProps = z.infer<typeof VODPageLoadingStatePropsSchema>;

/**
 * VODPage Loading State Component
 *
 * Full page loading spinner or skeleton grid
 */
export default function VODPageLoadingState({
  variant = 'full',
  numColumns = 4,
}: VODPageLoadingStateProps) {
  const { t } = useTranslation();
  const { textAlign, flexDirection, justifyContent } = useDirection();

  if (variant === 'full') {
    return (
      <View className={platformClass('flex-1 px-4 py-6 max-w-[1400px] mx-auto w-full')}>
        {/* Header */}
        <View
          className={platformClass('flex-row items-center gap-2 mb-6')}
          style={{ flexDirection, justifyContent } as any}
        >
          <Text
            className={platformClass('text-[32px] font-bold text-white')}
            style={{ textAlign } as any}
          >
            {t('vod.title')}
          </Text>
          <GlassView className={platformClass('w-12 h-12 rounded-full justify-center items-center')}>
            <Film size={24} color={colors.primary} />
          </GlassView>
        </View>

        {/* Loading Card */}
        <View className={platformClass('flex-1 justify-center items-center min-h-[400px]')}>
          <GlassCard className={platformClass('p-12 items-center gap-6')}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className={platformClass('text-base text-white mt-4')}>{t('common.loading')}</Text>
          </GlassCard>
        </View>
      </View>
    );
  }

  // Skeleton grid
  return (
    <View className={platformClass('flex-row flex-wrap')}>
      {[...Array(12)].map((_, i) => (
        <View
          key={i}
          style={{ width: `${100 / numColumns}%`, padding: 4 }}
        >
          <View className={platformClass('w-full')}>
            <View
              className={platformClass(
                'aspect-[16/9] bg-white/10 rounded-lg',
                'aspect-[16/9] bg-white/10 rounded-lg'
              )}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
