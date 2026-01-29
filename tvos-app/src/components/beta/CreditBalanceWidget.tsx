/**
 * Credit Balance Widget - tvOS Platform (Apple TV)
 *
 * Displays beta user's AI credit balance with real-time updates.
 * Uses StyleSheet + Glass components with focus navigation support.
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { GlassView } from '@bayit/shared';
import { colors, spacing } from '@olorin/design-tokens';

interface CreditBalanceWidgetProps {
  userId: string;
  containerStyle?: any;
  hasTVPreferredFocus?: boolean;
}

interface CreditBalance {
  remaining_credits: number;
  total_credits: number;
  used_credits: number;
  is_low: boolean;
  is_critical: boolean;
}

// TV focus configuration
const TV_FOCUS_SCALE = 1.1;
const TV_FOCUS_BORDER_WIDTH = 4;
const TV_FOCUS_BORDER_COLOR = '#A855F7'; // Purple

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[6],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  labelText: {
    color: colors.white,
    fontSize: 28, // 10-foot UI
    fontWeight: '600',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusGreen: {
    backgroundColor: '#10B981',
  },
  statusAmber: {
    backgroundColor: '#F59E0B',
  },
  statusRed: {
    backgroundColor: '#EF4444',
  },
  statusGray: {
    backgroundColor: '#6B7280',
  },
  creditDisplay: {
    marginBottom: spacing[4],
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[3],
  },
  creditAmount: {
    color: colors.white,
    fontSize: 48, // Large for 10-foot viewing
    fontWeight: 'bold',
  },
  creditTotal: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 24,
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: spacing[4],
    marginBottom: spacing[6],
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderRadius: 12,
    marginBottom: spacing[6],
  },
  warningCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  warningLow: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  warningText: {
    fontSize: 24, // 10-foot UI
    fontWeight: '600',
  },
  warningTextCritical: {
    color: '#FCA5A5',
  },
  warningTextLow: {
    color: '#FCD34D',
  },
  upgradeButtonContainer: {
    marginTop: spacing[4],
  },
  upgradeButton: {
    backgroundColor: '#A855F7',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  upgradeButtonFocused: {
    borderWidth: TV_FOCUS_BORDER_WIDTH,
    borderColor: TV_FOCUS_BORDER_COLOR,
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 24,
    marginTop: spacing[4],
  },
  errorContainer: {
    paddingVertical: spacing[8],
  },
  errorText: {
    color: '#F87171',
    fontSize: 24,
  },
});

export const CreditBalanceWidget: React.FC<CreditBalanceWidgetProps> = ({
  userId,
  containerStyle,
  hasTVPreferredFocus = false,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buttonFocused, setButtonFocused] = useState(false);

  // Focus animations for upgrade button
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Fetch credit balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch(`/api/v1/beta/credits/balance/${userId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch balance');
        }

        const data = await response.json();
        setBalance(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Animate upgrade button focus
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: buttonFocused ? TV_FOCUS_SCALE : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [buttonFocused, scaleAnim]);

  // Calculate usage percentage
  const usagePercentage = useMemo(() => {
    if (!balance) return 0;
    return (balance.used_credits / balance.total_credits) * 100;
  }, [balance]);

  // Determine status color style
  const statusStyle = useMemo(() => {
    if (!balance) return styles.statusGray;
    if (balance.is_critical) return styles.statusRed;
    if (balance.is_low) return styles.statusAmber;
    return styles.statusGreen;
  }, [balance]);

  // Determine progress bar color
  const progressBarColor = useMemo(() => {
    if (!balance) return '#6B7280';
    if (balance.is_critical) return '#EF4444';
    if (balance.is_low) return '#F59E0B';
    return '#10B981';
  }, [balance]);

  if (loading) {
    return (
      <GlassView style={[styles.container, containerStyle]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.loadingText}>
            {t('beta.credits.loading')}
          </Text>
        </View>
      </GlassView>
    );
  }

  if (error || !balance) {
    return (
      <GlassView style={[styles.container, containerStyle]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {t('beta.credits.error')}
          </Text>
        </View>
      </GlassView>
    );
  }

  return (
    <GlassView
      style={[styles.container, containerStyle]}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={t('beta.credits.label')}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.labelText}>
          {t('beta.credits.label')}
        </Text>
        <View style={[styles.statusIndicator, statusStyle]} />
      </View>

      {/* Credit Display */}
      <View style={styles.creditDisplay}>
        <View style={styles.creditRow}>
          <Text
            style={styles.creditAmount}
            accessible={true}
            accessibilityLabel={`${balance.remaining_credits} ${t('beta.credits.remaining')}`}
            allowFontScaling={true}
          >
            {balance.remaining_credits.toLocaleString()}
          </Text>
          <Text style={styles.creditTotal} allowFontScaling={true}>
            / {balance.total_credits.toLocaleString()}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${100 - usagePercentage}%`,
                backgroundColor: progressBarColor,
              },
            ]}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel={`${balance.remaining_credits} ${t('beta.credits.remaining')} out of ${balance.total_credits}`}
          />
        </View>
      </View>

      {/* Warning States */}
      {balance.is_critical && (
        <View
          style={[styles.warningContainer, styles.warningCritical]}
          accessible={true}
          accessibilityRole="alert"
        >
          <Text style={[styles.warningText, styles.warningTextCritical]}>
            🚨 {t('beta.credits.warningCritical')}
          </Text>
        </View>
      )}

      {balance.is_low && !balance.is_critical && (
        <View
          style={[styles.warningContainer, styles.warningLow]}
          accessible={true}
          accessibilityRole="alert"
        >
          <Text style={[styles.warningText, styles.warningTextLow]}>
            ⚠️ {t('beta.credits.warningLow')}
          </Text>
        </View>
      )}

      {/* Upgrade Button (when depleted) - Focusable for TV remote */}
      {balance.remaining_credits === 0 && (
        <View style={styles.upgradeButtonContainer}>
          <Pressable
            onPress={() => navigation.navigate('Upgrade' as never)}
            onFocus={() => setButtonFocused(true)}
            onBlur={() => setButtonFocused(false)}
            hasTVPreferredFocus={hasTVPreferredFocus}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('beta.credits.upgradeAction')}
            accessibilityHint="Select to upgrade your plan"
          >
            <Animated.View
              style={[
                styles.upgradeButton,
                buttonFocused && styles.upgradeButtonFocused,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Text style={styles.upgradeButtonText} allowFontScaling={true}>
                {t('beta.credits.upgrade')}
              </Text>
            </Animated.View>
          </Pressable>
        </View>
      )}
    </GlassView>
  );
};
