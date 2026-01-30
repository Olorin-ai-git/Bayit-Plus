/**
 * AI Search Modal - Mobile Platform (iOS/Android)
 *
 * Natural language content search using Beta 500 AI.
 * Cost: 2 credits per search.
 * Uses StyleSheet for React Native compatibility.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBetaFeatureGate } from '../../../../shared/hooks/useBetaFeatureGate';
import { colors, spacing, fontSize } from '@olorin/design-tokens';

export interface AISearchResult {
  type: 'movie' | 'series' | 'podcast' | 'audiobook' | 'live_channel';
  id: string;
  title: string;
  description: string;
  poster?: string;
  relevance_score: number;
}

export interface AISearchResponse {
  query: string;
  query_analysis: {
    content_types?: string[];
    genres?: string[];
    language?: string;
    mood?: string;
    temporal?: string;
    keywords?: string[];
  };
  total_results: number;
  results: AISearchResult[];
  credits_charged: number;
  credits_remaining: number;
}

export interface AISearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectResult?: (result: AISearchResult) => void;
  isEnrolled: boolean;
  apiBaseUrl?: string;
}

export const AISearchModal: React.FC<AISearchModalProps> = ({
  visible,
  onClose,
  onSelectResult,
  isEnrolled,
  apiBaseUrl = '/api/v1',
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<AISearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { canAccess, requestFeatureAccess } = useBetaFeatureGate({
    feature: 'ai_search',
    isEnrolled,
  });

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults(null);
      setError(null);
    }
  }, [visible]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    if (!canAccess) {
      requestFeatureAccess();
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/beta/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ query: query.trim(), limit: 20 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Search failed');
      }

      const data: AISearchResponse = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>✨ {t('beta.aiSearch.title')}</Text>
            <Text style={styles.subtitle}>{t('beta.aiSearch.subtitle')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('beta.aiSearch.placeholder')}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            editable={!searching}
          />
          <TouchableOpacity
            onPress={handleSearch}
            disabled={searching || !query.trim()}
            style={[
              styles.searchButton,
              (searching || !query.trim()) && styles.searchButtonDisabled,
            ]}
          >
            <Text style={styles.searchButtonText}>
              {searching ? t('beta.aiSearch.searching') : t('beta.aiSearch.search')}
            </Text>
          </TouchableOpacity>

          <View style={styles.costInfo}>
            <Text style={styles.costInfoText}>{t('beta.aiSearch.costInfo')}</Text>
          </View>
        </View>

        {/* Results */}
        <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {results && (
            <>
              {/* Query Analysis */}
              {results.query_analysis && (
                <View style={styles.analysisContainer}>
                  <Text style={styles.analysisTitle}>{t('beta.aiSearch.queryAnalysis')}</Text>
                  <View style={styles.analysisTagsContainer}>
                    {results.query_analysis.mood && (
                      <View style={[styles.analysisTag, styles.tagPurple]}>
                        <Text style={styles.analysisTagText}>{results.query_analysis.mood}</Text>
                      </View>
                    )}
                    {results.query_analysis.genres?.map((genre) => (
                      <View key={genre} style={[styles.analysisTag, styles.tagBlue]}>
                        <Text style={styles.analysisTagText}>{genre}</Text>
                      </View>
                    ))}
                    {results.query_analysis.language && (
                      <View style={[styles.analysisTag, styles.tagGreen]}>
                        <Text style={styles.analysisTagText}>{results.query_analysis.language}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Results Count & Credits */}
              <View style={styles.statsRow}>
                <Text style={styles.statsText}>
                  {t('beta.aiSearch.resultsCount', { count: results.total_results })}
                </Text>
                <View style={styles.creditsRow}>
                  <Text style={styles.creditsLabel}>{t('beta.credits.charged')}:</Text>
                  <Text style={styles.creditsValue}>{results.credits_charged}</Text>
                  <Text style={styles.creditsSeparator}>•</Text>
                  <Text style={styles.creditsLabel}>{t('beta.credits.remaining')}:</Text>
                  <Text style={styles.creditsValue}>{results.credits_remaining}</Text>
                </View>
              </View>

              {/* Results Grid */}
              {results.total_results === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>{t('beta.aiSearch.noResults')}</Text>
                </View>
              ) : (
                results.results.map((result) => (
                  <TouchableOpacity
                    key={result.id}
                    onPress={() => onSelectResult?.(result)}
                    style={styles.resultCard}
                  >
                    <View style={styles.resultContent}>
                      {result.poster && (
                        <Image source={{ uri: result.poster }} style={styles.resultPoster} />
                      )}
                      <View style={styles.resultTextContainer}>
                        <View style={styles.resultHeader}>
                          <Text style={styles.resultTitle} numberOfLines={2}>
                            {result.title}
                          </Text>
                          <View style={styles.relevanceBadge}>
                            <Text style={styles.relevanceText}>
                              {Math.round(result.relevance_score)}%
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.resultDescription} numberOfLines={3}>
                          {result.description}
                        </Text>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeText}>{result.type}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {!results && !error && !searching && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔍</Text>
              <Text style={styles.emptyStateText}>{t('beta.aiSearch.emptyState')}</Text>
              <Text style={styles.emptyStateHint}>{t('beta.aiSearch.exampleQueries')}</Text>
            </View>
          )}

          {searching && (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={styles.loadingText}>{t('beta.aiSearch.analyzing')}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 40,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 40,
  },
  searchSection: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.white,
    fontSize: fontSize.md,
    marginBottom: spacing[3],
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: spacing[3],
    borderRadius: 12,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  costInfo: {
    marginTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
  },
  costInfoText: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
  },
  analysisContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: spacing[4],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  analysisTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing[2],
  },
  analysisTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  analysisTag: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 999,
    borderWidth: 1,
  },
  tagPurple: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  tagBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  tagGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  analysisTagText: {
    fontSize: fontSize.sm,
    color: colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  statsText: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  creditsLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  creditsValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
  creditsSeparator: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  resultContent: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  resultPoster: {
    width: 80,
    height: 112,
    borderRadius: 8,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  resultTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  relevanceBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  relevanceText: {
    fontSize: fontSize.xs,
    color: '#93C5FD',
    fontWeight: '600',
  },
  resultDescription: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
    marginBottom: spacing[2],
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  emptyStateHint: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: spacing[2],
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  loadingText: {
    fontSize: fontSize.md,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing[4],
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  errorText: {
    fontSize: fontSize.sm,
    color: '#FCA5A5',
  },
});

export default AISearchModal;
