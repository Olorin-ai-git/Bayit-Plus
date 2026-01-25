import React, { useState, useCallback, lazy, Suspense } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Grid, List } from 'lucide-react';
import { useDirection } from '@/hooks/useDirection';
import { useAuthStore } from '@/stores/authStore';
import { subscriptionService } from '@/services/api';
import { sanitizeI18n } from '@/utils/security/sanitizeI18n';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassButton, GlassView } from '@bayit/shared/ui';
import { PlanHeader } from './components/PlanHeader';
import { BillingToggle } from './components/BillingToggle';
import { PlanCard } from './components/PlanCard';
import logger from '@/utils/logger';

// Lazy load comparison table for performance
const PlanComparisonTable = lazy(() =>
  import('./components/PlanComparisonTable').then(module => ({
    default: module.PlanComparisonTable
  }))
);

const plansConfig = [
  { id: 'basic', price: '$9.99' },
  { id: 'premium', price: '$14.99', popular: true },
  { id: 'family', price: '$19.99' },
];

export default function SubscribePage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const handleSubscribe = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/subscribe' } });
      return;
    }

    setLoading(true);
    try {
      const response = await subscriptionService.createCheckout(selectedPlan);
      window.location.href = response.checkoutUrl;
    } catch (error) {
      logger.error('Failed to create checkout', 'SubscribePage', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedPlan, navigate]);

  const handleViewToggle = useCallback((view: 'cards' | 'comparison') => {
    setShowComparison(view === 'comparison');
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Decorative blur circles */}
      <View style={styles.blurCircleTop} />
      <View style={styles.blurCircleBottom} />

      {/* Header */}
      <PlanHeader />

      {/* View Toggle */}
      <View style={styles.viewToggleContainer}>
        <GlassView style={styles.viewToggle}>
          <Pressable
            onPress={() => handleViewToggle('cards')}
            style={[styles.viewOption, !showComparison && styles.viewOptionSelected]}
          >
            <Grid size={16} color={!showComparison ? colors.text : colors.textMuted} />
            <Text style={[styles.viewOptionText, !showComparison && styles.viewOptionTextSelected]}>
              {sanitizeI18n(t('subscribe.viewCards'))}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleViewToggle('comparison')}
            style={[styles.viewOption, showComparison && styles.viewOptionSelected]}
          >
            <List size={16} color={showComparison ? colors.text : colors.textMuted} />
            <Text style={[styles.viewOptionText, showComparison && styles.viewOptionTextSelected]}>
              {sanitizeI18n(t('subscribe.viewComparison'))}
            </Text>
          </Pressable>
        </GlassView>
      </View>

      {/* Billing Toggle */}
      {!showComparison && <BillingToggle billingPeriod={billingPeriod} onToggle={setBillingPeriod} />}

      {/* Content: Cards or Comparison */}
      {showComparison ? (
        <Suspense fallback={<ActivityIndicator size="large" color={colors.primary.DEFAULT} />}>
          <PlanComparisonTable />
        </Suspense>
      ) : (
        <View style={styles.plansGrid}>
          {plansConfig.map((plan) => (
            <PlanCard
              key={plan.id}
              planId={plan.id}
              isSelected={selectedPlan === plan.id}
              onSelect={() => setSelectedPlan(plan.id)}
              billingPeriod={billingPeriod}
              planConfig={plan}
            />
          ))}
        </View>
      )}

      {/* CTA */}
      {!showComparison && (
        <View style={styles.ctaContainer}>
          <GlassButton
            title={loading ? sanitizeI18n(t('subscribe.processing')) : sanitizeI18n(t('subscribe.startTrial'))}
            onPress={handleSubscribe}
            disabled={loading}
            variant="primary"
            style={styles.ctaButton}
          />
          <Text style={styles.ctaSubtext}>{sanitizeI18n(t('subscribe.noCharge'))}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    position: 'relative',
  },
  blurCircleTop: {
    position: 'absolute',
    width: 384,
    height: 384,
    top: 0,
    right: 0,
    borderRadius: 9999,
    backgroundColor: colors.primary.DEFAULT,
    opacity: 0.3,
  },
  blurCircleBottom: {
    position: 'absolute',
    width: 288,
    height: 288,
    bottom: 0,
    left: 0,
    borderRadius: 9999,
    backgroundColor: colors.secondary.DEFAULT,
    opacity: 0.3,
  },
  viewToggleContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    zIndex: 10,
  },
  viewToggle: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  viewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  viewOptionSelected: {
    backgroundColor: colors.primary.DEFAULT,
  },
  viewOptionText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  viewOptionTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  plansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
    zIndex: 10,
  },
  ctaContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  ctaButton: {
    paddingHorizontal: spacing.xl * 1.5,
    paddingVertical: spacing.md,
  },
  ctaSubtext: {
    fontSize: 14,
    marginTop: spacing.md,
    color: colors.textMuted,
  },
});
