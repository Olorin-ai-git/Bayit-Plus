/**
 * ShabbatEveSection Component
 *
 * Cross-platform section that appears on Friday (Erev Shabbat).
 * Displays countdown to candle lighting, Shabbat times, parasha, and quick actions.
 * Works on web, mobile (iOS/Android), and TV platforms.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { judaismService } from '../../services/api';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';

interface ShabbatStatus {
  status: 'regular' | 'erev_shabbat' | 'shabbat';
  is_erev_shabbat: boolean;
  is_shabbat: boolean;
  candle_lighting: string;
  havdalah: string;
  parasha: string;
  parasha_he: string;
  timezone?: string;
}

interface ShabbatEveSectionProps {
  defaultCity?: string;
  defaultState?: string;
  onNavigate?: (route: string) => void;
}

interface QuickAction {
  id: string;
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  route: string;
}

export const ShabbatEveSection: React.FC<ShabbatEveSectionProps> = ({
  defaultCity = 'New York',
  defaultState = 'NY',
  onNavigate,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();

  const [status, setStatus] = useState<ShabbatStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<string>('');

  const calculateCountdown = useCallback((candleLightingTime: string) => {
    const now = new Date();
    const candleLighting = new Date(candleLightingTime);
    const diff = candleLighting.getTime() - now.getTime();

    if (diff <= 0) return '';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  useEffect(() => {
    loadShabbatData();
  }, []);

  useEffect(() => {
    if (!status?.candle_lighting || !status.is_erev_shabbat) return;

    const interval = setInterval(() => {
      setCountdown(calculateCountdown(status.candle_lighting));
    }, 60000);

    setCountdown(calculateCountdown(status.candle_lighting));

    return () => clearInterval(interval);
  }, [status, calculateCountdown]);

  const loadShabbatData = async () => {
    try {
      setIsLoading(true);
      const response = await judaismService.getShabbatStatus(defaultCity, defaultState) as { data?: ShabbatStatus };
      if (response?.data) {
        setStatus(response.data);
      }
    } catch (err) {
      console.error('Failed to load Shabbat data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      const date = new Date(timeStr);
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: status?.timezone || 'America/New_York',
      };
      return date.toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', options);
    } catch {
      return timeStr;
    }
  };

  const getParasha = () => {
    if (!status?.parasha) return '';
    return i18n.language === 'he' ? status.parasha_he : status.parasha;
  };

  // Quick action buttons for Shabbat
  const quickActions: QuickAction[] = [
    {
      id: 'music',
      emoji: '🎵',
      label: t('judaism.erevShabbat.shabbatSongs', 'Shabbat Songs'),
      color: colors.warning,
      bgColor: 'rgba(245, 158, 11, 0.2)',
      route: 'Judaism?category=music',
    },
    {
      id: 'parasha',
      emoji: '📖',
      label: t('judaism.erevShabbat.parashaStudy', 'Parasha'),
      color: colors.primaryLight,
      bgColor: 'rgba(192, 132, 252, 0.2)',
      route: 'Judaism?category=shiurim',
    },
    {
      id: 'recipes',
      emoji: '🍽️',
      label: t('judaism.erevShabbat.shabbatRecipes', 'Recipes'),
      color: colors.success,
      bgColor: 'rgba(16, 185, 129, 0.2)',
      route: 'Judaism?category=holidays',
    },
    {
      id: 'tefila',
      emoji: '✨',
      label: t('judaism.erevShabbat.prayers', 'Prayers'),
      color: colors.primary,
      bgColor: 'rgba(126, 34, 206, 0.2)',
      route: 'Judaism?category=tefila',
    },
  ];

  const handleActionPress = (action: QuickAction) => {
    if (onNavigate) {
      onNavigate(action.route);
    }
  };

  if (isLoading) return null;
  if (!status?.is_erev_shabbat) return null;

  return (
    <View style={styles.container}>
      <GlassView style={styles.section} intensity="medium">
        {/* Gradient overlay */}
        <View style={styles.gradientOverlay} />

        {/* Decorative Star of David */}
        <Text style={styles.decorativeStar}>✡</Text>

        <View style={[styles.content, isRTL && styles.contentRTL]}>
          {/* Top Row: Title and Countdown */}
          <View style={[styles.topRow, isRTL && styles.topRowRTL]}>
            {/* Left: Title with icons */}
            <View style={[styles.titleSection, isRTL && styles.titleSectionRTL]}>
              <View style={styles.candlesContainer}>
                <Text style={styles.candleEmoji}>🕯️</Text>
                <Text style={[styles.candleEmoji, styles.candleOffset]}>🕯️</Text>
              </View>
              <View>
                <Text style={styles.title}>
                  {t('judaism.erevShabbat.title', 'Erev Shabbat')}
                </Text>
                <Text style={styles.greeting}>
                  {t('judaism.erevShabbat.shabbatShalom', 'Shabbat Shalom!')} 🍞
                </Text>
              </View>
            </View>

            {/* Right: Countdown Timer */}
            {countdown && (
              <View style={styles.countdownBox}>
                <View style={[styles.countdownHeader, isRTL && styles.countdownHeaderRTL]}>
                  <Text style={styles.clockEmoji}>⏰</Text>
                  <Text style={styles.countdownLabel}>
                    {t('judaism.erevShabbat.timeUntil', 'Time until Shabbat')}
                  </Text>
                </View>
                <Text style={styles.countdownTime}>
                  {countdown}
                </Text>
              </View>
            )}
          </View>

          {/* Parasha Banner */}
          {getParasha() && (
            <View style={styles.parashaBanner}>
              <View style={[styles.parashaContent, isRTL && styles.parashaContentRTL]}>
                <Text style={styles.bookEmoji}>📖</Text>
                <View style={styles.parashaTextContainer}>
                  <Text style={styles.parashaLabel}>
                    {t('judaism.shabbat.parashat', 'Parashat')}
                  </Text>
                  <Text style={styles.parashaName}>
                    {getParasha()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Shabbat Times Row */}
          <View style={[styles.timesRow, isRTL && styles.timesRowRTL]}>
            {/* Candle Lighting */}
            <View style={[styles.timeCard, styles.candleLightingCard]}>
              <Text style={styles.timeEmoji}>🔥</Text>
              <Text style={styles.timeLabel}>
                {t('judaism.shabbat.candleLighting', 'Candle Lighting')}
              </Text>
              <Text style={styles.timeValue}>
                {formatTime(status.candle_lighting)}
              </Text>
              <Text style={styles.dayLabel}>
                {t('judaism.shabbat.friday', 'Friday')}
              </Text>
            </View>

            {/* Havdalah */}
            <View style={[styles.timeCard, styles.havdalahCard]}>
              <Text style={styles.timeEmoji}>🌙</Text>
              <Text style={styles.timeLabel}>
                {t('judaism.shabbat.havdalah', 'Havdalah')}
              </Text>
              <Text style={styles.timeValue}>
                {formatTime(status.havdalah)}
              </Text>
              <Text style={styles.dayLabel}>
                {t('judaism.shabbat.saturday', 'Saturday')}
              </Text>
            </View>
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.actionsSection}>
            <Text style={[styles.actionsLabel, isRTL && styles.actionsLabelRTL]}>
              {t('judaism.erevShabbat.prepareFor', 'Prepare for Shabbat')}
            </Text>
            <View style={[styles.actionsGrid, isRTL && styles.actionsGridRTL]}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  onPress={() => handleActionPress(action)}
                  style={styles.actionButtonWrapper}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.actionButton,
                      { backgroundColor: action.bgColor, borderColor: `${action.color}4D` },
                    ]}
                  >
                    <Text style={styles.actionEmoji}>{action.emoji}</Text>
                    <Text style={styles.actionLabel} numberOfLines={1}>
                      {action.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  section: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  decorativeStar: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.xl * 2,
    fontSize: 80,
    opacity: 0.1,
    color: colors.text,
  },
  content: {
    padding: isTV ? spacing.xl : spacing.lg,
    position: 'relative',
  },
  contentRTL: {
    writingDirection: 'rtl',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  topRowRTL: {
    flexDirection: 'row-reverse',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleSectionRTL: {
    flexDirection: 'row-reverse',
  },
  candlesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  candleEmoji: {
    fontSize: isTV ? 56 : 48,
  },
  candleOffset: {
    marginLeft: -8,
  },
  title: {
    fontSize: isTV ? fontSize.xl * 1.5 : fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  greeting: {
    fontSize: isTV ? fontSize.lg : fontSize.md,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  countdownBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  countdownHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  clockEmoji: {
    fontSize: 16,
  },
  countdownLabel: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.warning,
    fontWeight: '500',
  },
  countdownTime: {
    fontSize: isTV ? fontSize.xl * 1.5 : fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  parashaBanner: {
    backgroundColor: 'rgba(126, 34, 206, 0.2)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(126, 34, 206, 0.3)',
  },
  parashaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  parashaContentRTL: {
    flexDirection: 'row-reverse',
  },
  bookEmoji: {
    fontSize: isTV ? 28 : 24,
  },
  parashaTextContainer: {
    alignItems: 'center',
  },
  parashaLabel: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.primaryLight,
  },
  parashaName: {
    fontSize: isTV ? fontSize.xl : fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  timesRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  timesRowRTL: {
    flexDirection: 'row-reverse',
  },
  timeCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  candleLightingCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  havdalahCard: {
    backgroundColor: 'rgba(126, 34, 206, 0.15)',
    borderColor: 'rgba(126, 34, 206, 0.3)',
  },
  timeEmoji: {
    fontSize: isTV ? 36 : 32,
    marginBottom: spacing.sm,
  },
  timeLabel: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.primaryLight,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  timeValue: {
    fontSize: isTV ? fontSize.xl : fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dayLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actionsSection: {
    marginTop: spacing.sm,
  },
  actionsLabel: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  actionsLabelRTL: {
    textAlign: 'right',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionsGridRTL: {
    flexDirection: 'row-reverse',
  },
  actionButtonWrapper: {
    flex: 1,
  },
  actionButton: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionEmoji: {
    fontSize: isTV ? 28 : 24,
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: isTV ? fontSize.sm : fontSize.xs,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ShabbatEveSection;
