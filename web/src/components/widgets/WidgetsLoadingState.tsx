/**
 * WidgetsLoadingState - Loading skeleton for widgets page
 *
 * Displays skeleton cards while widgets are being loaded
 */

import { View, Text } from 'react-native';
import { Grid3x3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useDirection } from '@/hooks/useDirection';
import { colors } from '@bayit/shared/theme';

const WidgetsLoadingStatePropsSchema = z.object({
  numSkeletons: z.number().optional().default(8),
});

type WidgetsLoadingStateProps = z.infer<typeof WidgetsLoadingStatePropsSchema>;

/**
 * WidgetsLoadingState - Skeleton loading state
 */
export default function WidgetsLoadingState({ numSkeletons = 8 }: WidgetsLoadingStateProps = {}) {
  const { t } = useTranslation();
  const { textAlign, flexDirection, justifyContent } = useDirection();

  return (
    <View className="flex-1 px-4 py-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <View
        className="flex-row items-center gap-3 mb-6"
        style={{ flexDirection, justifyContent }}
      >
        <View className="w-14 h-14 rounded-full bg-purple-700/30 justify-center items-center">
          <Grid3x3 size={28} color={colors.primary} />
        </View>
        <View>
          <Text className="text-[32px] font-bold text-white" style={{ textAlign }}>
            {t('nav.widgets')}
          </Text>
        </View>
      </View>

      {/* Skeleton Grid */}
      <View className="flex-row flex-wrap">
        {[...Array(numSkeletons)].map((_, i) => (
          <View key={i} className="w-1/4 p-1">
            <View className="h-30 bg-white/10 rounded-lg" />
          </View>
        ))}
      </View>
    </View>
  );
}
