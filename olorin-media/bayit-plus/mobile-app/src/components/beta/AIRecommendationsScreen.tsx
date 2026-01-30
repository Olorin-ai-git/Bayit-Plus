/**
 * AI Recommendations Screen - Mobile Platform (iOS/Android)
 *
 * Personalized content recommendations using Beta 500 AI.
 * Cost: 3 credits per request.
 * Uses StyleSheet for React Native compatibility.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBetaFeatureGate } from '../../../../shared/hooks/useBetaFeatureGate';
import { colors, spacing, fontSize } from '@olorin/design-tokens';

export interface AIRecommendation {
  type: 'movie' | 'series' | 'podcast' | 'audiobook';
  id: string;
  title: string;
  description: string;
  poster?: string;
  genres?: string[];
  year?: number;
  match_score: number;
  explanation: string;
}

export interface AIRecommendationsResponse {
  content_type: string;
  context?: string;
  total_recommendations: number;
  recommendations: AIRecommendation[];
  user_profile_summary?: string;
  credits_charged: number;
  credits_remaining: number;
}

export interface AIRecommendationsScreenProps {
  isEnrolled: boolean;
  onSelectRecommendation?: (recommendation: AIRecommendation) => void;
  apiBaseUrl?: string;
}

const CONTENT_TYPES = ['all', 'movies', 'series', 'podcasts', 'audiobooks'];

export const AIRecommendationsScreen: React.FC<AIRecommendationsScreenProps> = ({
  isEnrolled,
  onSelectRecommendation,
  apiBaseUrl = '/api/v1',
}) => {
  const { t } = useTranslation();
  const [contentType, setContentType] = useState('all');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { canAccess, requestFeatureAccess } = useBetaFeatureGate({
    feature: 'ai_recommendations',
    isEnrolled,
  });

  const contextSuggestions = [
    t('beta.recommendations.contexts.weekend'),
    t('beta.recommendations.contexts.family'),
    t('beta.recommendations.contexts.relax'),
    t('beta.recommendations.contexts.educational'),
    t('beta.recommendations.contexts.funny'),
  ];

  const fetchRecommendations = async () => {
    if (!canAccess) {
      requestFeatureAccess();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        content_type: contentType,
        limit: '10',
      });

      if (context.trim()) {
        params.append('context', context.trim());
      }

      const response = await fetch(`${apiBaseUrl}/beta/recommendations?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get recommendations');
      }

      const data: AIRecommendationsResponse = await response.json();
      setRecommendations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>✨ {t('beta.recommendations.title')}</Text>
          <Text style={styles.subtitle}>{t('beta.recommendations.subtitle')}</Text>
        </View>

        {/* Content Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('beta.recommendations.contentTypeLabel')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.contentTypeContainer}
          >
            {CONTENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setContentType(type)}
                style={[
                  styles.contentTypeButton,
                  contentType === type && styles.contentTypeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.contentTypeButtonText,
                    contentType === type && styles.contentTypeButtonTextActive,
                  ]}
                >
                  {t(`beta.recommendations.contentTypes.${type}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Context Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('beta.recommendations.contextLabel')}</Text>
          <TextInput
            style={styles.contextInput}
            value={context}
            onChangeText={setContext}
            placeholder={t('beta.recommendations.contextPlaceholder')}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            returnKeyType="done"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsContainer}
          >
            {contextSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                onPress={() => setContext(suggestion)}
                style={styles.suggestionChip}
              >
                <Text style={styles.suggestionChipText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Get Recommendations Button */}
        <TouchableOpacity
          onPress={fetchRecommendations}
          disabled={loading}
          style={[styles.getButton, loading && styles.getButtonDisabled]}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.getButtonText}>{t('beta.recommendations.loading')}</Text>
            </>
          ) : (
            <Text style={styles.getButtonText}>{t('beta.recommendations.getRecommendations')}</Text>
          )}
        </TouchableOpacity>

        {/* Cost Info */}
        <View style={styles.costInfo}>
          <Text style={styles.costInfoText}>{t('beta.recommendations.costInfo')}</Text>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Results */}
        {recommendations && (
          <View style={styles.resultsContainer}>
            {/* Profile Summary & Credits */}
            <View style={styles.summaryCard}>
              {recommendations.user_profile_summary && (
                <Text style={styles.profileSummary}>
                  📊 {recommendations.user_profile_summary}
                </Text>
              )}
              <View style={styles.creditsRow}>
                <Text style={styles.creditsLabel}>{t('beta.credits.charged')}:</Text>
                <Text style={styles.creditsValue}>{recommendations.credits_charged}</Text>
                <Text style={styles.creditsSeparator}>•</Text>
                <Text style={styles.creditsLabel}>{t('beta.credits.remaining')}:</Text>
                <Text style={styles.creditsValue}>{recommendations.credits_remaining}</Text>
              </View>
            </View>

            {/* Recommendations */}
            {recommendations.total_recommendations === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>{t('beta.recommendations.noRecommendations')}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.resultsTitle}>
                  {t('beta.recommendations.forYou', { count: recommendations.total_recommendations })}
                </Text>
                {recommendations.recommendations.map((rec, index) => (
                  <TouchableOpacity
                    key={rec.id}
                    onPress={() => onSelectRecommendation?.(rec)}
                    style={styles.recommendationCard}
                  >
                    <View style={styles.recommendationContent}>
                      {/* Rank Badge */}
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankBadgeText}>#{index + 1}</Text>
                      </View>

                      {/* Poster */}
                      {rec.poster && (
                        <Image source={{ uri: rec.poster }} style={styles.recommendationPoster} />
                      )}

                      {/* Content */}
                      <View style={styles.recommendationTextContainer}>
                        <View style={styles.recommendationHeader}>
                          <View style={styles.recommendationTitleContainer}>
                            <Text style={styles.recommendationTitle} numberOfLines={2}>
                              {rec.title}
                            </Text>
                            {rec.year && (
                              <Text style={styles.recommendationYear}>{rec.year}</Text>
                            )}
                          </View>
                          <View style={styles.matchBadge}>
                            <Text style={styles.matchBadgeText}>{rec.match_score}% match</Text>
                          </View>
                        </View>

                        <Text style={styles.recommendationDescription} numberOfLines={2}>
                          {rec.description}
                        </Text>

                        {/* Explanation */}
                        <View style={styles.explanationContainer}>
                          <Text style={styles.explanationText}>💡 {rec.explanation}</Text>
                        </View>

                        {/* Genres & Type */}
                        <View style={styles.tagsContainer}>
                          <View style={styles.typeBadge}>
                            <Text style={styles.typeText}>{rec.type}</Text>
                          </View>
                          {rec.genres?.map((genre) => (
                            <View key={genre} style={styles.genreBadge}>
                              <Text style={styles.genreText}>{genre}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}

        {/* Empty State */}
        {!recommendations && !error && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💡</Text>
            <Text style={styles.emptyStateText}>{t('beta.recommendations.emptyState')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing[12],
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
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
  section: {
    paddingHorizontal: spacing[6],
    marginBottom: spacing[6],
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing[3],
  },
  contentTypeContainer: {
    paddingRight: spacing[6],
    gap: spacing[2],
  },
  contentTypeButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginRight: spacing[2],
  },
  contentTypeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  contentTypeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  contentTypeButtonTextActive: {
    color: colors.white,
  },
  contextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.white,
    fontSize: fontSize.md,
    marginBottom: spacing[2],
  },
  suggestionsContainer: {
    paddingRight: spacing[6],
    gap: spacing[2],
  },
  suggestionChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    marginRight: spacing[2],
  },
  suggestionChipText: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  getButton: {
    marginHorizontal: spacing[6],
    backgroundColor: '#3B82F6',
    paddingVertical: spacing[3],
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
  },
  getButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  getButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  costInfo: {
    marginHorizontal: spacing[6],
    marginTop: spacing[3],
  },
  costInfoText: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  errorContainer: {
    marginHorizontal: spacing[6],
    marginTop: spacing[6],
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: spacing[4],
  },
  errorText: {
    fontSize: fontSize.sm,
    color: '#FCA5A5',
  },
  resultsContainer: {
    marginTop: spacing[6],
  },
  summaryCard: {
    marginHorizontal: spacing[6],
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing[4],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileSummary: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing[3],
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
  resultsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.white,
    marginHorizontal: spacing[6],
    marginBottom: spacing[3],
  },
  recommendationCard: {
    marginHorizontal: spacing[6],
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  recommendationContent: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  rankBadge: {
    width: 48,
    height: 48,
    backgroundColor: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.white,
  },
  recommendationPoster: {
    width: 64,
    height: 96,
    borderRadius: 8,
  },
  recommendationTextContainer: {
    flex: 1,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  recommendationTitleContainer: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  recommendationYear: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  matchBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchBadgeText: {
    fontSize: fontSize.xs,
    color: '#86EFAC',
    fontWeight: '600',
  },
  recommendationDescription: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  explanationContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  explanationText: {
    fontSize: fontSize.sm,
    color: '#93C5FD',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  genreBadge: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  genreText: {
    fontSize: fontSize.xs,
    color: '#C4B5FD',
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
});

export default AIRecommendationsScreen;
