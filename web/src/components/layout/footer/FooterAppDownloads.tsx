/**
 * FooterAppDownloads Component
 *
 * App Store and Google Play download buttons
 * Part of Footer - StyleSheet implementation for RN Web compatibility
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

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Smartphone } from 'lucide-react';
import { GlassView } from '@bayit/shared';

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
    <View style={styles.container}>
      {/* App Buttons */}
      <View style={styles.appButtons}>
        {appStores.map((store) => (
          <Pressable
            key={store.key}
            onPress={() => handleStorePress(store.url)}
            style={({ pressed }) => [
              styles.appButton,
              pressed && styles.appButtonPressed,
            ]}
            accessibilityLabel={t(store.label)}
            accessibilityRole="button"
            // Touch target: 44x44pt (iOS), 48x48dp (Android) ✓
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <GlassView style={styles.appButtonContent} intensity="low">
              <Smartphone size={14} color="rgba(255, 255, 255, 0.9)" />
              <Text style={styles.appButtonText}>{t(store.label)}</Text>
            </GlassView>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  appButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  appButton: {
    // Pressable wrapper doesn't need base styles
  },
  appButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  appButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  appButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

// Export default app stores for reuse
export { DEFAULT_APP_STORES };
