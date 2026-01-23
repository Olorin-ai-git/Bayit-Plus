/**
 * SidebarLogo Component
 *
 * Logo and slogan section for GlassSidebar
 * Part of GlassSidebar migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - Animated logo display
 * - Slogan with glassmorphism effect
 * - Delayed slogan fade-in animation
 * - Placeholder when collapsed
 */

import { View, Text, Image, Animated } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { platformClass } from '../../../utils/platformClass';

const SidebarLogoPropsSchema = z.object({
  showLabels: z.boolean(),
  sloganOpacityAnim: z.instanceof(Animated.Value),
});

type SidebarLogoProps = z.infer<typeof SidebarLogoPropsSchema>;

export default function SidebarLogo({
  showLabels,
  sloganOpacityAnim,
}: SidebarLogoProps) {
  const { t } = useTranslation();

  return (
    <View
      className={platformClass(
        'items-center justify-center pt-0 pb-1 mb-0',
        'items-center justify-center pt-0 pb-1 mb-0'
      )}
    >
      {showLabels ? (
        <>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={{ uri: '/assets/images/logos/logo-transparent.png' }}
              style={{
                width: 96,
                height: 96,
                // @ts-ignore - Web CSS
                transition: 'width 0.3s, height 0.3s',
              }}
              resizeMode="cover"
            />
          </Link>
          <Animated.View
            style={{
              marginBottom: 20,
              opacity: sloganOpacityAnim,
            }}
            className={platformClass(
              'bg-purple-500/15 border-2 border-purple-600/40 rounded-lg py-1 px-4 self-center backdrop-blur-xl',
              'bg-purple-500/15 border-2 border-purple-600/40 rounded-lg py-1 px-4 self-center'
            )}
          >
            <Text
              className={platformClass(
                'text-[11px] font-semibold text-white/95 text-center tracking-wider',
                'text-[11px] font-semibold text-white/95 text-center tracking-wider'
              )}
              style={{
                // @ts-ignore - Web CSS gradient
                backgroundImage:
                  'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(192, 132, 252, 0.9) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('common.slogan', 'Your Home. Anywhere.')}
            </Text>
          </Animated.View>
        </>
      ) : (
        <View
          className={platformClass('w-12 h-[180px]', 'w-12 h-[180px]')}
        />
      )}
    </View>
  );
}
