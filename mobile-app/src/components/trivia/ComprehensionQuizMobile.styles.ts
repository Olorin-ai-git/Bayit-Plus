/**
 * ComprehensionQuizMobile - Styles
 */

import { StyleSheet } from 'react-native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';

const optionBase = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  padding: spacing[3],
  borderRadius: borderRadius.md,
  borderWidth: 1,
  gap: spacing[3],
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background.primary,
  },
  progressSection: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: Colors.Text.secondary,
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  progressBarBg: {
    height: spacing[1],
    backgroundColor: Colors.Glass.whiteMedium,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.Primary.default,
    borderRadius: borderRadius.full,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  questionText: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: Colors.Text.primary,
    lineHeight: fontSize.xl * 1.4,
    marginBottom: spacing[5],
  },
  optionsContainer: {
    gap: spacing[3],
  },
  option: {
    ...optionBase,
    backgroundColor: Colors.Glass.whiteMedium,
    borderColor: Colors.Glass.borderLight,
  },
  optionSelected: {
    ...optionBase,
    backgroundColor: Colors.Glass.purpleLight,
    borderColor: Colors.Primary.p500,
  },
  optionCorrect: {
    ...optionBase,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Colors.Success.default,
  },
  optionIncorrect: {
    ...optionBase,
    backgroundColor: Colors.Error.alpha20,
    borderColor: Colors.Error.default,
  },
  optionFaded: {
    ...optionBase,
    backgroundColor: Colors.Glass.whiteSubtle,
    borderColor: Colors.Glass.borderLight,
    opacity: 0.5,
  },
  optionIndexBadge: {
    width: spacing[7],
    height: spacing[7],
    borderRadius: borderRadius.full,
    backgroundColor: Colors.Glass.whiteStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIndexText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: Colors.Text.primary,
  },
  optionText: {
    fontSize: fontSize.base,
    color: Colors.Text.primary,
    lineHeight: fontSize.base * 1.4,
  },
  explanationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[4],
    padding: spacing[3],
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.Info.default,
  },
  explanationText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: Colors.Text.secondary,
    lineHeight: fontSize.sm * 1.5,
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.Glass.borderLight,
  },
  actionButton: {
    width: '100%',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: Colors.Text.primary,
    textAlign: 'center',
  },
});
