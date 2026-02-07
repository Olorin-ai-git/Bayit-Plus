/**
 * AISearchScreen - Full AI-powered search screen for tvOS Beta 500
 *
 * Composes header, input, filters, and results with voice search and credit handling.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, SafeAreaView, TVFocusGuideView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';
import { useAISearch } from '../../hooks/useAISearch';
import { useSearchVoice } from '../../hooks/useSearchVoice';
import { AISearchHeader } from './search/AISearchHeader';
import { AISearchInput } from './search/AISearchInput';
import { AISearchFilters } from './search/AISearchFilters';
import { AISearchResults } from './search/AISearchResults';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';
import { logger } from '../../utils/logger';

interface AISearchScreenProps {
  isEnrolled: boolean;
  onBack: () => void;
}

const AI_SEARCH_CREDITS_PER_QUERY = 1;
const MIN_QUERY_LENGTH = 2;

export const AISearchScreen: React.FC<AISearchScreenProps> = ({ isEnrolled, onBack }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  const { results, isLoading, error, creditsRemaining, isOutOfCredits, search, clearResults } =
    useAISearch();

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      if (newQuery.length >= MIN_QUERY_LENGTH) {
        search(newQuery, activeFilter);
      } else {
        clearResults();
      }
    },
    [activeFilter, search, clearResults],
  );

  const handleFilterChange = useCallback(
    (filter: string) => {
      setActiveFilter(filter);
      if (query.length >= MIN_QUERY_LENGTH) {
        search(query, filter);
      }
    },
    [query, search],
  );

  const handleVoiceTranscript = useCallback(
    (transcript: string) => {
      setQuery(transcript);
      search(transcript, activeFilter);
      logger.info('Voice search query submitted', { queryLength: transcript.length });
    },
    [activeFilter, search],
  );

  const { isListening, startListening, stopListening } = useSearchVoice({
    onTranscript: handleVoiceTranscript,
  });

  const handleVoiceSearch = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleItemPress = useCallback(
    (item: { id: string; title: string; content_type: string }) => {
      logger.info('AI search result selected', { itemId: item.id, contentType: item.content_type });
    },
    [],
  );

  useEffect(() => {
    if (isOutOfCredits) {
      setShowCreditsModal(true);
    }
  }, [isOutOfCredits]);

  if (!isEnrolled) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.unenrolledContainer}>
          <Text style={styles.unenrolledTitle}>{t('tvos.aiSearch.enrollRequired')}</Text>
          <Text style={styles.unenrolledSubtitle}>{t('tvos.aiSearch.enrollDescription')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TVFocusGuideView style={styles.focusGuide} autoFocus>
        <AISearchHeader userId="me" onBack={onBack} />
        <AISearchInput
          query={query}
          onQueryChange={handleQueryChange}
          onVoiceSearch={handleVoiceSearch}
          isListening={isListening}
        />
        <AISearchFilters activeFilter={activeFilter} onFilterChange={handleFilterChange} />
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <View style={styles.resultsContainer}>
          <AISearchResults results={results} isLoading={isLoading} onItemPress={handleItemPress} />
        </View>
      </TVFocusGuideView>
      <InsufficientCreditsModal
        visible={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        requiredCredits={AI_SEARCH_CREDITS_PER_QUERY}
        currentBalance={creditsRemaining ?? 0}
        featureName={t('tvos.aiSearch.title')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0a0f' },
  focusGuide: { flex: 1 },
  resultsContainer: { flex: 1 },
  errorBanner: {
    marginHorizontal: spacing[8],
    marginVertical: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
  },
  errorText: { color: '#FCA5A5', fontSize: 24 },
  unenrolledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[12],
  },
  unenrolledTitle: {
    color: colors.white,
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  unenrolledSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 28,
    textAlign: 'center',
    maxWidth: 600,
  },
});
