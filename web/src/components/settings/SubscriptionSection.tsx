/**
 * SubscriptionSection
 * Subscription management: current plan, upgrade, billing history.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { GlassButton } from '@bayit/shared/ui';
import {
  CreditCard, Crown, Receipt, ArrowUpCircle,
} from 'lucide-react';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { SettingSection } from './shared/SettingSection';
import { SettingRow } from './shared/SettingRow';
import api from '@/services/api';
import logger from '@/utils/logger';

interface SubscriptionInfo {
  plan_name: string;
  status: string;
  renews_at: string | null;
  billing_period: string;
}

export function SubscriptionSection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const data = await api.get('/subscriptions/current');
      setSubscription(data as unknown as SubscriptionInfo);
    } catch (error) {
      logger.error('Failed to load subscription', 'SubscriptionSection', error);
    }
  };

  const planDisplay = subscription?.plan_name ?? t('settings.freePlan', 'Free');
  const statusDisplay = subscription?.status ?? t('settings.active', 'Active');

  return (
    <SettingSection title={t('settings.subscription', 'Subscription')} isRTL={isRTL}>
      <SettingRow
        type="value"
        icon={Crown}
        label={t('settings.currentPlan', 'Current Plan')}
        value={planDisplay}
        isRTL={isRTL}
      />
      <SettingRow
        type="value"
        icon={CreditCard}
        label={t('settings.status', 'Status')}
        value={statusDisplay}
        isRTL={isRTL}
      />
      {subscription?.renews_at && (
        <SettingRow
          type="value"
          label={t('settings.renewsAt', 'Renews At')}
          value={subscription.renews_at}
          isRTL={isRTL}
        />
      )}
      <View style={styles.actions}>
        <GlassButton
          variant="primary"
          size="sm"
          onPress={() => {}}
        >
          <ArrowUpCircle size={14} color={colors.text} />
          <Text style={styles.upgradeText}>
            {t('settings.upgradePlan', 'Upgrade Plan')}
          </Text>
        </GlassButton>
        <GlassButton
          variant="secondary"
          size="sm"
          onPress={() => {}}
        >
          <Receipt size={14} color={colors.textMuted} />
          <Text style={styles.actionText}>
            {t('settings.billingHistory', 'Billing History')}
          </Text>
        </GlassButton>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  upgradeText: {
    color: colors.text,
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  actionText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
});
