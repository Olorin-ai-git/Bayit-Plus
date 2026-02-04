import { Pressable, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Monitor } from 'lucide-react';
import { getDesktopURL, setDesktopPreference, isMobileSubdomain } from '@/utils/mobileDetection';
import { colors, spacing } from '@olorin/design-tokens';

interface ViewDesktopLinkProps {
  variant?: 'text' | 'button';
  style?: any;
}

/**
 * ViewDesktopLink Component
 *
 * Provides a link for mobile users to switch to the desktop site
 * Only visible when on mobile subdomain (m.bayit.tv)
 *
 * Usage:
 * - In footer: <ViewDesktopLink variant="text" />
 * - In settings: <ViewDesktopLink variant="button" />
 */
export default function ViewDesktopLink({ variant = 'text', style }: ViewDesktopLinkProps) {
  const { t } = useTranslation();

  // Only show on mobile subdomain
  if (!isMobileSubdomain()) {
    return null;
  }

  const handlePress = () => {
    // Set preference to stay on desktop
    setDesktopPreference(true);

    // Redirect to desktop URL
    const desktopURL = getDesktopURL();
    window.location.replace(desktopURL);
  };

  if (variant === 'button') {
    return (
      <Pressable
        onPress={handlePress}
        style={[styles.button, style]}
      >
        <Monitor size={16} color={colors.text} />
        <Text style={styles.buttonText}>
          {t('mobile.viewDesktopSite', 'View Desktop Site')}
        </Text>
      </Pressable>
    );
  }

  // Text link variant
  return (
    <Pressable onPress={handlePress} style={[styles.textLink, style]}>
      <Text style={styles.linkText}>
        {t('mobile.desktopSite', 'Desktop Site')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  textLink: {
    paddingVertical: spacing.xs,
  },
  linkText: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
    textDecorationLine: 'underline',
  },
});
