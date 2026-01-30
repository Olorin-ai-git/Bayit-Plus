/**
 * AI Search Screen - tvOS Platform (Apple TV)
 *
 * Natural language content search optimized for 10-foot UI.
 * Cost: 2 credits per search.
 * Uses StyleSheet + TV-optimized focus navigation.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TVFocusGuideView,
  Image,
  findNodeHandle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { TVEventHandler, useTVEventHandler } from '@bayit/tv-navigation';
import { FocusableButton } from '@bayit/tv-components';
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

export interface AISearchScreenProps {
  isEnrolled: boolean;
  onSelectResult?: (result: AISearchResult) => void;
  onBack?: () => void;
  apiBaseUrl?: string;
}

export const AISearchScreen: React.FC<AISearchScreenProps> = ({
  isEnrolled,
  onSelectResult,
  onBack,
  apiBaseUrl = '/api/v1',
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<AISearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const { canAccess, requestFeatureAccess } = useBetaFeatureGate({
    feature: 'ai_search',
    isEnrolled,
  });

  // TV remote menu button handling
  useTVEventHandler((evt: any) => {
    if (evt.eventType === 'menu') {
      onBack?.();
      return true; // Prevent default behavior
    }
    return false;
  });

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>✨ {t('beta.aiSearch.title')}</Text>
        <Text style={styles.subtitle}>{t('beta.aiSearch.subtitle')}</Text>
      </View>

      {/* Search Input Section */}
      <TVFocusGuideView autoFocus>
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={t('beta.aiSearch.placeholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              editable={!searching}
              autoFocus
            />
          </View>

          <FocusableButton
            onPress={handleSearch}
            disabled={searching || !query.trim()}
            style={[
              styles.searchButton,
              (searching || !query.trim()) && styles.searchButtonDisabled,
            ]}
            focusedStyle={styles.searchButtonFocused}
          >
            <Text style={styles.searchButtonText}>
              {searching ? t('beta.aiSearch.searching') : t('beta.aiSearch.search')}
            </Text>
          </FocusableButton>

          <View style={styles.costInfo}>
            <Text style={styles.costInfoText}>{t('beta.aiSearch.costInfo')}</Text>
          </View>
        </View>
      </TVFocusGuideView>

      {/* Results */}
      <ScrollView
        style={styles.results}
        contentContainerStyle={styles.resultsContent}
        showsVerticalScrollIndicator={false}
      >
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

            {/* Results Grid (TV optimized - 2 columns) */}
            {results.total_results === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>{t('beta.aiSearch.noResults')}</Text>
              </View>
            ) : (
              <View style={styles.resultsGrid}>
                {results.results.map((result) => (
                  <FocusableButton
                    key={result.id}
                    onPress={() => onSelectResult?.(result)}
                    style={styles.resultCard}
                    focusedStyle={styles.resultCardFocused}
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
                  </FocusableButton>
                ))}
              </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: spacing[12], // TV safe margins
  },
  header: {
    paddingTop: spacing[12],
    paddingBottom: spacing[8],
  },
  title: {
    fontSize: 54, // 10-foot UI
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing[4],
  },
  subtitle: {
    fontSize: 32, // 10-foot UI
    color: 'rgba(255, 255, 255, 0.6)',
  },
  searchSection: {
    paddingBottom: spacing[8],
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInputContainer: {
    marginBottom: spacing[6],
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
    color: colors.white,
    fontSize: 36, // 10-foot UI
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: spacing[6],
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  searchButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchButtonFocused: {
    transform: [{ scale: 1.05 }],
    backgroundColor: '#60A5FA',
  },
  searchButtonText: {
    color: colors.white,
    fontSize: 32, // 10-foot UI
    fontWeight: '600',
  },
  costInfo: {
    alignItems: 'center',
  },
  costInfoText: {
    fontSize: 28, // 10-foot UI
    color: 'rgba(255, 255, 255, 0.6)',
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    paddingVertical: spacing[8],
  },
  analysisContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: spacing[6],
    marginBottom: spacing[8],
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  analysisTitle: {
    fontSize: 28, // 10-foot UI
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing[4],
  },
  analysisTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  analysisTag: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 999,
    borderWidth: 2,
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
    fontSize: 26, // 10-foot UI
    color: colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  statsText: {
    fontSize: 28, // 10-foot UI
    color: 'rgba(255, 255, 255, 0.6)',
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  creditsLabel: {
    fontSize: 24, // 10-foot UI
    color: 'rgba(255, 255, 255, 0.6)',
  },
  creditsValue: {
    fontSize: 28, // 10-foot UI
    fontWeight: '600',
    color: colors.white,
  },
  creditsSeparator: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[6],
  },
  resultCard: {
    width: '48%', // 2 columns for TV
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 3, // Thicker for TV
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: spacing[6],
  },
  resultCardFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  resultContent: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  resultPoster: {
    width: 120,
    height: 180,
    borderRadius: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  resultTitle: {
    flex: 1,
    fontSize: 30, // 10-foot UI
    fontWeight: '600',
    color: colors.white,
  },
  relevanceBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 8,
  },
  relevanceText: {
    fontSize: 22, // 10-foot UI
    color: '#93C5FD',
    fontWeight: '600',
  },
  resultDescription: {
    fontSize: 26, // 10-foot UI
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 34,
    marginBottom: spacing[3],
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 8,
  },
  typeText: {
    fontSize: 22, // 10-foot UI
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  emptyStateIcon: {
    fontSize: 120, // 10-foot UI
    marginBottom: spacing[8],
  },
  emptyStateText: {
    fontSize: 32, // 10-foot UI
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  emptyStateHint: {
    fontSize: 26, // 10-foot UI
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: spacing[4],
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  loadingText: {
    fontSize: 32, // 10-foot UI
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing[8],
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 16,
    padding: spacing[6],
    marginBottom: spacing[6],
  },
  errorText: {
    fontSize: 28, // 10-foot UI
    color: '#FCA5A5',
  },
});

export default AISearchScreen;
