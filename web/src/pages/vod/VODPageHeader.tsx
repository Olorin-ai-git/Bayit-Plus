import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Film } from 'lucide-react';
import { z } from 'zod';
import { GlassView } from '@bayit/shared/ui';
import { colors } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';
import { platformClass } from '@/utils/platformClass';

const VODPageHeaderPropsSchema = z.object({
  className: z.string().optional(),
});

type VODPageHeaderProps = z.infer<typeof VODPageHeaderPropsSchema>;

/**
 * VODPage Header Component
 *
 * Hero section with title and Film icon
 */
export default function VODPageHeader({ className }: VODPageHeaderProps) {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();

  return (
    <View
      className={platformClass(
        'flex flex-row items-center gap-2 mb-6',
        'flex flex-row items-center gap-2 mb-6'
      )}
      style={{ flexDirection, justifyContent } as any}
    >
      <Text
        className={platformClass(
          'text-[32px] font-bold text-white',
          'text-[32px] font-bold text-white'
        )}
        style={{ textAlign } as any}
      >
        {t('vod.title')}
      </Text>
      <GlassView className={platformClass('w-12 h-12 rounded-full justify-center items-center')}>
        <Film size={24} color={colors.primary} />
      </GlassView>
    </View>
  );
}
