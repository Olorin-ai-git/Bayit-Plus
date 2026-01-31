/**
 * QuizTab Component
 *
 * Displays quiz questions with multiple choice answers.
 * Used within the AI Companion Sidebar.
 */

import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, XCircle } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import type { QuizQuestion } from './useAICompanion';

interface QuizTabProps {
  quiz: QuizQuestion[];
  isRTL: boolean;
}

const TOUCH_TARGET_SIZE = 44;

export function QuizTab({ quiz, isRTL }: QuizTabProps) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const handleSelect = useCallback((questionId: string, optionId: string) => {
    if (submitted[questionId]) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }, [submitted]);

  const handleSubmit = useCallback((questionId: string) => {
    setSubmitted((prev) => ({ ...prev, [questionId]: true }));
  }, []);

  if (quiz.length === 0) {
    return <Text style={styles.emptyText}>{t('aiCompanion.noQuiz')}</Text>;
  }

  return (
    <View style={styles.quizContainer}>
      {quiz.map((question) => {
        const selectedAnswer = answers[question.id];
        const isSubmitted = submitted[question.id];
        const isCorrect = selectedAnswer === question.correctOptionId;

        return (
          <View key={question.id} style={styles.questionCard}>
            <Text style={[styles.questionText, { textAlign: isRTL ? 'right' : 'left' }]}>
              {question.question}
            </Text>
            {question.questionEn && <Text style={styles.questionTextEn}>{question.questionEn}</Text>}

            <View style={styles.optionsContainer}>
              {question.options.map((option) => {
                const isSelected = selectedAnswer === option.id;
                const showCorrect = isSubmitted && option.id === question.correctOptionId;
                const showIncorrect = isSubmitted && isSelected && !isCorrect;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelect(question.id, option.id)}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionSelected,
                      showCorrect && styles.optionCorrect,
                      showIncorrect && styles.optionIncorrect,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={option.text}
                  >
                    <Text style={styles.optionText}>{option.text}</Text>
                    {showCorrect && <Check size={16} color={colors.success.DEFAULT} />}
                    {showIncorrect && <XCircle size={16} color={colors.error.DEFAULT} />}
                  </Pressable>
                );
              })}
            </View>

            {!isSubmitted && selectedAnswer && (
              <Pressable
                onPress={() => handleSubmit(question.id)}
                style={styles.submitButton}
                accessibilityRole="button"
                accessibilityLabel={t('aiCompanion.checkAnswer')}
              >
                <Text style={styles.submitButtonText}>{t('aiCompanion.checkAnswer')}</Text>
              </Pressable>
            )}

            {isSubmitted && question.explanation && (
              <Text style={styles.explanationText}>{question.explanation}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  quizContainer: {
    gap: spacing.md,
  },
  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  questionText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  questionTextEn: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  optionsContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    minHeight: TOUCH_TARGET_SIZE,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(107,33,168,0.2)',
  },
  optionCorrect: {
    borderColor: colors.success.DEFAULT,
    backgroundColor: 'rgba(34,197,94,0.2)',
  },
  optionIncorrect: {
    borderColor: colors.error.DEFAULT,
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  submitButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    minHeight: TOUCH_TARGET_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  explanationText: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.success.light,
    fontStyle: 'italic',
  },
});

export default QuizTab;
