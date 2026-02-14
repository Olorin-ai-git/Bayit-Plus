/**
 * RewardsScreenMobile - Styles
 */

import { StyleSheet } from 'react-native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../theme/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.Text.secondary,
    fontSize: fontSize.base,
    marginTop: spacing[3],
  },
  errorText: {
    color: Colors.Error.default,
    fontSize: fontSize.base,
    textAlign: 'center',
    paddingHorizontal: spacing[6],
  },
  scrollContent: {
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[12],
  },
  screenTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: Colors.Text.primary,
    marginBottom: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.Glass.whiteMedium,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: Colors.Text.primary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: Colors.Text.secondary,
    marginTop: spacing[0.5],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginTop: spacing[6],
    marginBottom: spacing[3],
  },
});
