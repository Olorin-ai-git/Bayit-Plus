/**
 * CouponShop - Styles
 */

import { StyleSheet } from 'react-native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';

export const styles = StyleSheet.create({
  container: {
    marginTop: spacing[4],
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: Colors.Text.secondary,
    marginBottom: spacing[3],
  },
  columnWrapper: {
    gap: spacing[3],
  },
  couponCard: {
    flex: 1,
    backgroundColor: Colors.Glass.whiteMedium,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
    marginBottom: spacing[3],
  },
  couponImage: {
    width: '100%',
    height: 100,
  },
  couponImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.Glass.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponContent: {
    padding: spacing[3],
  },
  couponTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: spacing[0.5],
  },
  couponDescription: {
    fontSize: fontSize.xs,
    color: Colors.Text.muted,
    marginBottom: spacing[2],
    lineHeight: fontSize.xs * 1.4,
  },
  costRow: {
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  costText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: Colors.Special.gold,
  },
  costTextInsufficient: {
    color: Colors.Text.disabled,
  },
  redeemButton: {
    backgroundColor: Colors.Primary.default,
    borderRadius: borderRadius.DEFAULT,
    paddingVertical: spacing[1.5],
    alignItems: 'center',
  },
  redeemButtonDisabled: {
    backgroundColor: Colors.Glass.whiteSubtle,
  },
  redeemText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  redeemTextDisabled: {
    color: Colors.Text.disabled,
  },
  unavailableBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    backgroundColor: Colors.Error.alpha50,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
  },
  unavailableText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
});
