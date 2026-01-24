/**
 * SidebarLogo Component
 *
 * Logo and slogan section for GlassSidebar
 * Part of GlassSidebar - StyleSheet implementation for RN Web compatibility
 *
 * Features:
 * - Animated logo display
 * - Slogan with glassmorphism effect
 * - Delayed slogan fade-in animation
 * - Placeholder when collapsed
 */

import { View, Text, Image, Animated, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

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
    <View style={styles.container}>
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
              style={styles.logo}
              resizeMode="cover"
            />
          </Link>
          <Animated.View
            style={[
              styles.sloganContainer,
              {
                opacity: sloganOpacityAnim,
              },
            ]}
          >
            <Text style={styles.sloganText}>
              {t('common.slogan', 'Your Home. Anywhere.')}
            </Text>
          </Animated.View>
        </>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: spacing.xs,
    marginBottom: 0,
  },
  logo: {
    width: 96,
    height: 96,
    // @ts-ignore - Web CSS
    transition: 'width 0.3s, height 0.3s',
  },
  sloganContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.4)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  } as any,
  sloganText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    letterSpacing: 0.8,
    // @ts-ignore - Web CSS gradient
    backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(192, 132, 252, 0.9) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as any,
  placeholder: {
    width: 48,
    height: 180, // Same height as expanded logo to maintain spacing
  },
});
