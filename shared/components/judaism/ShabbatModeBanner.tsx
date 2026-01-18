/**
 * ShabbatModeBanner Component
 *
 * Cross-platform banner that appears during Shabbat.
 * Displays Shabbat times, countdown to Havdalah, and current parasha.
 * Works on web, mobile (iOS/Android), and TV platforms.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { judaismService } from '../../services/api';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';

interface ShabbatTimes {
  city: string;
  state: string;
  candle_lighting: string;
  havdalah: string;
  parasha?: string;
  parasha_he?: string;
  timezone?: string;
}

interface ShabbatModeBannerProps {
  defaultCity?: string;
  defaultState?: string;
  onDismiss?: () => void;
}

export const ShabbatModeBanner: React.FC<ShabbatModeBannerProps> = ({
  defaultCity = 'New York',
  defaultState = 'NY',
  onDismiss,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const [shabbatTimes, setShabbatTimes] = useState<ShabbatTimes | null>(null);
  const [isShabbatMode, setIsShabbatMode] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Pulse animation for candles
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const checkShabbatMode = useCallback((times: ShabbatTimes) => {
    const now = new Date();
    const candleLighting = new Date(times.candle_lighting);
    const havdalah = new Date(times.havdalah);
    return now >= candleLighting && now <= havdalah;
  }, []);

  const calculateCountdown = useCallback((havdalahTime: string) => {
    const now = new Date();
    const havdalah = new Date(havdalahTime);
    const diff = havdalah.getTime() - now.getTime();

    if (diff <= 0) return '';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    loadShabbatTimes();
  }, []);

  useEffect(() => {
    if (!shabbatTimes) return;

    const interval = setInterval(() => {
      const inShabbat = checkShabbatMode(shabbatTimes);
      setIsShabbatMode(inShabbat);
      if (inShabbat) {
        setCountdown(calculateCountdown(shabbatTimes.havdalah));
      }
    }, 1000);

    const inShabbat = checkShabbatMode(shabbatTimes);
    setIsShabbatMode(inShabbat);
    if (inShabbat) {
      setCountdown(calculateCountdown(shabbatTimes.havdalah));
    }

    return () => clearInterval(interval);
  }, [shabbatTimes, checkShabbatMode, calculateCountdown]);

  const loadShabbatTimes = async () => {
    try {
      setIsLoading(true);
      const response = await judaismService.getShabbatTimes(defaultCity, defaultState) as { data?: ShabbatTimes };
      if (response?.data) {
        setShabbatTimes(response.data);
      }
    } catch (err) {
      console.error('Failed to load Shabbat times for banner:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const getParasha = () => {
    if (!shabbatTimes?.parasha) return '';
    return i18n.language === 'he' ? shabbatTimes.parasha_he : shabbatTimes.parasha;
  };

  if (isLoading || !isShabbatMode || dismissed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <GlassView style={styles.banner} intensity="medium">
        {/* Gradient overlay */}
        <View style={styles.gradientOverlay} />

        <View style={[styles.content, isRTL && styles.contentRTL]}>
          {/* Header with dismiss button */}
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
              {/* Animated candles */}
              <View style={styles.candlesContainer}>
                <Animated.Text style={[styles.candleEmoji, { opacity: pulseAnim }]}>
                  🕯️
                </Animated.Text>
                <Animated.Text style={[styles.candleEmoji, { opacity: pulseAnim }]}>
                  🕯️
                </Animated.Text>
              </View>

              <View style={styles.titleContainer}>
                <Text style={styles.title}>
                  {t('judaism.shabbat.shabbatShalom', 'Shabbat Shalom!')}
                </Text>
                <Text style={styles.subtitle}>
                  {t('judaism.shabbat.shabbatMode', 'Shabbat Mode')}
                </Text>
              </View>

              {/* Challah */}
              <Text style={styles.challahEmoji}>🍞</Text>
            </View>

            {/* Dismiss button */}
            {!isTV && (
              <TouchableOpacity
                onPress={handleDismiss}
                style={styles.dismissButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.dismissText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Parasha display */}
          {getParasha() && (
            <View style={styles.parashaContainer}>
              <Text style={styles.parashaText}>
                {t('judaism.shabbat.parashat', 'Parashat')} {getParasha()}
              </Text>
            </View>
          )}

          {/* Countdown section */}
          <View style={[styles.countdownSection, isRTL && styles.countdownSectionRTL]}>
            <View style={[styles.countdownLabel, isRTL && styles.countdownLabelRTL]}>
              <Text style={styles.moonEmoji}>🌙</Text>
              <Text style={styles.countdownLabelText}>
                {t('judaism.shabbat.endsIn', 'Shabbat ends in')}
              </Text>
            </View>

            <View style={[styles.countdownValue, isRTL && styles.countdownValueRTL]}>
              <Text style={styles.countdownTime}>
                {countdown}
              </Text>
              <View style={styles.havdalahBadge}>
                <Text style={styles.flameEmoji}>🔥</Text>
                <Text style={styles.havdalahText}>
                  {t('judaism.shabbat.havdalah', 'Havdalah')}
                </Text>
              </View>
            </View>
          </View>

          {/* Decorative stars */}
          <Text style={[styles.star, styles.starTop, isRTL ? styles.starTopRTL : styles.starTopLTR]}>
            ✨
          </Text>
          <Text style={[styles.star, styles.starBottom, isRTL ? styles.starBottomRTL : styles.starBottomLTR]}>
            ⭐
          </Text>
        </View>
      </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  banner: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  content: {
    padding: spacing.md,
    position: 'relative',
  },
  contentRTL: {
    direction: 'rtl',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  candlesContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  candleEmoji: {
    fontSize: isTV ? 32 : 24,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  title: {
    fontSize: isTV ? fontSize.xl : fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.warning,
    fontWeight: '600',
  },
  challahEmoji: {
    fontSize: isTV ? 32 : 24,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  parashaContainer: {
    backgroundColor: 'rgba(126, 34, 206, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  parashaText: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.primaryLight,
    textAlign: 'center',
  },
  countdownSection: {
    backgroundColor: colors.glassStrong,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countdownSectionRTL: {
    flexDirection: 'row-reverse',
  },
  countdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countdownLabelRTL: {
    flexDirection: 'row-reverse',
  },
  moonEmoji: {
    fontSize: isTV ? 24 : 20,
  },
  countdownLabelText: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.primaryLight,
  },
  countdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countdownValueRTL: {
    flexDirection: 'row-reverse',
  },
  countdownTime: {
    fontSize: isTV ? fontSize.xl : fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  havdalahBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flameEmoji: {
    fontSize: 14,
  },
  havdalahText: {
    fontSize: fontSize.xs,
    color: colors.warning,
  },
  star: {
    position: 'absolute',
  },
  starTop: {
    top: spacing.sm,
    opacity: 0.5,
    fontSize: 18,
  },
  starTopLTR: {
    right: 48,
  },
  starTopRTL: {
    left: 48,
  },
  starBottom: {
    bottom: spacing.sm,
    opacity: 0.3,
    fontSize: 14,
  },
  starBottomLTR: {
    left: spacing.sm,
  },
  starBottomRTL: {
    right: spacing.sm,
  },
});

export default ShabbatModeBanner;
