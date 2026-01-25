/**
 * SubscriptionScreenMobile - Mobile-optimized subscription management
 *
 * Features:
 * - Current plan display
 * - Available subscription plans
 * - Plan comparison and selection
 * - Subscription management (cancel/upgrade)
 * - RTL support
 * - Pull-to-refresh
 * - Haptic feedback
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { GlassView, GlassButton } from '@bayit/shared';
import { useDirection } from '@bayit/shared-hooks';
import { useAuthStore } from '@bayit/shared-stores';
import { subscriptionService } from '@bayit/shared-services';
import { spacing, colors, borderRadius } from '@olorin/design-tokens';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('SubscriptionScreenMobile');

interface SubscriptionPlan {
  id: string;
  name: string;
  nameKey: string;
  price: string;
  priceKey: string;
  period: string;
  features: string[];
  recommended: boolean;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    nameKey: 'subscription.plans.basic.name',
    price: '₪29.90',
    priceKey: 'subscription.plans.basic.price',
    period: '/month',
    features: [
      'subscription.plans.basic.feature1',
      'subscription.plans.basic.feature2',
      'subscription.plans.basic.feature3',
    ],
    recommended: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    nameKey: 'subscription.plans.premium.name',
    price: '₪49.90',
    priceKey: 'subscription.plans.premium.price',
    period: '/month',
    features: [
      'subscription.plans.premium.feature1',
      'subscription.plans.premium.feature2',
      'subscription.plans.premium.feature3',
      'subscription.plans.premium.feature4',
    ],
    recommended: true,
  },
  {
    id: 'family',
    name: 'Family',
    nameKey: 'subscription.plans.family.name',
    price: '₪79.90',
    priceKey: 'subscription.plans.family.price',
    period: '/month',
    features: [
      'subscription.plans.family.feature1',
      'subscription.plans.family.feature2',
      'subscription.plans.family.feature3',
      'subscription.plans.family.feature4',
      'subscription.plans.family.feature5',
    ],
    recommended: false,
  },
];

export const SubscriptionScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, textAlign } = useDirection();
  const { user } = useAuthStore();
  const notifications = useNotifications();

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentPlan = user?.subscription?.plan?.toLowerCase();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    ReactNativeHapticFeedback.trigger('impactLight');
    // Refresh user subscription data
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  const handleSelectPlan = useCallback(async (planId: string) => {
    if (planId === currentPlan) return;

    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('Subscribe', { plan: planId });
  }, [currentPlan, navigation]);

  const handleCancelSubscription = useCallback(() => {
    ReactNativeHapticFeedback.trigger('notificationWarning');

    notifications.show({
      level: 'warning',
      title: t('subscription.cancelConfirmTitle'),
      message: t('subscription.cancelConfirmMessage'),
      dismissable: true,
      action: {
        label: t('subscription.confirmCancel'),
        type: 'action',
        onPress: async () => {
          try {
            setIsLoading(true);
            await subscriptionService.cancelSubscription();
            notifications.showSuccess(
              t('subscription.cancelledMessage'),
              t('subscription.cancelledTitle')
            );
          } catch (error) {
            moduleLogger.error('Failed to cancel subscription:', error);
            notifications.showError(t('subscription.cancelError'), t('common.error'));
          } finally {
            setIsLoading(false);
          }
        },
      },
    });
  }, [t, notifications]);

  const renderCurrentPlan = () => {
    if (!user?.subscription) {
      return (
        <GlassView style={styles.noPlanCard}>
          <Text style={styles.noPlanIcon}>📺</Text>
          <Text style={[styles.noPlanText, { textAlign }]}>
            {t('subscription.noActivePlan')}
          </Text>
          <Text style={[styles.noPlanHint, { textAlign }]}>
            {t('subscription.choosePlanHint')}
          </Text>
        </GlassView>
      );
    }

    return (
      <GlassView style={styles.currentPlanCard}>
        <View style={[styles.currentPlanHeader, isRTL && styles.headerRTL]}>
          <View style={styles.currentPlanInfo}>
            <Text style={[styles.currentPlanName, { textAlign }]}>
              {user.subscription.plan}
            </Text>
            <Text style={[styles.currentPlanStatus, { textAlign }]}>
              {t('subscription.status')}: {user.subscription.status}
            </Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>
              {t('subscription.active')}
            </Text>
          </View>
        </View>
        {user.subscription.end_date && (
          <Text style={[styles.renewalDate, { textAlign }]}>
            {t('subscription.renewsOn')} {user.subscription.end_date}
          </Text>
        )}
      </GlassView>
    );
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = currentPlan === plan.id;

    return (
      <View
        key={plan.id}
        style={[
          styles.planCard,
          plan.recommended && styles.planCardRecommended,
          isCurrentPlan && styles.planCardCurrent,
        ]}
      >
        {plan.recommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>
              {t('subscription.recommended')}
            </Text>
          </View>
        )}

        <Text style={[styles.planName, { textAlign }]}>
          {t(plan.nameKey, plan.name)}
        </Text>
        <View style={[styles.priceRow, isRTL && styles.priceRowRTL]}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          <Text style={styles.planPeriod}>{plan.period}</Text>
        </View>

        <View style={styles.featuresList}>
          {plan.features.map((feature, index) => (
            <View key={index} style={[styles.featureRow, isRTL && styles.featureRowRTL]}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={[styles.featureText, { textAlign }]}>
                {t(feature)}
              </Text>
            </View>
          ))}
        </View>

        <GlassButton
          title={isCurrentPlan ? t('subscription.currentPlan') : t('subscription.selectPlan')}
          onPress={() => handleSelectPlan(plan.id)}
          variant={plan.recommended ? 'primary' : 'secondary'}
          disabled={isCurrentPlan}
          style={styles.selectButton}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.DEFAULT}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>{isRTL ? '‹' : '›'}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { textAlign }]}>
            {t('subscription.title')}
          </Text>
        </View>

        {/* Current Plan */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('subscription.currentPlan')}
          </Text>
          {renderCurrentPlan()}
        </View>

        {/* Available Plans */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('subscription.availablePlans')}
          </Text>
          <Text style={[styles.sectionSubtitle, { textAlign }]}>
            {t('subscription.choosePlan')}
          </Text>

          <View style={styles.plansContainer}>
            {SUBSCRIPTION_PLANS.map(renderPlanCard)}
          </View>
        </View>

        {/* Cancel Subscription */}
        {user?.subscription && (
          <View style={styles.section}>
            <GlassView style={styles.cancelSection}>
              <Text style={[styles.cancelTitle, { textAlign }]}>
                {t('subscription.manageSubscription')}
              </Text>
              <TouchableOpacity
                onPress={handleCancelSubscription}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>
                  {t('subscription.cancelSubscription')}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.cancelNote, { textAlign }]}>
                {t('subscription.cancelNote')}
              </Text>
            </GlassView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 32,
    color: colors.text,
    fontWeight: '300',
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  currentPlanCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(107, 33, 168, 0.1)',
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  currentPlanStatus: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  activeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  activeBadgeText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  renewalDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  noPlanCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  noPlanIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  noPlanText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  noPlanHint: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  plansContainer: {
    gap: spacing.md,
  },
  planCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  planCardRecommended: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(107, 33, 168, 0.15)',
  },
  planCardCurrent: {
    borderColor: '#22c55e',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  recommendedText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  priceRowRTL: {
    flexDirection: 'row-reverse',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary.DEFAULT,
  },
  planPeriod: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  featuresList: {
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureRowRTL: {
    flexDirection: 'row-reverse',
  },
  featureCheck: {
    fontSize: 16,
    color: '#22c55e',
    marginRight: spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  selectButton: {
    marginTop: spacing.sm,
  },
  cancelSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  cancelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  cancelButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
  cancelNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

export default SubscriptionScreenMobile;
