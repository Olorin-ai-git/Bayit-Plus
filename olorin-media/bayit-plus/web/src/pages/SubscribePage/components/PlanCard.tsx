import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { sanitizeI18n } from '@/utils/security/sanitizeI18n';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface PlanConfig {
  id: string;
  price: string;
  popular?: boolean;
}

interface PlanCardProps {
  planId: string;
  isSelected: boolean;
  onSelect: () => void;
  billingPeriod: 'monthly' | 'yearly';
  planConfig: PlanConfig;
}

export function PlanCard({
  planId,
  isSelected,
  onSelect,
  billingPeriod,
  planConfig,
}: PlanCardProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const planKey = `plans.${planId}`;
  const name = t(`${planKey}.name`);
  const features = t(`${planKey}.features`, [], { returnObjects: true });
  const notIncluded = t(`${planKey}.notIncluded`, [], { returnObjects: true });

  const yearlyPrice = (parseFloat(planConfig.price.slice(1)) * 10).toFixed(2);

  // Sanitize translations for security
  const sanitizedName = sanitizeI18n(name);

  return (
    <Pressable
      onPress={onSelect}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.cardContainer,
        planConfig.popular && styles.cardContainerPopular,
      ]}
    >
      <GlassCard
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          isHovered && styles.cardHovered,
        ]}
      >
        {/* Popular Badge */}
        {planConfig.popular && (
          <View style={styles.popularBadge}>
            <Sparkles size={14} color={colors.text} />
            <Text style={styles.popularBadgeText}>
              {sanitizeI18n(t('subscribe.popular'))}
            </Text>
          </View>
        )}

        {/* Plan Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{sanitizedName}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>{planConfig.price}</Text>
            <Text style={styles.pricePeriod}>
              {sanitizeI18n(t('subscribe.period'))}
            </Text>
          </View>
          {billingPeriod === 'yearly' && (
            <Text style={styles.yearlyPrice}>
              ${yearlyPrice} {sanitizeI18n(t('subscribe.perYear'))}
            </Text>
          )}
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {Array.isArray(features) && features.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Check size={12} color={colors.success} />
              </View>
              <Text style={styles.featureText}>{sanitizeI18n(feature)}</Text>
            </View>
          ))}
          {Array.isArray(notIncluded) && notIncluded.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureLineThrough} />
              <Text style={styles.featureTextNotIncluded}>
                {sanitizeI18n(feature)}
              </Text>
            </View>
          ))}
        </View>

        {/* Select Button */}
        <GlassButton
          title={isSelected ? sanitizeI18n(t('subscribe.selected')) : sanitizeI18n(t('subscribe.select'))}
          onPress={onSelect}
          variant={isSelected ? 'primary' : 'secondary'}
          style={styles.selectButton}
        />
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    minWidth: 280,
    maxWidth: 360,
  },
  cardContainerPopular: {
    marginTop: -16,
    marginBottom: 16,
  },
  card: {
    padding: spacing.lg,
    position: 'relative',
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    transform: [{ scale: 1.02 }],
  },
  cardHovered: {
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  name: {
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
});
