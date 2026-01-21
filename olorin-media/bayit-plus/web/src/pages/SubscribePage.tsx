import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useAuthStore } from '@/stores/authStore';
import { subscriptionService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
      style={[styles.planWrapper, plan.popular && styles.planWrapperPopular]}
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
          <View style={styles.priceRow}>
            <Text style={styles.price}>{plan.price}</Text>
            <Text style={styles.period}>{t('subscribe.period')}</Text>
          </View>
          {billingPeriod === 'yearly' && (
            <Text style={styles.yearlyPrice}>${yearlyPrice} {t('subscribe.perYear')}</Text>
          )}
        </View>

        {/* Features */}
        <View style={styles.featuresList}>
          {Array.isArray(features) && features.map((feature, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Check size={12} color={colors.success} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
          {Array.isArray(notIncluded) && notIncluded.map((feature, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={styles.notIncludedLine} />
              <Text style={styles.notIncludedText}>{feature}</Text>
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
      <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
      <View style={[styles.blurCircle, styles.blurCirclePurple]} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('subscribe.title')}</Text>
        <Text style={styles.subtitle}>
          {t('subscribe.subtitle')}
        </Text>
      </View>

      {/* Billing Toggle */}
      <View style={styles.billingToggle}>
        <GlassView style={styles.tabsContainer}>
          <Pressable
            onPress={() => setBillingPeriod('monthly')}
            style={[styles.tab, billingPeriod === 'monthly' && styles.tabActive]}
          >
            <Text style={[styles.tabText, billingPeriod === 'monthly' && styles.tabTextActive]}>
              {t('subscribe.monthly')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setBillingPeriod('yearly')}
            style={[styles.tab, billingPeriod === 'yearly' && styles.tabActive]}
          >
            <Text style={[styles.tabText, billingPeriod === 'yearly' && styles.tabTextActive]}>
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
      <View style={styles.ctaSection}>
        <GlassButton
          title={loading ? t('subscribe.processing') : t('subscribe.startTrial')}
          onPress={handleSubscribe}
          disabled={loading}
          variant="primary"
          style={styles.ctaButton}
        />
        <Text style={styles.ctaNote}>
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
  blurCircle: {
    position: 'absolute',
    borderRadius: 9999,
    // @ts-ignore
    filter: 'blur(100px)',
  },
  blurCirclePrimary: {
    width: 384,
    height: 384,
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  blurCirclePurple: {
    width: 288,
    height: 288,
    bottom: 0,
    left: 0,
    backgroundColor: colors.secondary,
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
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 600,
  },
  billingToggle: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    zIndex: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  tabTextActive: {
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
    color: colors.success,
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
  planWrapper: {
    flex: 1,
    minWidth: 280,
    maxWidth: 360,
  },
  planWrapperPopular: {
    marginTop: -16,
    marginBottom: 16,
  },
  planCard: {
    padding: spacing.lg,
    position: 'relative',
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
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
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
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
    color: colors.text,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
  },
  period: {
    fontSize: 14,
    color: colors.textMuted,
  },
  yearlyPrice: {
    fontSize: 14,
    color: colors.success,
    marginTop: spacing.xs,
  },
  featuresList: {
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  notIncludedLine: {
    width: 20,
    height: 2,
    backgroundColor: colors.glass,
  },
  notIncludedText: {
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    flex: 1,
  },
  selectButton: {
    width: '100%',
  },
  ctaSection: {
    alignItems: 'center',
    zIndex: 10,
  },
  ctaButton: {
    paddingHorizontal: spacing.xl * 1.5,
    paddingVertical: spacing.md,
  },
  ctaNote: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
