import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/authStore';
import { subscriptionService } from '@/services/api';
import { sanitizeI18n } from '@/utils/security/sanitizeI18n';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassButton } from '@bayit/shared/ui';
import { BillingToggle } from './components/BillingToggle';
import { EnhancedPlanCard } from './components/EnhancedPlanCard';
import { EnhancedComparisonTable } from './components/EnhancedComparisonTable';
import { PremiumFeaturesShowcase } from './components/PremiumFeaturesShowcase';
import logger from '@/utils/logger';

const plansConfig = [
  { id: 'basic', price: '$9.99', popular: false },
  { id: 'premium', price: '$14.99', popular: true },
  { id: 'family', price: '$19.99', popular: false },
];

export default function SubscribePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

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

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <View style={styles.backgroundGradient}>
        <LinearGradient
          colors={[
            'rgba(168, 85, 247, 0.15)',
            'rgba(139, 92, 246, 0.1)',
            'rgba(0, 0, 0, 0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Content Container */}
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            {sanitizeI18n(t('subscribe.title'))}
          </Text>
          <Text style={styles.heroSubtitle}>
            {sanitizeI18n(t('subscribe.subtitle'))}
          </Text>
        </View>

        {/* Billing Toggle */}
        <View style={styles.billingSection}>
          <BillingToggle billingPeriod={billingPeriod} onToggle={setBillingPeriod} />
        </View>

        {/* Plan Cards Grid */}
        <View style={styles.planCardsGrid}>
          {plansConfig.map((plan) => (
            <EnhancedPlanCard
              key={plan.id}
              planId={plan.id}
              price={plan.price}
              isPopular={plan.popular}
              isSelected={selectedPlan === plan.id}
              onSelect={() => setSelectedPlan(plan.id)}
              billingPeriod={billingPeriod}
            />
          ))}
        </View>

        {/* Premium Features Showcase */}
        <PremiumFeaturesShowcase />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Comparison Table */}
        <View style={styles.comparisonSection}>
          <EnhancedComparisonTable />
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <GlassButton
            title={
              loading
                ? sanitizeI18n(t('subscribe.processing'))
                : sanitizeI18n(t('subscribe.startTrial'))
            }
            onPress={handleSubscribe}
            disabled={loading}
            variant="primary"
            style={styles.ctaButton}
          />
          <Text style={styles.ctaDisclaimer}>
            {sanitizeI18n(t('subscribe.noCharge'))}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 600,
    pointerEvents: 'none',
    zIndex: 0,
  },
  content: {
    width: '100%',
    maxWidth: 1280,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.xl * 2,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: spacing.md,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    maxWidth: 600,
    textAlign: 'center',
    lineHeight: 28,
  },
  billingSection: {
    marginBottom: spacing.xl * 2,
    alignItems: 'center',
    width: '100%',
  },
  planCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl * 3,
    width: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    maxWidth: 800,
    marginBottom: spacing.xl * 3,
    width: '100%',
  },
  comparisonSection: {
    marginBottom: spacing.xl * 3,
    width: '100%',
  },
  ctaSection: {
    alignItems: 'center',
    marginBottom: spacing.xl * 2,
    width: '100%',
  },
  ctaButton: {
    paddingHorizontal: spacing.xl * 2,
    paddingVertical: spacing.lg,
    minWidth: 280,
  },
  ctaDisclaimer: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
