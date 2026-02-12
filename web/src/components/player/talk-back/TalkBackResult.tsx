/**
 * TalkBackResult Component
 * Displays feedback after voice evaluation: score stars, points earned,
 * encouraging message in Hebrew + English, and action buttons.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import { GlassButton } from '@bayit/shared/components/ui/GlassButton';
import { talkBackStyles as styles, getTvStyles } from './talkBackStyles';

interface TalkBackResultProps {
  score: number;
  pointsEarned: number;
  feedback: string;
  feedbackHe: string;
  onTryAgain: () => void;
  onContinue: () => void;
  isRTL?: boolean;
}

const MAX_STARS = 5;
const useNativeDriver = Platform.OS !== 'web';

export function TalkBackResult({
  score,
  pointsEarned,
  feedback,
  feedbackHe,
  onTryAgain,
  onContinue,
  isRTL = false,
}: TalkBackResultProps) {
  const { t, i18n } = useTranslation();
  const isTV = Platform.isTV || Platform.OS === 'tvos';
  const tvStyles = getTvStyles(isTV);
  const isHebrew = i18n.language === 'he' || isRTL;

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver,
      }),
    ]).start();

    return () => {
      scaleAnim.stopAnimation();
      opacityAnim.stopAnimation();
    };
  }, [scaleAnim, opacityAnim]);

  const starCount = Math.round((score / 100) * MAX_STARS);
  const displayFeedback = isHebrew ? feedbackHe : feedback;

  return (
    <Animated.View
      style={[
        styles.resultContainer,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`${t('talkBack.score')}: ${score}. ${t('talkBack.pointsEarned')}: ${pointsEarned}`}
    >
      <View style={styles.starsRow}>
        {Array.from({ length: MAX_STARS }).map((_, idx) => (
          <Star
            key={idx}
            size={isTV ? 32 : 22}
            color="#FCD34D"
            fill={idx < starCount ? '#FCD34D' : 'transparent'}
          />
        ))}
      </View>

      <View style={styles.scoreRow}>
        <Text style={[styles.scoreValue, tvStyles.scoreText]}>
          {score}
        </Text>
        <Text style={[styles.scoreLabel, tvStyles.feedbackText]}>
          / 100
        </Text>
      </View>

      <Text style={[styles.pointsEarned, tvStyles.feedbackText]}>
        +{pointsEarned} {t('talkBack.points')}
      </Text>

      <Text
        style={[
          styles.feedbackText,
          isHebrew && styles.feedbackTextRTL,
          tvStyles.feedbackText,
        ]}
      >
        {displayFeedback}
      </Text>

      <View style={[styles.actionsRow, isHebrew && styles.actionsRowRTL]}>
        <GlassButton
          title={t('talkBack.tryAgain')}
          onPress={onTryAgain}
          variant="ghost"
          size="sm"
          accessibilityLabel={t('talkBack.tryAgain')}
        />
        <GlassButton
          title={t('talkBack.continue')}
          onPress={onContinue}
          variant="primary"
          size="sm"
          accessibilityLabel={t('talkBack.continue')}
        />
      </View>
    </Animated.View>
  );
}

export default TalkBackResult;
