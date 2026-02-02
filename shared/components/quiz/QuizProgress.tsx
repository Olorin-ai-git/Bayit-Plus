/**
 * QuizProgress - Progress indicator for quiz questions
 * Shows current question number and visual progress through segments
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';
import { GlassProgressBar } from '../ui/GlassProgressBar';
import { useTranslation } from 'react-i18next';

interface QuizProgressProps {
  current: number;
  total: number;
  isRTL?: boolean;
  showLabel?: boolean;
}

export const QuizProgress: React.FC<QuizProgressProps> = ({
  current,
  total,
  isRTL = false,
  showLabel = true,
}) => {
  const { t } = useTranslation();

  const labelText = t('quiz.questionOf', { current: current + 1, total });

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={[styles.label, isRTL && styles.labelRTL]}>
          {labelText}
        </Text>
      )}
      <GlassProgressBar
        progress={0}
        total={total}
        current={current + 1}
        showSegments={true}
        size="md"
        variant="default"
        isRTL={isRTL}
        animated={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  labelRTL: {
    textAlign: 'right',
  },
});

export default QuizProgress;
