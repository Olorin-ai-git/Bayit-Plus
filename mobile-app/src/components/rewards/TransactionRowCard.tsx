/**
 * TransactionRowCard - Single transaction row display
 *
 * Features:
 * - Icon based on transaction type
 * - Description, amount with color coding, date
 * - RTL support, accessibility
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';

interface Transaction {
  id: string;
  type: 'earned' | 'spent' | 'bonus';
  description: string;
  amount: number;
  date: string;
}

interface TransactionRowCardProps {
  transaction: Transaction;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; prefix: string }> = {
  earned: { icon: 'plus', color: Colors.Success.default, prefix: '+' },
  spent: { icon: 'minus', color: Colors.Error.default, prefix: '-' },
  bonus: { icon: 'gift', color: Colors.Special.gold, prefix: '+' },
};

const formatDate = (dateStr: string, language: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(language === 'he' ? 'he-IL' : language, {
    month: 'short',
    day: 'numeric',
  });
};

export const TransactionRowCard: React.FC<TransactionRowCardProps> = ({
  transaction,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const config = TYPE_CONFIG[transaction.type] || TYPE_CONFIG.earned;
  const formattedDate = formatDate(transaction.date, i18n.language);
  const formattedAmount = `${config.prefix}${Math.abs(transaction.amount).toLocaleString()}`;

  return (
    <View
      style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      accessibilityRole="text"
      accessibilityLabel={t('rewards.transaction.label', {
        type: t(`rewards.transaction.type.${transaction.type}`),
        description: transaction.description,
        amount: formattedAmount,
        date: formattedDate,
      })}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${config.color}20` }]}>
        <NativeIcon name={config.icon} size="sm" color={config.color} />
      </View>

      <View style={styles.details}>
        <Text style={[styles.description, { textAlign }]} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={[styles.date, { textAlign }]}>
          {formattedDate}
        </Text>
      </View>

      <Text style={[styles.amount, { color: config.color }]}>
        {formattedAmount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  iconCircle: {
    width: spacing[10],
    height: spacing[10],
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
  },
  description: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: Colors.Text.primary,
  },
  date: {
    fontSize: fontSize.xs,
    color: Colors.Text.muted,
    marginTop: spacing[0.5],
  },
  amount: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});

export default TransactionRowCard;
