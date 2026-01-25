import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { sanitizeI18n } from '@/utils/security/sanitizeI18n';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface EnhancedPlanCardProps {
  planId: string;
  price: string;
  isPopular?: boolean;
  isSelected: boolean;
  onSelect: () => void;
  billingPeriod: 'monthly' | 'yearly';
}

export function EnhancedPlanCard({
  planId,
  price,
  isPopular,
  isSelected,
  onSelect,
  billingPeriod,
}: EnhancedPlanCardProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const planKey = `plans.${planId}`;
  const name = sanitizeI18n(t(`${planKey}.name`));
  const features = t(`${planKey}.features`, [], { returnObjects: true });

  const monthlyPrice = parseFloat(price.slice(1));
  const yearlyPrice = (monthlyPrice * 10).toFixed(2);
  const displayPrice = billingPeriod === 'yearly' ? yearlyPrice : price.slice(1);

  return (
    <Pressable
      onPress={onSelect}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[styles.container, isPopular && styles.popularContainer]}
    >
      <GlassCard
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          isHovered && styles.cardHovered,
          isPopular && styles.cardPopular,
        ]}
      >
        {/* Popular Badge */}
        {isPopular && (
          <View style={styles.popularBadge}>
            <LinearGradient
              colors={['rgba(168, 85, 247, 0.8)', 'rgba(139, 92, 246, 0.8)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.popularGradient}
            >
              <Sparkles size={14} color={colors.text} />
              <Text style={styles.popularText}>
                {sanitizeI18n(t('subscribe.popular'))}
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Plan Name */}
        <View style={styles.header}>
          <Text style={[styles.planName, isPopular && styles.planNamePopular]}>
            {name}
          </Text>
        </View>

        {/* Price */}
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.currency}>$</Text>
            <Text style={styles.priceAmount}>{displayPrice}</Text>
          </View>
          <Text style={styles.pricePeriod}>
            {billingPeriod === 'monthly'
              ? sanitizeI18n(t('subscribe.period'))
              : sanitizeI18n(t('subscribe.perYear'))}
          </Text>
          {billingPeriod === 'yearly' && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>
                {sanitizeI18n(t('subscribe.save2Months'))}
              </Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Top Features */}
        <View style={styles.featuresSection}>
          {Array.isArray(features) &&
            features.slice(0, 4).map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.checkIcon}>
                  <Check size={14} color={colors.success.DEFAULT} strokeWidth={3} />
                </View>
                <Text style={styles.featureText}>{sanitizeI18n(feature)}</Text>
              </View>
            ))}
        </View>

        {/* Select Button */}
        <GlassButton
          title={
            isSelected
              ? sanitizeI18n(t('subscribe.selected'))
              : sanitizeI18n(t('subscribe.select'))
          }
          onPress={onSelect}
          variant={isSelected ? 'primary' : 'secondary'}
          style={styles.selectButton}
        />
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 280,
    maxWidth: 340,
  },
  popularContainer: {
    transform: [{ scale: 1.02 }],
    zIndex: 10,
  },
  card: {
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.md,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
  },
  cardHovered: {
    transform: [{ translateY: -4 }],
  },
  cardPopular: {
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  popularBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  popularGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: spacing.lg,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  planNamePopular: {
    fontSize: 26,
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    marginTop: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary.DEFAULT,
    lineHeight: 40,
  },
  pricePeriod: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  savingsBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success.DEFAULT,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: spacing.lg,
  },
  featuresSection: {
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  selectButton: {
    width: '100%',
  },
});
