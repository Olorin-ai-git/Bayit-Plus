/**
 * ComprehensionQuizMobile - Post-viewing comprehension quiz
 *
 * Features:
 * - Multiple questions about watched content
 * - Progress indicator across questions
 * - Score summary on completion
 * - RTL support, accessibility
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const comprehensionLogger = logger.scope('ComprehensionQuizMobile');

interface ComprehensionQuestion {
  question_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

interface ComprehensionResult {
  totalQuestions: number;
  correctAnswers: number;
  answers: Array<{ questionIndex: number; selectedIndex: number; correct: boolean }>;
}

interface ComprehensionQuizMobileProps {
  contentId: string;
  questions: ComprehensionQuestion[];
  onComplete: (result: ComprehensionResult) => void;
}

export const ComprehensionQuizMobile: React.FC<ComprehensionQuizMobileProps> = ({
  contentId,
  questions,
  onComplete,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<ComprehensionResult['answers']>([]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isComplete = currentIndex >= totalQuestions;

  const handleSelectAnswer = useCallback((optionIndex: number) => {
    if (showFeedback) return;
    setSelectedAnswer(optionIndex);
  }, [showFeedback]);

  const handleConfirm = useCallback(() => {
    if (selectedAnswer === null || !currentQuestion) return;

    const isCorrect = selectedAnswer === currentQuestion.correct_index;
    const answerRecord = {
      questionIndex: currentIndex,
      selectedIndex: selectedAnswer,
      correct: isCorrect,
    };

    setAnswers((prev) => [...prev, answerRecord]);
    setShowFeedback(true);

    comprehensionLogger.info('Answer confirmed', {
      contentId,
      questionIndex: currentIndex,
      correct: isCorrect,
    });
  }, [selectedAnswer, currentQuestion, currentIndex, contentId]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      const updatedAnswers = [
        ...answers,
      ];
      const correctCount = updatedAnswers.filter((a) => a.correct).length;
      const result: ComprehensionResult = {
        totalQuestions,
        correctAnswers: correctCount,
        answers: updatedAnswers,
      };
      onComplete(result);
      comprehensionLogger.info('Quiz completed', {
        contentId,
        score: correctCount,
        total: totalQuestions,
      });
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setShowFeedback(false);
  }, [isLastQuestion, answers, totalQuestions, onComplete, contentId]);

  if (isComplete || !currentQuestion) {
    return null;
  }

  const getOptionStyle = (index: number) => {
    if (!showFeedback) {
      return index === selectedAnswer ? styles.optionSelected : styles.option;
    }
    if (index === currentQuestion.correct_index) return styles.optionCorrect;
    if (index === selectedAnswer && index !== currentQuestion.correct_index) {
      return styles.optionIncorrect;
    }
    return styles.optionFaded;
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          {t('trivia.comprehension.progress', {
            current: currentIndex + 1,
            total: totalQuestions,
          })}
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[styles.questionText, { textAlign }]}
          accessibilityRole="header"
          accessibilityLabel={currentQuestion.question_text}
        >
          {currentQuestion.question_text}
        </Text>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <Pressable
              key={`${currentQuestion.question_id}-opt-${index}`}
              style={getOptionStyle(index)}
              onPress={() => handleSelectAnswer(index)}
              disabled={showFeedback}
              accessibilityRole="button"
              accessibilityLabel={option}
              accessibilityHint={t('trivia.comprehension.selectOptionHint')}
              accessibilityState={{
                selected: selectedAnswer === index,
                disabled: showFeedback,
              }}
            >
              <View style={styles.optionIndexBadge}>
                <Text style={styles.optionIndexText}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text style={[styles.optionText, { textAlign, flex: 1 }]}>{option}</Text>
              {showFeedback && index === currentQuestion.correct_index && (
                <NativeIcon name="check" size="sm" color={Colors.Success.default} />
              )}
              {showFeedback && index === selectedAnswer && index !== currentQuestion.correct_index && (
                <NativeIcon name="x" size="sm" color={Colors.Error.default} />
              )}
            </Pressable>
          ))}
        </View>

        {showFeedback && currentQuestion.explanation && (
          <View style={styles.explanationCard}>
            <NativeIcon name="info" size="sm" color={Colors.Info.default} />
            <Text style={[styles.explanationText, { textAlign }]}>
              {currentQuestion.explanation}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!showFeedback ? (
          <GlassButton
            variant="primary"
            onPress={handleConfirm}
            style={[styles.actionButton, selectedAnswer === null && styles.actionButtonDisabled]}
            disabled={selectedAnswer === null}
            accessibilityRole="button"
            accessibilityLabel={t('trivia.comprehension.confirmAnswer')}
            accessibilityHint={t('trivia.comprehension.confirmHint')}
          >
            <Text style={styles.actionButtonText}>
              {t('trivia.comprehension.confirmAnswer')}
            </Text>
          </GlassButton>
        ) : (
          <GlassButton
            variant="primary"
            onPress={handleNext}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={isLastQuestion ? t('trivia.comprehension.finish') : t('common.next')}
            accessibilityHint={t('trivia.comprehension.nextHint')}
          >
            <Text style={styles.actionButtonText}>
              {isLastQuestion ? t('trivia.comprehension.finish') : t('common.next')}
            </Text>
          </GlassButton>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    backgroundColor: Colors.Glass.whiteMedium,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
    gap: spacing[3],
  },
  optionSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    backgroundColor: Colors.Glass.purpleLight,
    borderWidth: 1,
    borderColor: Colors.Primary.p500,
    gap: spacing[3],
  },
  optionCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: Colors.Success.default,
    gap: spacing[3],
  },
  optionIncorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    backgroundColor: Colors.Error.alpha20,
    borderWidth: 1,
    borderColor: Colors.Error.default,
    gap: spacing[3],
  },
  optionFaded: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    backgroundColor: Colors.Glass.whiteSubtle,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
    opacity: 0.5,
    gap: spacing[3],
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

export default ComprehensionQuizMobile;
