/**
 * ComprehensionFeedback - Displays quiz answer feedback
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';

export interface ComprehensionFeedback {
  isCorrect: boolean;
  explanation?: string;
  pointsEarned: number;
}

interface ComprehensionFeedbackProps {
  feedback: ComprehensionFeedback;
}

export const ComprehensionFeedbackDisplay: React.FC<ComprehensionFeedbackProps> = ({
  feedback,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.feedbackContainer}>
      <Text
        style={[
          styles.feedbackTitle,
          feedback.isCorrect && styles.correctTitle,
          !feedback.isCorrect && styles.incorrectTitle,
        ]}
      >
        {feedback.isCorrect
          ? t('comprehension.correct')
          : t('comprehension.incorrect')}
      </Text>
      {feedback.pointsEarned > 0 && (
        <Text style={styles.pointsText}>
          {t('comprehension.points_earned', {
            points: feedback.pointsEarned,
          })}
        </Text>
      )}
      {feedback.explanation && (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationLabel}>
            {t('comprehension.explanation')}:
          </Text>
          <Text style={styles.explanationText}>{feedback.explanation}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  feedbackContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  feedbackTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  correctTitle: {
    color: colors.success.DEFAULT,
  },
  incorrectTitle: {
    color: colors.error.DEFAULT,
  },
  pointsText: {
    color: colors.text,
    fontSize: 18,
    marginBottom: spacing.lg,
  },
  explanationBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '100%',
  },
  explanationLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  explanationText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
});

export default ComprehensionFeedbackDisplay;
