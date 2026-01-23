/**
 * YoungstersPageHeader - Header with title, icon, and exit button
 */

import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Users, Lock } from 'lucide-react';
import { z } from 'zod';
import { platformClass } from '@/utils/platformClass';
import { useDirection } from '@/hooks/useDirection';

const YoungstersPageHeaderPropsSchema = z.object({
  contentCount: z.number(),
  onExitPress: z.function().args().returns(z.void()),
});

type YoungstersPageHeaderProps = z.infer<typeof YoungstersPageHeaderPropsSchema>;

/**
 * Header component for Youngsters page
 * Displays title, item count, and exit button
 */
export default function YoungstersPageHeader({
  contentCount,
  onExitPress,
}: YoungstersPageHeaderProps) {
  const { t } = useTranslation();
  const { flexDirection, justifyContent, textAlign } = useDirection();

  return (
    <View
      className={platformClass('flex-row items-center justify-between mb-6')}
      style={{ flexDirection, justifyContent }}
    >
      <View
        className={platformClass('flex-row items-center gap-4')}
        style={{ flexDirection, justifyContent }}
      >
        <View className={platformClass(
          'w-16 h-16 rounded-full bg-purple-500/20 justify-center items-center'
        )}>
          <Users size={32} color="#a855f7" />
        </View>
        <View>
          <Text
            className={platformClass('text-3xl font-bold text-purple-500')}
            style={{ textAlign }}
          >
            {t('youngsters.title')}
          </Text>
          <Text
            className={platformClass('text-sm text-gray-400')}
            style={{ textAlign }}
          >
            {contentCount} {t('youngsters.items')}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onExitPress}
        className={platformClass(
          'flex-row items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10',
          'flex-row items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10'
        )}
      >
        <Lock size={16} color="#9ca3af" />
        <Text className={platformClass('text-sm text-gray-400')}>
          {t('youngsters.exitYoungstersMode')}
        </Text>
      </Pressable>
    </View>
  );
}
