/**
 * TriviaSettingsMobile - Styles
 */

import { StyleSheet } from 'react-native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.Glass.whiteMedium,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: spacing[4],
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: Colors.Text.secondary,
    marginBottom: spacing[2],
    marginTop: spacing[3],
  },
  optionsRow: {
    gap: spacing[2],
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: Colors.Glass.whiteSubtle,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  optionChipActive: {
    backgroundColor: Colors.Primary.default,
    borderColor: Colors.Primary.p500,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: Colors.Text.muted,
  },
  optionTextActive: {
    color: Colors.Text.primary,
    fontWeight: '600',
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
    backgroundColor: Colors.Glass.whiteSubtle,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  categoryChipActive: {
    backgroundColor: Colors.Primary.p900,
    borderColor: Colors.Primary.p600,
  },
  categoryChipText: {
    fontSize: fontSize.xs,
    color: Colors.Text.muted,
  },
  categoryChipTextActive: {
    color: Colors.Text.primary,
    fontWeight: '500',
  },
});
