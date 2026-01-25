import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useDirection } from '@/hooks/useDirection';
import { sanitizeI18n } from '@/utils/security/sanitizeI18n';
import { validatePlanFeatures } from '@/utils/security/validationSchemas';
import { PlanFeatureRow } from './PlanFeatureRow';
import { PLAN_FEATURES } from '../../../../../shared/data/planFeatures';
import { PlanTier, FeatureCategory } from '../../../../../shared/types/subscription';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import logger from '@/utils/logger';

interface PlanComparisonTableProps {
  onPlanSelect?: (tier: PlanTier) => void;
}

const PLAN_TIERS: PlanTier[] = [
  PlanTier.NON_REGISTERED,
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

export function PlanComparisonTable({ onPlanSelect }: PlanComparisonTableProps) {
  const { t } = useTranslation();
  const { isRTL, flexDirection } = useDirection();

  // Validate plan features at mount
  React.useEffect(() => {
    if (!validatePlanFeatures(PLAN_FEATURES)) {
      logger.error('Plan features validation failed', 'PlanComparisonTable');
    }
  }, []);

  // Memoize features grouped by category
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

  // Memoize plan tier names
  const getTierName = useCallback((tier: PlanTier): string => {
    const key = tier === PlanTier.NON_REGISTERED
      ? 'plans.non_registered.name'
      : tier === PlanTier.REGISTERED_FREE
      ? 'plans.registered_free.name'
      : `plans.${tier}.name`;
    return sanitizeI18n(t(key));
  }, [t]);

  return (
    <View
      style={styles.container}
      role="table"
      aria-label={sanitizeI18n(t('plans.comparison.title'))}
    >
      {/* Horizontal Scroll Container */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.headerRow} role="row">
            {/* Feature Column Header */}
            <View style={[styles.headerCell, styles.featureHeader]}>
              <Text style={styles.headerText}>
                {sanitizeI18n(t('plans.comparison.title'))}
              </Text>
            </View>

            {/* Plan Tier Headers */}
            {PLAN_TIERS.map((tier) => (
              <View
                key={tier}
                style={[
                  styles.headerCell,
                  tier === PlanTier.PREMIUM && styles.headerCellPremium,
                ]}
                role="columnheader"
              >
                <Text style={styles.headerText}>{getTierName(tier)}</Text>
                {tier === PlanTier.PREMIUM && (
                  <View style={styles.premiumBadge}>
                    <Sparkles size={12} color={colors.text} />
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Table Body - Grouped by Category */}
          {CATEGORY_ORDER.map((category) => {
            const features = featuresByCategory[category];
            if (features.length === 0) return null;

            return (
              <View key={category}>
                {/* Category Header */}
                <View style={styles.categoryRow}>
                  <Text style={styles.categoryText}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  table: {
    minWidth: 900,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backdropFilter: 'blur(16px)',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(168, 85, 247, 0.3)',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerCellPremium: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: borderRadius.md,
  },
  featureHeader: {
    flex: 2,
    alignItems: 'flex-start',
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  premiumBadge: {
    marginTop: spacing.xs,
    padding: spacing.xs,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: borderRadius.full,
  },
  categoryRow: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
