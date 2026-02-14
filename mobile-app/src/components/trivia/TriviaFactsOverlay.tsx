/**
 * TriviaFactsOverlay - Floating overlay for fun facts during playback
 *
 * Features:
 * - Auto-dismiss after configurable duration
 * - Slide-in/slide-out animation
 * - Tap to dismiss
 * - RTL support, accessibility
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { NativeIcon } from '@olorin/shared-icons/native';
import { Colors } from '../../theme/colors';
import { styles } from './TriviaFactsOverlay.styles';
import logger from '@/utils/logger';

const overlayLogger = logger.scope('TriviaFactsOverlay');

interface TriviaFactData {
  fact_id: string;
  text: string;
  category: string;
  translations?: Record<string, string>;
}

interface TriviaFactsOverlayProps {
  fact: TriviaFactData | null;
  visible: boolean;
  onDismiss: () => void;
  displayDuration: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  cast: 'users', production: 'film', location: 'map-pin',
  cultural: 'book-open', historical: 'clock',
};

const ANIMATION_DURATION_MS = 300;

export const TriviaFactsOverlay: React.FC<TriviaFactsOverlayProps> = ({
  fact, visible, onDismiss, displayDuration,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 1, duration: ANIMATION_DURATION_MS, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: ANIMATION_DURATION_MS, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: ANIMATION_DURATION_MS, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: ANIMATION_DURATION_MS, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [slideAnim, opacityAnim, onDismiss]);

  useEffect(() => {
    if (visible && fact) {
      animateIn();
      clearDismissTimer();
      dismissTimerRef.current = setTimeout(() => animateOut(), displayDuration * 1000);
      overlayLogger.info('Fact displayed', { factId: fact.fact_id, category: fact.category });
    } else if (!visible) {
      clearDismissTimer();
      slideAnim.setValue(0);
      opacityAnim.setValue(0);
    }
    return clearDismissTimer;
  }, [visible, fact, displayDuration, animateIn, animateOut, clearDismissTimer, slideAnim, opacityAnim]);

  if (!visible || !fact) return null;

  const factText = fact.translations?.[i18n.language] ?? fact.text;
  const iconName = CATEGORY_ICONS[fact.category] || 'info';
  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim, transform: [{ translateY }] }]}
      pointerEvents="box-none">
      <Pressable style={[styles.card, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={animateOut} accessibilityRole="button"
        accessibilityLabel={`${t('trivia.factLabel')}: ${factText}`}
        accessibilityHint={t('trivia.tapToDismiss')}>
        <View style={styles.iconContainer}>
          <NativeIcon name={iconName} size="md" color={Colors.Primary.p400} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.categoryLabel, { textAlign }]}>
            {t(`trivia.category.${fact.category}`)}
          </Text>
          <Text style={[styles.factText, { textAlign }]} numberOfLines={3}>{factText}</Text>
        </View>
        <View style={styles.dismissIcon}>
          <NativeIcon name="x" size="sm" color={Colors.Text.muted} />
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default TriviaFactsOverlay;
