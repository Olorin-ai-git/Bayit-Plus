import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles, Crown } from 'lucide-react';
import { useDirection } from '@/hooks/useDirection';
import { sanitizeI18n } from '@/utils/security/sanitizeI18n';
import { validatePlanFeatures } from '@/utils/security/validationSchemas';
import { PlanFeatureRow } from './PlanFeatureRow';
import { PLAN_FEATURES } from '../../../../../shared/data/planFeatures';
import { PlanTier, FeatureCategory } from '../../../../../shared/types/subscription';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const PLAN_TIERS: PlanTier[] = [
  PlanTier.REGISTERED_FREE,
  PlanTier.BASIC,
  PlanTier.PREMIUM,
  PlanTier.FAMILY,
];

const CATEGORY_ORDER: FeatureCategory[] = [
  'content',
  'quality',
  'devices',
  'features',
  'support',
];

export function EnhancedComparisonTable() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  // Validate plan features
  React.useEffect(() => {
    if (!validatePlanFeatures(PLAN_FEATURES)) {
      logger.error('Plan features validation failed', 'EnhancedComparisonTable');
    }
  }, []);

  // Group features by category
  const featuresByCategory = useMemo(() => {
    const grouped: Record<FeatureCategory, typeof PLAN_FEATURES> = {
      content: [],
      quality: [],
      devices: [],
      features: [],
      support: [],
    };

    PLAN_FEATURES.forEach((feature) => {
      grouped[feature.category].push(feature);
    });

    return grouped;
  }, []);

  const getTierName = (tier: PlanTier): string => {
    const key =
      tier === PlanTier.NON_REGISTERED
        ? 'plans.non_registered.name'
        : tier === PlanTier.REGISTERED_FREE
        ? 'plans.registered_free.name'
        : `plans.${tier}.name`;
    return sanitizeI18n(t(key));
  };

  const getTierPrice = (tier: PlanTier): string | null => {
    const prices = {
      [PlanTier.BASIC]: '$9.99',
      [PlanTier.PREMIUM]: '$14.99',
      [PlanTier.FAMILY]: '$19.99',
    };
    return prices[tier] || null;
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {sanitizeI18n(t('plans.comparison.title'))}
        </Text>
        <Text style={styles.sectionSubtitle}>
          {sanitizeI18n(t('plans.comparison.subtitle'))}
        </Text>
      </View>

      {/* Table Container */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.table}>
          {/* Table Header Row */}
          <View style={styles.headerRow}>
            {/* Feature Column Header */}
            <View style={styles.featureHeaderCell}>
              <Text style={styles.featureHeaderText}>
                {sanitizeI18n(t('subscribe.comparison.features'))}
              </Text>
            </View>

            {/* Plan Tier Headers */}
            {PLAN_TIERS.map((tier) => {
              const isPremium = tier === PlanTier.PREMIUM;
              const price = getTierPrice(tier);

              return (
                <View
                  key={tier}
                  style={[
                    styles.tierHeaderCell,
                    isPremium && styles.tierHeaderCellPremium,
                  ]}
                >
                  {isPremium && (
                    <View style={styles.premiumBadge}>
                      <Crown size={12} color={colors.warning.DEFAULT} />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.tierName,
                      isPremium && styles.tierNamePremium,
                    ]}
                  >
                    {getTierName(tier)}
                  </Text>
                  {price && (
                    <Text style={styles.tierPrice}>
                      {price}
                      <Text style={styles.tierPricePeriod}>
                        {sanitizeI18n(t('subscribe.comparison.perMonth'))}
                      </Text>
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Feature Rows by Category */}
          {CATEGORY_ORDER.map((category) => {
            const features = featuresByCategory[category];
            if (features.length === 0) return null;

            return (
              <View key={category}>
                {/* Category Header */}
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>
                    {sanitizeI18n(t(`plans.comparison.categories.${category}`))}
                  </Text>
                </View>

                {/* Feature Rows */}
                {features.map((feature) => (
                  <PlanFeatureRow
                    key={feature.id}
                    feature={feature}
                    planTiers={PLAN_TIERS}
                    isRTL={isRTL}
                  />
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Mobile Scroll Hint */}
      <View style={styles.scrollHint}>
        <Text style={styles.scrollHintText}>
          {sanitizeI18n(t('subscribe.comparison.scrollHint'))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 600,
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  table: {
    width: '100%',
    minWidth: 900,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(168, 85, 247, 0.2)',
  },
  featureHeaderCell: {
    flex: 2,
    paddingRight: spacing.md,
    justifyContent: 'flex-end',
  },
  featureHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    position: 'relative',
  },
  tierHeaderCellPremium: {
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
  },
  premiumBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: borderRadius.full,
    padding: 4,
  },
  tierName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  tierNamePremium: {
    color: colors.primary.DEFAULT,
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary.DEFAULT,
  },
  tierPricePeriod: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  categoryHeader: {
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scrollHint: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  scrollHintText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
