/**
 * ContextTab Component
 *
 * Displays episode context with summary and related concepts.
 * Used within the AI Companion Sidebar.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import type { EpisodeContext } from './useAICompanion';

interface ContextTabProps {
  context: EpisodeContext | null;
  isRTL: boolean;
}

export function ContextTab({ context, isRTL }: ContextTabProps) {
  const { t } = useTranslation();

  if (!context) {
    return <Text style={styles.emptyText}>{t('aiCompanion.noContext')}</Text>;
  }

  return (
    <View style={styles.contextContainer}>
      <Text style={[styles.contextTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
        {context.title}
      </Text>
      {context.titleEn && <Text style={styles.contextTitleEn}>{context.titleEn}</Text>}
      <Text style={[styles.contextSummary, { textAlign: isRTL ? 'right' : 'left' }]}>
        {context.summary}
      </Text>
      {context.summaryEn && <Text style={styles.contextSummaryEn}>{context.summaryEn}</Text>}

      {context.concepts.length > 0 && (
        <View style={styles.conceptsSection}>
          <Text style={styles.sectionLabel}>{t('aiCompanion.concepts')}</Text>
          <View style={styles.tagList}>
            {context.concepts.map((concept, index) => (
              <View key={index} style={styles.conceptTag}>
                <Text style={styles.conceptTagText}>{concept}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  contextContainer: {
    gap: spacing.sm,
  },
  contextTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  contextTitleEn: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  contextSummary: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 22,
  },
  contextSummaryEn: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  conceptsSection: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  conceptTag: {
    backgroundColor: 'rgba(107,33,168,0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  conceptTagText: {
    fontSize: fontSize.xs,
    color: colors.primary.light,
  },
});

export default ContextTab;
