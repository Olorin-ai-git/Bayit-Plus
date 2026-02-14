/**
 * TalkBackResult - Displays TalkBack AI response with formatted text
 *
 * Shows the AI-generated response to a voice query with loading state
 * and text content rendering.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { GlassView } from '@bayit/shared';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../../theme/colors';

interface TalkBackResultProps {
  response: string;
  isLoading: boolean;
}

export const TalkBackResult: React.FC<TalkBackResultProps> = ({
  response,
  isLoading,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  if (isLoading) {
    return (
      <View
        style={styles.loadingContainer}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('talkBack.processing')}
      >
        <GlassLoadingSpinner size="medium" />
        <Text style={styles.loadingText}>
          {t('talkBack.processing')}
        </Text>
      </View>
    );
  }

  if (!response) {
    return null;
  }

  return (
    <GlassView
      style={styles.container}
      accessible
      accessibilityRole="text"
      accessibilityLabel={response}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <Text style={[styles.responseText, { textAlign }]}>
          {response}
        </Text>
      </ScrollView>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  scrollView: {
    flex: 1,
  },
  responseText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
