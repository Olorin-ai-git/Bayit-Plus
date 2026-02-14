/**
 * QuizOverlayMobile - Styles
 */

import { StyleSheet } from 'react-native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';

const choiceBase = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  padding: spacing[3],
  borderRadius: borderRadius.md,
  borderWidth: 1,
};

export const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.Glass.bgStrong,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    zIndex: 200,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: Colors.Background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: Colors.Glass.border,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  question: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: Colors.Text.primary,
    lineHeight: fontSize.lg * 1.4,
  },
  closeButton: {
    padding: spacing[1],
    marginLeft: spacing[2],
  },
  timerContainer: {
    height: spacing[1.5],
    backgroundColor: Colors.Glass.whiteMedium,
    borderRadius: borderRadius.full,
    marginBottom: spacing[4],
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  timerText: {
    position: 'absolute',
    right: spacing[2],
    fontSize: fontSize.xs,
    color: Colors.Text.secondary,
    fontWeight: '600',
  },
  choicesContainer: {
    gap: spacing[2],
  },
  choice: {
    ...choiceBase,
    backgroundColor: Colors.Glass.whiteMedium,
    borderColor: Colors.Glass.borderLight,
  },
  choiceSelected: {
    ...choiceBase,
    backgroundColor: Colors.Glass.purpleLight,
    borderColor: Colors.Primary.p500,
  },
  choiceCorrect: {
    ...choiceBase,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Colors.Success.default,
  },
  choiceIncorrect: {
    ...choiceBase,
    backgroundColor: Colors.Error.alpha20,
    borderColor: Colors.Error.default,
  },
  choiceDisabled: {
    ...choiceBase,
    backgroundColor: Colors.Glass.whiteSubtle,
    borderColor: Colors.Glass.borderLight,
    opacity: 0.5,
  },
  choiceText: {
    fontSize: fontSize.base,
    color: Colors.Text.primary,
    flex: 1,
  },
  choiceTextSelected: {
    fontSize: fontSize.base,
    color: Colors.Text.primary,
    fontWeight: '600',
    flex: 1,
  },
  choiceTextCorrect: {
    fontSize: fontSize.base,
    color: Colors.Success.default,
    fontWeight: '600',
    flex: 1,
  },
  choiceTextIncorrect: {
    fontSize: fontSize.base,
    color: Colors.Error.default,
    fontWeight: '600',
    flex: 1,
  },
  choiceTextDisabled: {
    fontSize: fontSize.base,
    color: Colors.Text.disabled,
    flex: 1,
  },
  explanationContainer: {
    marginTop: spacing[3],
    padding: spacing[3],
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: borderRadius.md,
  },
  explanationText: {
    fontSize: fontSize.sm,
    color: Colors.Text.secondary,
    lineHeight: fontSize.sm * 1.5,
  },
  continueButton: {
    marginTop: spacing[4],
  },
  continueText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
});
