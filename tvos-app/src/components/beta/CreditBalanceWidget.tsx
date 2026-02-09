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
  Animated,
} from 'react-native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { GlassView } from '@bayit/shared';
import { colors } from '@olorin/design-tokens';
import { httpClient } from '../../services/httpClient';
import { logger } from '../../utils/logger';
import styles, { TV_FOCUS_SCALE } from './styles/CreditBalanceWidget.styles';

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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await httpClient.get<CreditBalance>(
          `/beta/credits/balance/${userId}`
        );
        setBalance(response.data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Failed to fetch credit balance', {
          module: 'CreditBalanceWidget', userId, error: message,
        });
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: buttonFocused ? TV_FOCUS_SCALE : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [buttonFocused, scaleAnim]);

  const usagePercentage = useMemo(() => {
    if (!balance) return 0;
    return (balance.used_credits / balance.total_credits) * 100;
  }, [balance]);

  const statusStyle = useMemo(() => {
    if (!balance) return styles.statusGray;
    if (balance.is_critical) return styles.statusRed;
    if (balance.is_low) return styles.statusAmber;
    return styles.statusGreen;
  }, [balance]);

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
          <GlassLoadingSpinner size="large" />
          <Text style={styles.loadingText}>{t('beta.credits.loading')}</Text>
        </View>
      </GlassView>
    );
  }

  if (error || !balance) {
    return (
      <GlassView style={[styles.container, containerStyle]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('beta.credits.error')}</Text>
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
      <View style={styles.header}>
        <Text style={styles.labelText}>{t('beta.credits.label')}</Text>
        <View style={[styles.statusIndicator, statusStyle]} />
      </View>

      <View style={styles.creditDisplay}>
        <View style={styles.creditRow}>
          <Text style={styles.creditAmount} accessible={true}
            accessibilityLabel={`${balance.remaining_credits} ${t('beta.credits.remaining')}`}
            allowFontScaling={true}>
            {balance.remaining_credits.toLocaleString()}
          </Text>
          <Text style={styles.creditTotal} allowFontScaling={true}>
            / {balance.total_credits.toLocaleString()}
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[styles.progressBar, { width: `${100 - usagePercentage}%`, backgroundColor: progressBarColor }]}
            accessible={true} accessibilityRole="progressbar"
            accessibilityLabel={`${balance.remaining_credits} ${t('beta.credits.remaining')} out of ${balance.total_credits}`}
          />
        </View>
      </View>

      {balance.is_critical && (
        <View style={[styles.warningContainer, styles.warningCritical]} accessible={true} accessibilityRole="alert">
          <Text style={[styles.warningText, styles.warningTextCritical]}>
            {t('beta.credits.warningCritical')}
          </Text>
        </View>
      )}

      {balance.is_low && !balance.is_critical && (
        <View style={[styles.warningContainer, styles.warningLow]} accessible={true} accessibilityRole="alert">
          <Text style={[styles.warningText, styles.warningTextLow]}>
            {t('beta.credits.warningLow')}
          </Text>
        </View>
      )}

      {balance.remaining_credits === 0 && (
        <View style={styles.upgradeButtonContainer}>
          <Pressable
            onPress={() => navigation.navigate('Upgrade' as never)}
            onFocus={() => setButtonFocused(true)}
            onBlur={() => setButtonFocused(false)}
            hasTVPreferredFocus={hasTVPreferredFocus}
            accessible={true} accessibilityRole="button"
            accessibilityLabel={t('beta.credits.upgradeAction')}
            accessibilityHint="Select to upgrade your plan"
          >
            <Animated.View
              style={[styles.upgradeButton, buttonFocused && styles.upgradeButtonFocused, { transform: [{ scale: scaleAnim }] }]}
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
