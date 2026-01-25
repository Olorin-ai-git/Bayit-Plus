import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface BillingToggleProps {
  billingPeriod: 'monthly' | 'yearly';
  onToggle: (period: 'monthly' | 'yearly') => void;
}

export function BillingToggle({ billingPeriod, onToggle }: BillingToggleProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <GlassView style={styles.toggle}>
        <Pressable
          onPress={() => onToggle('monthly')}
          style={[
            styles.option,
            billingPeriod === 'monthly' && styles.optionSelected,
          ]}
        >
          <Text style={[
            styles.optionText,
            billingPeriod === 'monthly' && styles.optionTextSelected,
          ]}>
            {t('subscribe.monthly')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onToggle('yearly')}
          style={[
            styles.option,
            billingPeriod === 'yearly' && styles.optionSelected,
          ]}
        >
          <Text style={[
            styles.optionText,
            billingPeriod === 'yearly' && styles.optionTextSelected,
          ]}>
            {t('subscribe.yearly')}
          </Text>
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>{t('subscribe.save2Months')}</Text>
          </View>
        </Pressable>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    zIndex: 10,
  },
  toggle: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  optionSelected: {
    backgroundColor: colors.primary.DEFAULT,
  },
  optionText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  optionTextSelected: {
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
});
