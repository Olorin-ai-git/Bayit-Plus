/**
 * QuizOverlay - Main quiz modal for kids content
 * Features:
 * - Full-screen glassmorphic overlay
 * - Age-adaptive sizing
 * - Animated entrance from bottom
 * - Progress tracking
 * - tvOS focus navigation
 * - RTL support
 */

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import { GlassLoadingSpinner } from '../ui/GlassLoadingSpinner';
import { QuizProgress } from './QuizProgress';
import { QuizQuestion } from './QuizQuestion';
import { QuizResults } from './QuizResults';
import { useQuizStore } from '../../stores/quizStore';
import { useTranslation } from 'react-i18next';

type AgeGroup = 'toddlers' | 'preschool' | 'elementary' | 'preteen';

interface QuizOverlayProps {
  visible: boolean;
  contentId: string;
  profileId: string;
  ageGroup?: AgeGroup;
  language?: string;
  isRTL?: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const QuizOverlay: React.FC<QuizOverlayProps> = ({
  visible,
  contentId,
  profileId,
  ageGroup = 'elementary',
  language = 'he',
  isRTL = false,
  onClose,
  onComplete,
}) => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isTV = Platform.isTV || Platform.OS === 'tvos';

  const {
    currentQuiz,
    currentQuestionIndex,
    answers,
    isLoading,
    isSubmitting,
    error,
    result,
    fetchQuiz,
    startQuiz,
    selectAnswer,
    nextQuestion,
    submitQuiz,
    resetQuiz,
  } = useQuizStore();

  // Animation for overlay entrance
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      // Fetch quiz when overlay becomes visible
      fetchQuiz(contentId, profileId).then((quiz) => {
        if (quiz) {
          startQuiz(quiz);
        }
      });

      // Animate in
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      // Animate out
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, contentId, profileId]);

  const handleAnswer = useCallback(async (optionIndex: number) => {
    selectAnswer(optionIndex);

    // Check if this was the last question
    if (currentQuiz && currentQuestionIndex >= currentQuiz.questions.length - 1) {
      // Submit quiz
      await submitQuiz(currentQuiz.quiz_id, profileId);
    } else {
      // Move to next question after feedback delay
      setTimeout(() => {
        nextQuestion();
      }, 300);
    }
  }, [currentQuiz, currentQuestionIndex, profileId, selectAnswer, nextQuestion, submitQuiz]);

  const handlePlayAgain = useCallback(async () => {
    resetQuiz();
    const quiz = await fetchQuiz(contentId, profileId);
    if (quiz) {
      startQuiz(quiz);
    }
  }, [contentId, profileId, resetQuiz, fetchQuiz, startQuiz]);

  const handleContinue = useCallback(() => {
    resetQuiz();
    onComplete?.();
    onClose();
  }, [resetQuiz, onComplete, onClose]);

  const handleSkip = useCallback(() => {
    resetQuiz();
    onClose();
  }, [resetQuiz, onClose]);

  const currentQuestion = currentQuiz?.questions[currentQuestionIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleSkip}
    >
      <Animated.View
        style={[
          styles.overlay,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <GlassView intensity="high" style={styles.container}>
          {/* Header */}
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <Text style={[styles.title, isTV && styles.titleTV]}>
              {t('quiz.title')}
            </Text>
            <GlassButton
              title={t('quiz.skip')}
              onPress={handleSkip}
              variant="ghost"
              size="sm"
            />
          </View>

          {/* Content Area */}
          <View style={styles.content}>
            {isLoading && (
              <View style={styles.centerContent}>
                <GlassLoadingSpinner size="large" />
              </View>
            )}

            {error && (
              <View style={styles.centerContent}>
                <Text style={styles.errorText}>{error}</Text>
                <GlassButton
                  title={t('quiz.tryAgain')}
                  onPress={handlePlayAgain}
                  variant="primary"
                  size="md"
                />
              </View>
            )}

            {!isLoading && !error && currentQuiz && !result && currentQuestion && (
              <>
                <QuizProgress
                  current={currentQuestionIndex}
                  total={currentQuiz.questions.length}
                  isRTL={isRTL}
                />
                <QuizQuestion
                  question={currentQuestion}
                  onAnswer={handleAnswer}
                  ageGroup={ageGroup}
                  language={language}
                  isRTL={isRTL}
                />
              </>
            )}

            {isSubmitting && (
              <View style={styles.centerContent}>
                <GlassLoadingSpinner size="large" />
                <Text style={styles.submittingText}>
                  {t('quiz.submitting')}
                </Text>
              </View>
            )}

            {result && (
              <QuizResults
                result={result}
                onPlayAgain={handlePlayAgain}
                onContinue={handleContinue}
                isRTL={isRTL}
              />
            )}
          </View>
        </GlassView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  container: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: borderRadius['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  titleTV: {
    fontSize: 36,
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  submittingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.md,
  },
});

export default QuizOverlay;
