import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useBetaCredits } from '@/hooks/useBetaCredits';
import { colors, spacing } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';

declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

interface HeroGreetingProps {
  style?: any;
}

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getFirstName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts[0];
}

export default function HeroGreeting({ style }: HeroGreetingProps) {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const { user } = useAuthStore();
  const { credits, isLoading: creditsLoading } = useBetaCredits();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Get current hour in user's local timezone
    const now = new Date();
    const hour = now.getHours();
    setGreeting(getGreeting(hour));

    // Update greeting every minute
    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      setGreeting(getGreeting(hour));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const firstName = getFirstName(user.name);
  const isBetaTester = credits !== null;

  return (
    <View style={[styles.container, isRTL && styles.containerRTL, style]}>
      <View style={[styles.greetingRow, isRTL && styles.greetingRowRTL]}>
        {/* Greeting Text */}
        <View style={[styles.greetingTextContainer, isRTL && styles.greetingTextContainerRTL]}>
          <Text style={[styles.greetingText, isRTL && styles.greetingTextRTL]}>
            {isRTL ? (
              <>
                <Text style={styles.nameText}>{firstName}</Text>
                {' ,'}
                {t(`greeting.${greeting}`, { defaultValue: `Good ${greeting}` })}
              </>
            ) : (
              <>
                {t(`greeting.${greeting}`, { defaultValue: `Good ${greeting}` })}
                {', '}
                <Text style={styles.nameText}>{firstName}</Text>
              </>
            )}
          </Text>
        </View>

        {/* Beta Credits Badge */}
        {isBetaTester && !creditsLoading && (
          <View style={[styles.creditsBadge, isRTL && styles.creditsBadgeRTL]}>
            <View style={styles.betaIcon}>
              <Text style={styles.betaIconText}>β</Text>
            </View>
            <Text style={styles.creditsLabel}>
              {t('beta.credits.remainingCredits', { defaultValue: 'Credits' })}:
            </Text>
            <Text style={styles.creditsValue}>{credits?.toLocaleString()}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
    paddingVertical: spacing.lg,
  },
  containerRTL: {
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
    width: '100%',
  },
  greetingRowRTL: {
    flexDirection: 'row-reverse',
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingTextContainerRTL: {
  },
  greetingText: {
    fontSize: IS_TV_BUILD ? 36 : 28,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'left',
  },
  greetingTextRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  nameText: {
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(107, 33, 168, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.3)',
  },
  creditsBadgeRTL: {
    flexDirection: 'row-reverse',
  },
  betaIcon: {
    width: IS_TV_BUILD ? 28 : 24,
    height: IS_TV_BUILD ? 28 : 24,
    borderRadius: '50%',
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  betaIconText: {
    fontSize: IS_TV_BUILD ? 16 : 14,
    fontWeight: '700',
    color: colors.text,
  },
  creditsLabel: {
    fontSize: IS_TV_BUILD ? 16 : 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  creditsValue: {
    fontSize: IS_TV_BUILD ? 20 : 16,
    fontWeight: '700',
    color: colors.text,
  },
});
