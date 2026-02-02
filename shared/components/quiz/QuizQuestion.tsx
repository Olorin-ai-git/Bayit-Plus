/**
 * QuizQuestion - Displays a single quiz question with answer options
 * Features:
 * - Question text with age-appropriate font size
 * - 2x2 grid of answer buttons
 * - Visual feedback for correct/incorrect answers
 * - tvOS focus navigation support
 * - RTL support
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { QuizAnswerButton } from './QuizAnswerButton';
import type { QuizQuestion as QuizQuestionType } from '../../stores/quizStore';

type AgeGroup = 'toddlers' | 'preschool' | 'elementary' | 'preteen';

interface QuizQuestionProps {
  question: QuizQuestionType;
  onAnswer: (optionIndex: number) => void;
  ageGroup?: AgeGroup;
  language?: string;
  isRTL?: boolean;
  showFeedback?: boolean;
}

// Age-adaptive font sizes for question text
const QUESTION_FONT_SIZES: Record<AgeGroup, { mobile: number; tv: number }> = {
  toddlers: { mobile: 28, tv: 48 },
  preschool: { mobile: 24, tv: 42 },
  elementary: { mobile: 20, tv: 36 },
  preteen: { mobile: 18, tv: 32 },
};

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  onAnswer,
  ageGroup = 'elementary',
  language = 'he',
  isRTL = false,
  showFeedback = true,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<'pending' | 'answered'>('pending');

  const isTV = Platform.isTV || Platform.OS === 'tvos';
  const fontConfig = QUESTION_FONT_SIZES[ageGroup];

  // Use English text if available and language is English
  const questionText = language === 'en' && question.question_text_en
    ? question.question_text_en
    : question.question_text;

  const options = language === 'en' && question.options_en
    ? question.options_en
    : question.options;

  const handleAnswerPress = useCallback((index: number) => {
    if (answerState === 'answered') return;

    setSelectedIndex(index);
    setAnswerState('answered');

    // Brief delay to show feedback before calling onAnswer
    if (showFeedback) {
      setTimeout(() => {
        onAnswer(index);
      }, 1200);
    } else {
      onAnswer(index);
    }
  }, [answerState, onAnswer, showFeedback]);

  const getAnswerState = (index: number) => {
    if (selectedIndex === null) return 'default';
    if (answerState !== 'answered') return 'default';

    if (index === question.correct_index) return 'correct';
    if (index === selectedIndex) return 'incorrect';
    return 'default';
  };

  return (
    <View style={styles.container}>
      <View style={styles.questionContainer}>
        <Text
          style={[
            styles.questionText,
            {
              fontSize: isTV ? fontConfig.tv : fontConfig.mobile,
              textAlign: isRTL ? 'right' : 'center',
            },
          ]}
        >
          {questionText}
        </Text>
      </View>

      <View style={[styles.answersGrid, isRTL && styles.answersGridRTL]}>
        {/* Row 1: Options 0 and 1 */}
        <View style={styles.answerRow}>
          <QuizAnswerButton
            text={options[0]}
            index={0}
            onPress={() => handleAnswerPress(0)}
            state={getAnswerState(0)}
            ageGroup={ageGroup}
            disabled={answerState === 'answered'}
            hasTVPreferredFocus={true}
            isRTL={isRTL}
          />
          <QuizAnswerButton
            text={options[1]}
            index={1}
            onPress={() => handleAnswerPress(1)}
            state={getAnswerState(1)}
            ageGroup={ageGroup}
            disabled={answerState === 'answered'}
            isRTL={isRTL}
          />
        </View>

        {/* Row 2: Options 2 and 3 */}
        <View style={styles.answerRow}>
          <QuizAnswerButton
            text={options[2]}
            index={2}
            onPress={() => handleAnswerPress(2)}
            state={getAnswerState(2)}
            ageGroup={ageGroup}
            disabled={answerState === 'answered'}
            isRTL={isRTL}
          />
          <QuizAnswerButton
            text={options[3]}
            index={3}
            onPress={() => handleAnswerPress(3)}
            state={getAnswerState(3)}
            ageGroup={ageGroup}
            disabled={answerState === 'answered'}
            isRTL={isRTL}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  questionContainer: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  questionText: {
    color: colors.text,
    fontWeight: '600',
    lineHeight: 1.4,
  },
  answersGrid: {
    flex: 1,
    justifyContent: 'center',
  },
  answersGridRTL: {
    flexDirection: 'column-reverse',
  },
  answerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
});

export default QuizQuestion;
