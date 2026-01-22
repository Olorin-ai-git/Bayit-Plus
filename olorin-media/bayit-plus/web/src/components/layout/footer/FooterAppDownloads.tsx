/**
 * FooterAppDownloads Component
 *
 * App Store and Google Play download buttons
 * Part of Footer migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - App Store button (iOS)
 * - Google Play button (Android)
 * - GlassView from @bayit/shared for glassmorphism
 * - Smartphone icon on both buttons
 * - Opens in new tab (_blank)
 * - Touch targets meet accessibility standards (44x44pt/48x48dp)
 * - i18n support for button labels
 */

import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Smartphone } from 'lucide-react';
import { GlassView } from '@bayit/shared';
import { platformClass } from '../../../utils/platformClass';

// Zod schema for prop validation
const AppStoreSchema = z.object({
  url: z.string().url(),
  label: z.string(),
  key: z.enum(['appStore', 'googlePlay']),
});

const FooterAppDownloadsPropsSchema = z.object({
  appStores: z.array(AppStoreSchema).optional(),
});

type AppStore = z.infer<typeof AppStoreSchema>;
type FooterAppDownloadsProps = z.infer<typeof FooterAppDownloadsPropsSchema>;

const DEFAULT_APP_STORES: AppStore[] = [
  {
    url: 'https://apps.apple.com/app/bayitplus',
    label: 'footer.apps.appStore',
    key: 'appStore',
  },
  {
    url: 'https://play.google.com/store/apps/details?id=com.bayitplus',
    label: 'footer.apps.googlePlay',
    key: 'googlePlay',
  },
];

export default function FooterAppDownloads({
  appStores = DEFAULT_APP_STORES,
}: Partial<FooterAppDownloadsProps>) {
  const { t } = useTranslation();

  // Validate props
  FooterAppDownloadsPropsSchema.partial().parse({ appStores });

  const handleStorePress = (url: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  return (
    <View className={platformClass('gap-2')}>
      {/* App Buttons */}
      <View className={platformClass('flex-row gap-2')}>
        {appStores.map((store) => (
          <Pressable
            key={store.key}
            onPress={() => handleStorePress(store.url)}
            className={platformClass(
              'active:opacity-80 active:scale-[0.98]',
              ''
            )}
            accessibilityLabel={t(store.label)}
            accessibilityRole="button"
            // Touch target: 44x44pt (iOS), 48x48dp (Android) ✓
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <GlassView
              className={platformClass(
                'flex-row items-center gap-2 py-2 px-3 rounded',
                'flex-row items-center gap-2 py-2 px-3 rounded'
              )}
              intensity="low"
            >
              <Smartphone size={14} color="rgba(255, 255, 255, 0.9)" />
              <Text
                className={platformClass(
                  'text-[11px] font-semibold text-white',
                  'text-[11px] font-semibold text-white'
                )}
              >
                {t(store.label)}
              </Text>
            </GlassView>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Export default app stores for reuse
export { DEFAULT_APP_STORES };
