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
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { Colors } from '../../theme/colors';
import { styles } from './ComprehensionQuizMobile.styles';
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
  contentId, questions, onComplete,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<ComprehensionResult['answers']>([]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const handleSelectAnswer = useCallback((optionIndex: number) => {
    if (showFeedback) return;
    setSelectedAnswer(optionIndex);
  }, [showFeedback]);

  const handleConfirm = useCallback(() => {
    if (selectedAnswer === null || !currentQuestion) return;
    const isCorrect = selectedAnswer === currentQuestion.correct_index;
    setAnswers((prev) => [...prev, { questionIndex: currentIndex, selectedIndex: selectedAnswer, correct: isCorrect }]);
    setShowFeedback(true);
    comprehensionLogger.info('Answer confirmed', { contentId, questionIndex: currentIndex, correct: isCorrect });
  }, [selectedAnswer, currentQuestion, currentIndex, contentId]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      const correctCount = answers.filter((a) => a.correct).length;
      onComplete({ totalQuestions, correctAnswers: correctCount, answers });
      comprehensionLogger.info('Quiz completed', { contentId, score: correctCount, total: totalQuestions });
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setShowFeedback(false);
  }, [isLastQuestion, answers, totalQuestions, onComplete, contentId]);

  if (!currentQuestion) return null;

  const getOptionStyle = (index: number) => {
    if (!showFeedback) return index === selectedAnswer ? styles.optionSelected : styles.option;
    if (index === currentQuestion.correct_index) return styles.optionCorrect;
    if (index === selectedAnswer && index !== currentQuestion.correct_index) return styles.optionIncorrect;
    return styles.optionFaded;
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          {t('trivia.comprehension.progress', { current: currentIndex + 1, total: totalQuestions })}
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.questionText, { textAlign }]} accessibilityRole="header"
          accessibilityLabel={currentQuestion.question_text}>
          {currentQuestion.question_text}
        </Text>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <Pressable key={`${currentQuestion.question_id}-opt-${index}`}
              style={getOptionStyle(index)} onPress={() => handleSelectAnswer(index)}
              disabled={showFeedback} accessibilityRole="button" accessibilityLabel={option}
              accessibilityHint={t('trivia.comprehension.selectOptionHint')}
              accessibilityState={{ selected: selectedAnswer === index, disabled: showFeedback }}>
              <View style={styles.optionIndexBadge}>
                <Text style={styles.optionIndexText}>{String.fromCharCode(65 + index)}</Text>
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
            <Text style={[styles.explanationText, { textAlign }]}>{currentQuestion.explanation}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!showFeedback ? (
          <GlassButton variant="primary" onPress={handleConfirm}
            style={[styles.actionButton, selectedAnswer === null && styles.actionButtonDisabled]}
            disabled={selectedAnswer === null} accessibilityRole="button"
            accessibilityLabel={t('trivia.comprehension.confirmAnswer')}
            accessibilityHint={t('trivia.comprehension.confirmHint')}>
            <Text style={styles.actionButtonText}>{t('trivia.comprehension.confirmAnswer')}</Text>
          </GlassButton>
        ) : (
          <GlassButton variant="primary" onPress={handleNext} style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={isLastQuestion ? t('trivia.comprehension.finish') : t('common.next')}
            accessibilityHint={t('trivia.comprehension.nextHint')}>
            <Text style={styles.actionButtonText}>
              {isLastQuestion ? t('trivia.comprehension.finish') : t('common.next')}
            </Text>
          </GlassButton>
        )}
      </View>
    </View>
  );
};

export default ComprehensionQuizMobile;
