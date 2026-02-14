/**
 * MagicMirrorContent - Content area within the magic mirror experience
 * showing avatar expressions with animated transitions.
 *
 * Renders the expression icon and emotion-driven background color shift,
 * with scale animation when expression changes.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OlorinIcon } from '@olorin/icons/native';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const contentLogger = logger.scope('MagicMirrorContent');

interface MagicMirrorContentProps {
  expression: string;
  emotion: string;
  isAnimating: boolean;
}

const EXPRESSION_ICONS: Record<string, string> = {
  neutral: 'face-neutral',
  happy: 'face-happy',
  surprised: 'face-surprised',
  thoughtful: 'face-thoughtful',
  excited: 'face-excited',
  sad: 'face-sad',
};

const EMOTION_COLORS: Record<string, string> = {
  calm: Colors.Primary.p900,
  happy: Colors.Primary.p700,
  excited: Colors.Warning.default,
  surprised: Colors.Info.default,
  thoughtful: Colors.Primary.p600,
  sad: Colors.Glass.purpleStrong,
};

const ANIMATION_DURATION_MS = 400;

export const MagicMirrorContent: React.FC<MagicMirrorContentProps> = ({
  expression,
  emotion,
  isAnimating,
}) => {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isAnimating) return;
    contentLogger.info('Expression changed', { expression, emotion });
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: ANIMATION_DURATION_MS / 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: ANIMATION_DURATION_MS / 2,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION_MS / 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION_MS / 2,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [expression, isAnimating, scaleAnim, opacityAnim]);

  const iconName = EXPRESSION_ICONS[expression] || EXPRESSION_ICONS.neutral;
  const bgColor = EMOTION_COLORS[emotion] || EMOTION_COLORS.calm;

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.avatarCircle,
        { backgroundColor: bgColor, transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}>
        <OlorinIcon name={iconName} size={96} color={Colors.Text.primary} />
      </Animated.View>
      <Text style={styles.expressionLabel}
        accessibilityRole="text"
        accessibilityLabel={t('zehAni.magicMirror.expressionLabel', { expression })}>
        {t(`zehAni.magicMirror.expressions.${expression}`)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  avatarCircle: {
    width: 200, height: 200, borderRadius: 100,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.Glass.whiteStrong,
  },
  expressionLabel: {
    fontSize: 18, fontWeight: '600', color: Colors.Text.secondary, marginTop: 20,
  },
});
