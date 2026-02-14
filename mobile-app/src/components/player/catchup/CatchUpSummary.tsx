/**
 * CatchUpSummary - AI-generated summary of missed content
 *
 * Displays bullet points of key events the viewer missed,
 * with loading state while the AI generates the summary.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../../theme/colors';

interface CatchUpSummaryProps {
  summary: string[];
  isLoading: boolean;
}

export const CatchUpSummary: React.FC<CatchUpSummaryProps> = ({
  summary,
  isLoading,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  if (isLoading) {
    return (
      <View
        style={styles.loadingContainer}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('catchUp.generatingSummary')}
      >
        <GlassLoadingSpinner size="medium" />
        <Text style={styles.loadingText}>
          {t('catchUp.generatingSummary')}
        </Text>
      </View>
    );
  }

  if (summary.length === 0) {
    return (
      <View
        style={styles.emptyContainer}
        accessible
        accessibilityRole="text"
        accessibilityLabel={t('catchUp.noSummaryAvailable')}
      >
        <NativeIcon name="fileText" size="lg" color={Colors.Text.muted} />
        <Text style={styles.emptyText}>
          {t('catchUp.noSummaryAvailable')}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="list"
      accessibilityLabel={t('catchUp.summaryOfMissedContent')}
    >
      <Text style={[styles.heading, { textAlign }]}>
        {t('catchUp.keyEvents')}
      </Text>
      {summary.map((point, index) => (
        <View
          key={`event-${index}`}
          style={[styles.bulletRow, isRTL && styles.bulletRowRTL]}
          accessible
          accessibilityRole="text"
        >
          <View style={styles.bulletDot} />
          <Text style={[styles.bulletText, { textAlign }]}>
            {point}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  heading: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: Colors.Primary.p400,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bulletRowRTL: {
    flexDirection: 'row-reverse',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.Primary.p500,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: Colors.Text.muted,
  },
});
