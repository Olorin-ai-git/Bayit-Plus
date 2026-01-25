import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sanitizeI18n } from '@/utils/security/sanitizeI18n';
import { PlanFeature, PlanTier, FeatureValue } from '../../../../../shared/types/subscription';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface PlanFeatureRowProps {
  feature: PlanFeature;
  planTiers: PlanTier[];
  isRTL: boolean;
}

function renderFeatureValue(value: FeatureValue): React.ReactNode {
  if (typeof value === 'boolean') {
    if (value) {
      return (
        <View style={styles.iconContainer}>
          <Check size={16} color={colors.success.DEFAULT} />
        </View>
      );
    }
    return (
      <View style={styles.iconContainerNegative}>
        <X size={16} color={colors.error.DEFAULT} />
      </View>
    );
  }

  // String value
  return <Text style={styles.valueText}>{sanitizeI18n(value)}</Text>;
}

function PlanFeatureRowComponent({
  feature,
  planTiers,
  isRTL,
}: PlanFeatureRowProps) {
  const { t } = useTranslation();

  const featureName = sanitizeI18n(t(feature.translationKey));

  return (
    <View
      style={styles.row}
      role="row"
      accessibilityRole="none"
    >
      {/* Feature Name */}
      <View
        style={[styles.featureNameCell, isRTL && styles.featureNameCellRTL]}
        role="cell"
        accessibilityRole="none"
      >
        <Text style={styles.featureName}>{featureName}</Text>
      </View>

      {/* Feature Values for Each Plan Tier */}
      {planTiers.map((tier) => (
        <View
          key={tier}
          style={styles.valueCell}
          role="cell"
          accessibilityRole="none"
          aria-label={`${featureName}: ${feature.availability[tier]}`}
        >
          {renderFeatureValue(feature.availability[tier])}
        </View>
      ))}
    </View>
  );
}

// Memoize for performance
export const PlanFeatureRow = React.memo(PlanFeatureRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  featureNameCell: {
    flex: 2,
    paddingRight: spacing.md,
    justifyContent: 'center',
  },
  featureNameCellRTL: {
    paddingRight: 0,
    paddingLeft: spacing.md,
  },
  featureName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  valueCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerNegative: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
});
