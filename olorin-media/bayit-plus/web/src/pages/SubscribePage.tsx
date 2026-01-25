import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useAuthStore } from '@/stores/authStore';
import { subscriptionService } from '@/services/api';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassView } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface Plan {
  id: string;
  price: string;
  popular?: boolean;
}

const plansConfig: Plan[] = [
  {
    id: 'basic',
    price: '$9.99',
  },
  {
    id: 'premium',
    price: '$14.99',
    popular: true,
  },
  {
    id: 'family',
    price: '$19.99',
  },
];

function PlanCard({ planId, isSelected, onSelect, billingPeriod }: {
  planId: string;
  isSelected: boolean;
  onSelect: () => void;
  billingPeriod: 'monthly' | 'yearly';
}) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const plan = plansConfig.find(p => p.id === planId);

  if (!plan) return null;

  const planKey = `plans.${planId}`;
  const name = t(`${planKey}.name`);
  const features = t(`${planKey}.features`, [], { returnObjects: true });
  const notIncluded = t(`${planKey}.notIncluded`, [], { returnObjects: true });

  const yearlyPrice = (parseFloat(plan.price.slice(1)) * 10).toFixed(2);

  return (
    <Pressable
      onPress={onSelect}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.planCardContainer,
        plan.popular && styles.planCardContainerPopular,
      ]}
    >
      <GlassCard
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
          isHovered && styles.planCardHovered,
        ]}
      >
        {/* Popular Badge */}
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Sparkles size={14} color={colors.text} />
            <Text style={styles.popularBadgeText}>{t('subscribe.popular')}</Text>
          </View>
        )}

        {/* Plan Header */}
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>{plan.price}</Text>
            <Text style={styles.pricePeriod}>{t('subscribe.period')}</Text>
          </View>
          {billingPeriod === 'yearly' && (
            <Text style={styles.yearlyPrice}>${yearlyPrice} {t('subscribe.perYear')}</Text>
          )}
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {Array.isArray(features) && features.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Check size={12} color={colors.success} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
          {Array.isArray(notIncluded) && notIncluded.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureLineThrough} />
              <Text style={styles.featureTextNotIncluded}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Select Button */}
        <GlassButton
          title={isSelected ? t('subscribe.selected') : t('subscribe.select')}
          onPress={onSelect}
          variant={isSelected ? 'primary' : 'secondary'}
          style={styles.selectButton}
        />
      </GlassCard>
    </Pressable>
  );
}

export default function SubscribePage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
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
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Decorative blur circles */}
      <View style={styles.blurCircleTop} />
      <View style={styles.blurCircleBottom} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('subscribe.title')}</Text>
        <Text style={styles.subtitle}>
          {t('subscribe.subtitle')}
        </Text>
      </View>

      {/* Billing Toggle */}
      <View style={styles.billingToggleContainer}>
        <GlassView style={styles.billingToggle}>
          <Pressable
            onPress={() => setBillingPeriod('monthly')}
            style={[
              styles.billingOption,
              billingPeriod === 'monthly' && styles.billingOptionSelected,
            ]}
          >
            <Text style={[
              styles.billingOptionText,
              billingPeriod === 'monthly' && styles.billingOptionTextSelected,
            ]}>
              {t('subscribe.monthly')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setBillingPeriod('yearly')}
            style={[
              styles.billingOption,
              billingPeriod === 'yearly' && styles.billingOptionSelected,
            ]}
          >
            <Text style={[
              styles.billingOptionText,
              billingPeriod === 'yearly' && styles.billingOptionTextSelected,
            ]}>
              {t('subscribe.yearly')}
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>{t('subscribe.save2Months')}</Text>
            </View>
          </Pressable>
        </GlassView>
      </View>

      {/* Plans Grid */}
      <View style={styles.plansGrid}>
        {plansConfig.map((plan) => (
          <PlanCard
            key={plan.id}
            planId={plan.id}
            isSelected={selectedPlan === plan.id}
            onSelect={() => setSelectedPlan(plan.id)}
            billingPeriod={billingPeriod}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <GlassButton
          title={loading ? t('subscribe.processing') : t('subscribe.startTrial')}
          onPress={handleSubscribe}
          disabled={loading}
          variant="primary"
          style={styles.ctaButton}
        />
        <Text style={styles.ctaSubtext}>
          {t('subscribe.noCharge')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    // Note: blur filter not supported in RN, keeping for web compatibility
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    zIndex: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    maxWidth: 600,
    color: colors.textMuted,
  },
  billingToggleContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    zIndex: 10,
  },
  billingToggle: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  billingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  billingOptionSelected: {
    backgroundColor: colors.primary.DEFAULT,
  },
  billingOptionText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  billingOptionTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  saveBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success.DEFAULT,
  },
  plansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
    zIndex: 10,
  },
  planCardContainer: {
    flex: 1,
    minWidth: 280,
    maxWidth: 360,
  },
  planCardContainerPopular: {
    marginTop: -16,
    marginBottom: 16,
  },
  planCard: {
    padding: spacing.lg,
    position: 'relative',
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    transform: [{ scale: 1.02 }],
  },
  planCardHovered: {
    transform: [{ scale: 1.01 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondary.DEFAULT,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary.DEFAULT,
  },
  pricePeriod: {
    fontSize: 14,
    color: colors.textMuted,
  },
  yearlyPrice: {
    fontSize: 14,
    marginTop: spacing.xs,
    color: colors.success.DEFAULT,
  },
  featuresContainer: {
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureIconContainer: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    flex: 1,
    color: colors.text,
  },
  featureLineThrough: {
    width: 20,
    height: 2,
    backgroundColor: colors.glass,
  },
  featureTextNotIncluded: {
    fontSize: 14,
    flex: 1,
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  selectButton: {
    width: '100%',
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
