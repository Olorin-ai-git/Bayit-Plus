/**
 * QuizOverlayMobile - Mobile quiz overlay with question, choices, timer
 *
 * Features:
 * - Countdown timer with visual indicator
 * - Correct/incorrect feedback with explanation
 * - Animated answer reveal
 * - RTL support, full accessibility
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { Colors } from '../../theme/colors';
import { styles } from './QuizOverlayMobile.styles';
import logger from '@/utils/logger';

const quizLogger = logger.scope('QuizOverlayMobile');

interface QuizOverlayMobileProps {
  question: string;
  choices: string[];
  onAnswer: (selectedIndex: number) => void;
  timeLimit: number;
  onClose: () => void;
  feedback?: { correctIndex: number; explanation: string } | null;
}

const TIMER_INTERVAL_MS = 100;

export const QuizOverlayMobile: React.FC<QuizOverlayMobileProps> = ({
  question, choices, onAnswer, timeLimit, onClose, feedback,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const timerWidth = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showingFeedback = feedback != null && selectedIndex !== null;

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    if (showingFeedback) { clearTimer(); return; }
    Animated.timing(timerWidth, {
      toValue: 0, duration: timeLimit * 1000, useNativeDriver: false,
    }).start();
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - (TIMER_INTERVAL_MS / 1000);
        if (next <= 0) { clearTimer(); return 0; }
        return next;
      });
    }, TIMER_INTERVAL_MS);
    return clearTimer;
  }, [timeLimit, showingFeedback, clearTimer, timerWidth]);

  useEffect(() => {
    if (timeRemaining <= 0 && !showingFeedback && selectedIndex === null) {
      quizLogger.info('Timer expired, auto-closing quiz');
      onClose();
    }
  }, [timeRemaining, showingFeedback, selectedIndex, onClose]);

  const handleChoicePress = useCallback((index: number) => {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);
    clearTimer();
    onAnswer(index);
    quizLogger.info('Answer selected', { index, timeRemaining });
  }, [selectedIndex, clearTimer, onAnswer, timeRemaining]);

  const getChoiceStyle = (index: number) => {
    if (!showingFeedback || selectedIndex === null) {
      return index === selectedIndex ? styles.choiceSelected : styles.choice;
    }
    if (index === feedback.correctIndex) return styles.choiceCorrect;
    if (index === selectedIndex && index !== feedback.correctIndex) return styles.choiceIncorrect;
    return styles.choiceDisabled;
  };

  const getTextStyle = (index: number) => {
    if (!showingFeedback) return index === selectedIndex ? styles.choiceTextSelected : styles.choiceText;
    if (index === feedback?.correctIndex) return styles.choiceTextCorrect;
    if (index === selectedIndex) return styles.choiceTextIncorrect;
    return styles.choiceTextDisabled;
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.question, { textAlign, flex: 1 }]} accessibilityRole="header"
            accessibilityLabel={question}>{question}</Text>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button"
            accessibilityLabel={t('common.close')} accessibilityHint={t('trivia.quiz.closeHint')}>
            <NativeIcon name="x" size="md" color={Colors.Text.secondary} />
          </Pressable>
        </View>

        {!showingFeedback && (
          <View style={styles.timerContainer}>
            <Animated.View style={[styles.timerBar, {
              width: timerWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: timeRemaining > timeLimit * 0.3 ? Colors.Success.default : Colors.Error.default,
            }]} />
            <Text style={styles.timerText}>{Math.ceil(timeRemaining)}{t('trivia.quiz.secondsAbbrev')}</Text>
          </View>
        )}

        <View style={styles.choicesContainer}>
          {choices.map((choice, index) => (
            <Pressable key={`choice-${index}`} style={getChoiceStyle(index)}
              onPress={() => handleChoicePress(index)} disabled={selectedIndex !== null}
              accessibilityRole="button" accessibilityLabel={choice}
              accessibilityHint={t('trivia.quiz.selectAnswerHint')}
              accessibilityState={{ selected: selectedIndex === index, disabled: selectedIndex !== null }}>
              <Text style={getTextStyle(index)}>{choice}</Text>
              {showingFeedback && index === feedback.correctIndex && (
                <NativeIcon name="check" size="sm" color={Colors.Success.default} />
              )}
              {showingFeedback && index === selectedIndex && index !== feedback.correctIndex && (
                <NativeIcon name="x" size="sm" color={Colors.Error.default} />
              )}
            </Pressable>
          ))}
        </View>

        {showingFeedback && feedback.explanation && (
          <View style={styles.explanationContainer}>
            <Text style={[styles.explanationText, { textAlign }]}>{feedback.explanation}</Text>
          </View>
        )}

        {showingFeedback && (
          <GlassButton variant="primary" onPress={onClose} style={styles.continueButton}
            accessibilityRole="button" accessibilityLabel={t('common.continue')}
            accessibilityHint={t('trivia.quiz.continueHint')}>
            <Text style={styles.continueText}>{t('common.continue')}</Text>
          </GlassButton>
        )}
      </View>
    </View>
  );
};

export default QuizOverlayMobile;
