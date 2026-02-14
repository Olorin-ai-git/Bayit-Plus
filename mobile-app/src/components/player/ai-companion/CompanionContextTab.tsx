/**
 * CompanionContextTab - Cultural context display for current scene
 *
 * Fetches and renders AI-generated cultural context information
 * related to the content being watched.
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius } from '@olorin/design-tokens';
import type { CompanionMessage } from '../../../hooks/useAICompanion';
import Colors from '../../../theme/colors';

interface CompanionContextTabProps {
  contentId: string;
  messages: CompanionMessage[];
  isLoading: boolean;
  error: string | null;
  onFetch: () => void;
}

export const CompanionContextTab: React.FC<CompanionContextTabProps> = ({
  contentId,
  messages,
  isLoading,
  error,
  onFetch,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      onFetch();
    }
  }, [contentId]);

  if (isLoading && messages.length === 0) {
    return (
      <View style={styles.centered}>
        <GlassLoadingSpinner size="medium" />
        <Text style={styles.loadingText}>
          {t('aiCompanion.contextTab.loading')}
        </Text>
      </View>
    );
  }

  if (error && messages.length === 0) {
    return (
      <View style={styles.centered}>
        <NativeIcon name="alert-triangle" size="lg" color={Colors.Error.default} />
        <Text style={styles.errorText}>{error}</Text>
        <GlassButton
          variant="secondary"
          size="small"
          onPress={onFetch}
          accessibilityLabel={t('aiCompanion.contextTab.retry')}
          accessibilityHint={t('aiCompanion.contextTab.retryHint')}
          accessibilityRole="button"
        >
          {t('aiCompanion.contextTab.retry')}
        </GlassButton>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <NativeIcon name="book-open" size="md" color={Colors.Primary.p400} />
        <Text style={styles.sectionTitle}>
          {t('aiCompanion.contextTab.title')}
        </Text>
      </View>

      {messages
        .filter((m) => m.role === 'assistant')
        .map((message) => (
          <View key={message.id} style={styles.messageCard}>
            <Text style={styles.messageText}>{message.content}</Text>
            <Text style={styles.timestamp}>
              {new Date(message.timestamp).toLocaleTimeString('he-IL', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ))}

      <GlassButton
        variant="secondary"
        size="small"
        onPress={onFetch}
        disabled={isLoading}
        style={styles.refreshButton}
        accessibilityLabel={t('aiCompanion.contextTab.refresh')}
        accessibilityHint={t('aiCompanion.contextTab.refreshHint')}
        accessibilityRole="button"
      >
        {isLoading
          ? t('aiCompanion.contextTab.loading')
          : t('aiCompanion.contextTab.refresh')}
      </GlassButton>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.Text.muted,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: Colors.Error.default,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  messageCard: {
    backgroundColor: Colors.Glass.whiteLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  messageText: {
    fontSize: 14,
    color: Colors.Text.primary,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.Text.disabled,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  refreshButton: {
    marginTop: spacing.sm,
    alignSelf: 'center',
  },
});
