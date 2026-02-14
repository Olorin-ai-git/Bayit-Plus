/**
 * CompanionQuizTab - Interactive quiz about current content
 *
 * Multiple choice questions with immediate feedback and score tracking.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius } from '@olorin/design-tokens';
import type { QuizQuestion } from '../../../hooks/useAICompanion';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';

const log = logger.scope('CompanionQuizTab');

interface CompanionQuizTabProps {
  contentId: string;
  questions: QuizQuestion[];
  score: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  onFetch: () => void;
  onAnswer: (questionId: string, selectedIndex: number) => void;
  onReset: () => void;
}

export const CompanionQuizTab: React.FC<CompanionQuizTabProps> = ({
  contentId, questions, score, total, isLoading, error, onFetch, onAnswer, onReset,
}) => {
  const { t } = useTranslation();
  const [answeredMap, setAnsweredMap] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => { if (questions.length === 0 && !isLoading) onFetch(); }, [contentId]);

  const handleAnswer = useCallback((qId: string, idx: number) => {
    if (answeredMap[qId] !== undefined) return;
    setAnsweredMap((prev) => ({ ...prev, [qId]: idx }));
    onAnswer(qId, idx);
    log.info('Quiz answer submitted', { questionId: qId, selectedIndex: idx });
  }, [answeredMap, onAnswer]);

  const handleNewQuiz = useCallback(() => {
    setAnsweredMap({});
    setCurrentIndex(0);
    onReset();
    onFetch();
  }, [onReset, onFetch]);

  if (isLoading && questions.length === 0) {
    return (
      <View style={styles.centered}>
        <GlassLoadingSpinner size="medium" />
        <Text style={styles.mutedText}>{t('aiCompanion.quizTab.generating')}</Text>
      </View>
    );
  }
  if (error && questions.length === 0) {
    return (
      <View style={styles.centered}>
        <NativeIcon name="alert-triangle" size="lg" color={Colors.Error.default} />
        <Text style={styles.errorText}>{error}</Text>
        <GlassButton variant="secondary" size="small" onPress={onFetch}
          accessibilityLabel={t('aiCompanion.quizTab.retry')}
          accessibilityHint={t('aiCompanion.quizTab.retryHint')} accessibilityRole="button">
          {t('aiCompanion.quizTab.retry')}
        </GlassButton>
      </View>
    );
  }
  if (questions.length === 0) return null;

  const allAnswered = Object.keys(answeredMap).length === questions.length;
  const question = questions[currentIndex];
  const selected = answeredMap[question.id];
  const isAnswered = selected !== undefined;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.scoreBar}>
        <NativeIcon name="trophy" size="sm" color={Colors.Warning.default} />
        <Text style={styles.scoreText}>{t('aiCompanion.quizTab.score', { score, total })}</Text>
        <Text style={styles.progressText}>
          {t('aiCompanion.quizTab.progress', { current: currentIndex + 1, total: questions.length })}
        </Text>
      </View>
      <Text style={styles.questionText}>{question.question}</Text>
      <View style={styles.optionsList}>
        {question.options.map((option, idx) => {
          const isSel = selected === idx;
          const isCorrect = idx === question.correctIndex;
          return (
            <Pressable key={`${question.id}-${idx}`}
              style={[styles.optBtn, isAnswered && isCorrect && styles.optCorrect,
                isAnswered && isSel && !isCorrect && styles.optWrong,
                !isAnswered && styles.optDefault]}
              onPress={() => handleAnswer(question.id, idx)} disabled={isAnswered}
              accessibilityLabel={option} accessibilityRole="button"
              accessibilityHint={isAnswered ? t('aiCompanion.quizTab.alreadyAnswered') : t('aiCompanion.quizTab.selectOption')}>
              <View style={styles.optContent}>
                <Text style={styles.optIdx}>{String.fromCharCode(65 + idx)}</Text>
                <Text style={styles.optText}>{option}</Text>
              </View>
              {isAnswered && isCorrect && <NativeIcon name="check-circle" size="sm" color={Colors.Success.default} />}
              {isAnswered && isSel && !isCorrect && <NativeIcon name="x-circle" size="sm" color={Colors.Error.default} />}
            </Pressable>
          );
        })}
      </View>
      {isAnswered && (
        <View style={styles.explBox}>
          <Text style={styles.explLabel}>{t('aiCompanion.quizTab.explanation')}</Text>
          <Text style={styles.explText}>{question.explanation}</Text>
        </View>
      )}
      <View style={styles.navRow}>
        {isAnswered && currentIndex < questions.length - 1 && (
          <GlassButton variant="primary" size="small"
            onPress={() => setCurrentIndex((p) => Math.min(p + 1, questions.length - 1))}
            accessibilityLabel={t('aiCompanion.quizTab.next')} accessibilityRole="button">
            {t('aiCompanion.quizTab.next')}
          </GlassButton>
        )}
        {allAnswered && (
          <GlassButton variant="secondary" size="small" onPress={handleNewQuiz}
            accessibilityLabel={t('aiCompanion.quizTab.newQuiz')} accessibilityRole="button">
            {t('aiCompanion.quizTab.newQuiz')}
          </GlassButton>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.sm },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  mutedText: { fontSize: 14, color: Colors.Text.muted },
  errorText: { fontSize: 14, color: Colors.Error.default, textAlign: 'center' },
  scoreBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    padding: spacing.sm, backgroundColor: Colors.Glass.whiteLight, borderRadius: borderRadius.md,
  },
  scoreText: { fontSize: 14, fontWeight: '600', color: Colors.Warning.default },
  progressText: { fontSize: 12, color: Colors.Text.muted, marginLeft: 'auto' },
  questionText: { fontSize: 16, fontWeight: '600', color: Colors.Text.primary, lineHeight: 24 },
  optionsList: { gap: spacing.xs },
  optBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1,
  },
  optDefault: { borderColor: Colors.Glass.border, backgroundColor: Colors.Glass.whiteSubtle },
  optCorrect: { borderColor: Colors.Success.default, backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  optWrong: { borderColor: Colors.Error.default, backgroundColor: Colors.Error.alpha20 },
  optContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  optIdx: { fontSize: 14, fontWeight: '700', color: Colors.Primary.p400, width: 24, textAlign: 'center' },
  optText: { fontSize: 14, color: Colors.Text.primary, flex: 1 },
  explBox: {
    padding: spacing.sm, backgroundColor: Colors.Glass.whiteLight,
    borderRadius: borderRadius.md, borderLeftWidth: 3, borderLeftColor: Colors.Info.default,
  },
  explLabel: { fontSize: 12, fontWeight: '700', color: Colors.Info.default, marginBottom: spacing.xxs },
  explText: { fontSize: 13, color: Colors.Text.secondary, lineHeight: 20 },
  navRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
});
