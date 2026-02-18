/**
 * Proactive Suggestion Banner
 * Dismissible banner shown at the top of voice settings when proactive
 * suggestions are enabled. Displays up to 3 tappable suggestion chips.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const MAX_VISIBLE_SUGGESTIONS = 3;

interface ProactiveSuggestionBannerProps {
  suggestions: string[];
  onDismiss: () => void;
  onSuggestionTap: (suggestion: string) => void;
  isRTL?: boolean;
}

export const ProactiveSuggestionBanner: React.FC<ProactiveSuggestionBannerProps> = ({
  suggestions,
  onDismiss,
  onSuggestionTap,
  isRTL = false,
}) => {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const visibleSuggestions = suggestions.slice(0, MAX_VISIBLE_SUGGESTIONS);
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <View style={[styles.header, { flexDirection: rowDirection }]}>
        <Text style={styles.label}>
          {t('voice.proactiveSuggestions.label', 'Suggestions')}
        </Text>
        <Pressable
          onPress={onDismiss}
          style={styles.dismissButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.dismiss', 'Dismiss')}
        >
          <X size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={[styles.chipsRow, { flexDirection: rowDirection }]}>
        {visibleSuggestions.map((suggestion, index) => (
          <Pressable
            key={index}
            onPress={() => onSuggestionTap(suggestion)}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={suggestion}
          >
            <Text style={styles.chipText} numberOfLines={1}>
              {suggestion}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassMedium,
  },
  chipsRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.glassMedium,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxWidth: 200,
  },
  chipPressed: {
    backgroundColor: colors.glassPurple,
    borderColor: colors.glassBorderFocus,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.text,
  },
});

export default ProactiveSuggestionBanner;
