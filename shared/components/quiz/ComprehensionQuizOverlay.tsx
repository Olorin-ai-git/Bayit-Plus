/**
 * ComprehensionQuizOverlay - Scene-triggered comprehension questions
 * Features:
 * - Full-screen glassmorphic overlay
 * - Single question at scene end
 * - Immediate feedback display
 * - tvOS focus navigation
 * - RTL support
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import { GlassLoadingSpinner } from '../ui/GlassLoadingSpinner';
import { QuizQuestion } from './QuizQuestion';
import { ComprehensionFeedbackDisplay, ComprehensionFeedback } from './ComprehensionFeedback';
import { useTranslation } from 'react-i18next';

export interface ComprehensionQuestion {
  question_id: string;
  question_text: string;
  question_text_en?: string;
  options: string[];
  options_en?: string[];
  scene_start_time: number;
  scene_end_time: number;
  difficulty: string;
  points: number;
}

interface ComprehensionQuizOverlayProps {
  visible: boolean;
  question: ComprehensionQuestion | null;
  feedback: ComprehensionFeedback | null;
  isLoading: boolean;
  error: string | null;
  language?: string;
  isRTL?: boolean;
  onAnswer: (optionIndex: number) => Promise<void>;
  onSkip: () => void;
}

export const ComprehensionQuizOverlay: React.FC<ComprehensionQuizOverlayProps> = ({
  visible,
  question,
  feedback,
  isLoading,
  error,
  language = 'he',
  isRTL = false,
  onAnswer,
  onSkip,
}) => {
  const { t } = useTranslation();
  const isTV = Platform.isTV || Platform.OS === 'tvos';
  const isSubmittingRef = useRef(false);

  const handleAnswer = useCallback(async (optionIndex: number) => {
    if (isSubmittingRef.current || feedback) return;

    isSubmittingRef.current = true;
    try {
      await onAnswer(optionIndex);
    } finally {
      isSubmittingRef.current = false;
    }
  }, [onAnswer, feedback]);

  const questionData = question ? {
    question_id: question.question_id,
    question_text: language === 'en' && question.question_text_en
      ? question.question_text_en
      : question.question_text,
    options: language === 'en' && question.options_en
      ? question.options_en
      : question.options,
    difficulty: question.difficulty,
    points: question.points,
  } : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        <GlassView intensity="high" style={styles.container}>
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <Text style={[styles.title, isTV && styles.titleTV]}>
              {t('comprehension.scene_end')}
            </Text>
            <GlassButton
              title={t('comprehension.skip')}
              onPress={onSkip}
              variant="ghost"
              size="sm"
            />
          </View>

          <View style={styles.content}>
            {isLoading && (
              <View style={styles.centerContent}>
                <GlassLoadingSpinner size="large" />
                <Text style={styles.loadingText}>
                  {t('comprehension.loading')}
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.centerContent}>
                <Text style={styles.errorText}>
                  {error === 'Insufficient credits'
                    ? t('comprehension.insufficient_credits')
                    : t('comprehension.error')}
                </Text>
                <GlassButton
                  title={t('comprehension.skip')}
                  onPress={onSkip}
                  variant="primary"
                  size="md"
                />
              </View>
            )}

            {!isLoading && !error && questionData && !feedback && (
              <QuizQuestion
                question={questionData}
                onAnswer={handleAnswer}
                ageGroup="elementary"
                language={language}
                isRTL={isRTL}
              />
            )}

            {feedback && <ComprehensionFeedbackDisplay feedback={feedback} />}
          </View>
        </GlassView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
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
    fontSize: 22,
    fontWeight: '700',
  },
  titleTV: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});

export default ComprehensionQuizOverlay;
