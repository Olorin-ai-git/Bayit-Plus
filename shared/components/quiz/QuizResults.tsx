/**
 * QuizResults - Displays quiz completion results
 * Features:
 * - Score display with celebration animation
 * - Animated points counter
 * - Confetti animation for badges earned
 * - Play Again and Continue buttons
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { useTranslation } from 'react-i18next';
import type { QuizResult } from '../../stores/quizStore';

interface QuizResultsProps {
  result: QuizResult;
  onPlayAgain: () => void;
  onContinue: () => void;
  isRTL?: boolean;
}

export const QuizResults: React.FC<QuizResultsProps> = ({
  result,
  onPlayAgain,
  onContinue,
  isRTL = false,
}) => {
  const { t } = useTranslation();
  const isTV = Platform.isTV || Platform.OS === 'tvos';

  // Animation values
  const scoreScale = useRef(new Animated.Value(0)).current;
  const pointsOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequential animation: score -> points -> badges
    const animation = Animated.sequence([
      Animated.spring(scoreScale, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(pointsOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    // Cleanup animation on unmount
    return () => {
      animation.stop();
      scoreScale.setValue(0);
      pointsOpacity.setValue(0);
      badgeScale.setValue(0);
    };
  }, [scoreScale, pointsOpacity, badgeScale]);

  const isPerfect = result.is_perfect;
  const scorePercentage = Math.round(
    (result.correct_answers / result.total_questions) * 100
  );

  const scoreAccessibilityLabel = isPerfect
    ? `${t('quiz.perfectScore')}! ${t('quiz.score', { score: result.correct_answers, total: result.total_questions })} - ${scorePercentage}%`
    : `${t('quiz.score', { score: result.correct_answers, total: result.total_questions })} - ${scorePercentage}%`;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={isRTL ? 'תוצאות החידון' : 'Quiz Results'}
    >
      {/* Score Display */}
      <Animated.View
        style={[
          styles.scoreContainer,
          { transform: [{ scale: scoreScale }] },
        ]}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={scoreAccessibilityLabel}
      >
        <GlassView intensity="medium" style={styles.scoreCard}>
          {isPerfect && (
            <Text style={styles.perfectLabel} accessibilityElementsHidden={true}>
              {t('quiz.perfectScore')}
            </Text>
          )}
          <Text
            style={[styles.scoreText, isTV && styles.scoreTextTV]}
            accessibilityElementsHidden={true}
          >
            {t('quiz.score', {
              score: result.correct_answers,
              total: result.total_questions,
            })}
          </Text>
          <Text style={styles.percentageText} accessibilityElementsHidden={true}>
            {scorePercentage}%
          </Text>
        </GlassView>
      </Animated.View>

      {/* Points Earned */}
      <Animated.View
        style={[styles.pointsContainer, { opacity: pointsOpacity }]}
      >
        <Text style={[styles.pointsText, isTV && styles.pointsTextTV]}>
          {t('quiz.pointsEarned', { points: result.points_earned })}
        </Text>
        {result.streak_days > 0 && (
          <Text style={styles.streakText}>
            {t('rewards.currentStreak')}: {result.streak_days}
          </Text>
        )}
      </Animated.View>

      {/* Badges Earned */}
      {result.new_badges.length > 0 && (
        <Animated.View
          style={[
            styles.badgesContainer,
            { transform: [{ scale: badgeScale }] },
          ]}
        >
          <Text style={styles.badgeTitle}>{t('quiz.badgeEarned')}</Text>
          <View style={[styles.badgesRow, isRTL && styles.badgesRowRTL]}>
            {result.new_badges.map((badge) => (
              <GlassView
                key={badge.badge_id}
                intensity="low"
                style={styles.badgeCard}
              >
                <Text style={styles.badgeName}>
                  {isRTL ? badge.name_he : badge.name}
                </Text>
                <GlassBadge
                  variant={({ common: 'default', rare: 'primary', epic: 'purple', legendary: 'warning' } as Record<string, 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'purple'>)[badge.rarity] || 'default'}
                  size="sm"
                >
                  +{badge.points_bonus}
                </GlassBadge>
              </GlassView>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Action Buttons */}
      <View style={[styles.buttonsContainer, isRTL && styles.buttonsContainerRTL]}>
        <GlassButton
          title={t('quiz.tryAgain')}
          onPress={onPlayAgain}
          variant="secondary"
          size={isTV ? 'lg' : 'md'}
          style={styles.button}
        />
        <GlassButton
          title={t('quiz.continue')}
          onPress={onContinue}
          variant="primary"
          size={isTV ? 'lg' : 'md'}
          style={styles.button}
          hasTVPreferredFocus={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  scoreContainer: {
    marginBottom: spacing.xl,
  },
  scoreCard: {
    padding: spacing.xl,
    alignItems: 'center',
    minWidth: 200,
  },
  perfectLabel: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  scoreText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  scoreTextTV: {
    fontSize: 42,
  },
  percentageText: {
    color: colors.primary.DEFAULT,
    fontSize: 48,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  pointsContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  pointsText: {
    color: colors.success.DEFAULT,
    fontSize: 24,
    fontWeight: '700',
  },
  pointsTextTV: {
    fontSize: 36,
  },
  streakText: {
    color: colors.warning.DEFAULT,
    fontSize: 16,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  badgesContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  badgeTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  badgesRowRTL: {
    flexDirection: 'row-reverse',
  },
  badgeCard: {
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 120,
  },
  badgeName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  buttonsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  button: {
    minWidth: 140,
  },
});

export default QuizResults;
