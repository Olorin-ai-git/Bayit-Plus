/**
 * SearchEmptyState Component
 *
 * Empty state UI for various search scenarios:
 * - No query yet (shows suggestions)
 * - No results found (shows alternative suggestions)
 * - Error state (shows retry option)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '../../../../shared/components/ui/GlassButton';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';

interface SearchEmptyStateProps {
  /** Current search query */
  query?: string;
  /** Error message if any */
  error?: string | null;
  /** Callback to retry search */
  onRetry?: () => void;
  /** Callback to clear search */
  onClear?: () => void;
}

/**
 * Empty state component for search page
 */
export function SearchEmptyState({
  query,
  error,
  onRetry,
  onClear,
}: SearchEmptyStateProps) {
  const { t } = useTranslation();

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>{t('search.errors.somethingWrong')}</Text>
        <Text style={styles.message}>{error}</Text>
        {onRetry && (
          <GlassButton
            variant="primary"
            style={styles.button}
            onPress={onRetry}
            accessibilityLabel={t('search.errors.retrySearch')}
          >
            <Text style={styles.buttonText}>{t('search.errors.retrySearch')}</Text>
          </GlassButton>
        )}
      </View>
    );
  }

  // No results found
  if (query) {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>🔍</Text>
        <Text style={styles.title}>{t('search.empty.noResults')}</Text>
        <Text style={styles.message}>
          {t('search.empty.noResultsMessage', { query })}
        </Text>

        <View style={styles.suggestions}>
          <Text style={styles.suggestionsTitle}>{t('search.empty.tryAgain')}</Text>
          <Text style={styles.suggestionText}>{t('search.empty.checkSpelling')}</Text>
          <Text style={styles.suggestionText}>{t('search.empty.differentKeywords')}</Text>
          <Text style={styles.suggestionText}>{t('search.empty.searchLanguage')}</Text>
          <Text style={styles.suggestionText}>{t('search.empty.useVoice')}</Text>
        </View>

        {onClear && (
          <GlassButton
            variant="secondary"
            style={styles.button}
            onPress={onClear}
            accessibilityLabel={t('search.empty.clearSearch')}
          >
            <Text style={styles.buttonText}>{t('search.empty.clearSearch')}</Text>
          </GlassButton>
        )}
      </View>
    );
  }

  // No query yet (should show SearchSuggestionsPanel instead)
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🎬</Text>
      <Text style={styles.title}>{t('search.empty.startSearching')}</Text>
      <Text style={styles.message}>
        {t('search.empty.startSearchingMessage')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  icon: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  suggestions: {
    marginTop: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text,
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.glassBorder,
    borderWidth: 1,
    borderColor: colors.inputBorderFocus,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
