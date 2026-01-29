/**
 * Credit Balance Widget - Mobile Platform (iOS/Android)
 *
 * Displays beta user's AI credit balance with real-time updates.
 * Uses StyleSheet + Glass components.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { GlassView, GlassButton } from '@bayit/shared';
import { useDirection } from '@bayit/shared-hooks';
import { colors, spacing } from '@olorin/design-tokens';

interface CreditBalanceWidgetProps {
  userId: string;
  containerStyle?: any;
}

interface CreditBalance {
  remaining_credits: number;
  total_credits: number;
  used_credits: number;
  is_low: boolean;
  is_critical: boolean;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  labelText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    marginBottom: spacing[2],
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  creditAmount: {
    color: colors.white,
    fontSize: 30,
    fontWeight: 'bold',
  },
  creditTotal: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing[4],
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 8,
    marginBottom: spacing[4],
  },
  warningCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  warningLow: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
  },
  warningTextCritical: {
    color: '#FCA5A5',
  },
  warningTextLow: {
    color: '#FCD34D',
  },
  upgradeButton: {
    marginTop: spacing[2],
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing[2],
  },
  errorContainer: {
    paddingVertical: spacing[6],
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
  },
});

export const CreditBalanceWidget: React.FC<CreditBalanceWidgetProps> = ({
  userId,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isRTL } = useDirection();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      accessibilityRole="region"
      accessibilityLabel={t('beta.credits.label')}
    >
      {/* Header */}
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <Text style={styles.labelText}>
          {t('beta.credits.label')}
        </Text>
        <View style={[styles.statusIndicator, statusStyle]} />
      </View>

      {/* Credit Display */}
      <View style={styles.creditDisplay}>
        <View style={[styles.creditRow, isRTL && { flexDirection: 'row-reverse' }]}>
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
          accessibilityLiveRegion="assertive"
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
          accessibilityLiveRegion="polite"
        >
          <Text style={[styles.warningText, styles.warningTextLow]}>
            ⚠️ {t('beta.credits.warningLow')}
          </Text>
        </View>
      )}

      {/* Upgrade Button (when depleted) */}
      {balance.remaining_credits === 0 && (
        <GlassButton
          variant="primary"
          onPress={() => navigation.navigate('Upgrade' as never)}
          style={styles.upgradeButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('beta.credits.upgradeAction')}
        >
          <Text style={{ color: colors.white, fontWeight: '600' }} allowFontScaling={true}>
            {t('beta.credits.upgrade')}
          </Text>
        </GlassButton>
      )}
    </GlassView>
  );
};
