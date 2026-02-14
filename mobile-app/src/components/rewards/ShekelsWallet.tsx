/**
 * ShekelsWallet - Balance display with shekel/points formatting
 *
 * Features:
 * - Formatted shekel amount display
 * - Points equivalent badge
 * - RTL support, accessibility
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';

interface ShekelsWalletProps {
  balance: number;
  points: number;
}

const formatBalance = (value: number): string => {
  return value.toLocaleString();
};

export const ShekelsWallet: React.FC<ShekelsWalletProps> = ({
  balance,
  points,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={t('rewards.wallet.balanceLabel', {
        balance: formatBalance(balance),
        points: formatBalance(points),
      })}
    >
      <View style={styles.iconSection}>
        <View style={styles.iconCircle}>
          <NativeIcon name="coin" size="xl" color={Colors.Special.gold} />
        </View>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.walletLabel}>{t('rewards.wallet.title')}</Text>
        <View style={[styles.balanceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.balanceAmount}>{formatBalance(balance)}</Text>
          <Text style={styles.currencySymbol}>{t('rewards.wallet.shekels')}</Text>
        </View>
        <View style={[styles.pointsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <NativeIcon name="star" size="xs" color={Colors.Primary.p400} />
          <Text style={styles.pointsText}>
            {t('rewards.wallet.pointsEquivalent', { points: formatBalance(points) })}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Glass.purpleLight,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: Colors.Glass.border,
  },
  iconSection: {
    marginRight: spacing[4],
  },
  iconCircle: {
    width: spacing[14],
    height: spacing[14],
    borderRadius: borderRadius.full,
    backgroundColor: Colors.Glass.purpleStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentSection: {
    flex: 1,
  },
  walletLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: Colors.Text.secondary,
    marginBottom: spacing[0.5],
  },
  balanceRow: {
    alignItems: 'baseline',
    gap: spacing[1],
  },
  balanceAmount: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: Colors.Special.gold,
  },
  currencySymbol: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: Colors.Special.gold,
  },
  pointsRow: {
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  pointsText: {
    fontSize: fontSize.xs,
    color: Colors.Text.muted,
  },
});

export default ShekelsWallet;
