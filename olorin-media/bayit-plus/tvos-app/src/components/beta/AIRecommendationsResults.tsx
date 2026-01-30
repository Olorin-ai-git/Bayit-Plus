/**
 * AI Recommendations Results - tvOS Platform
 *
 * Results display for personalized AI recommendations.
 * Renders recommendation cards with focus navigation for 10-foot UI.
 */

import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image } from 'react-native';
import { FocusableButton } from '@bayit/tv-components';
import { colors } from '@olorin/design-tokens';
import { styles } from './AIRecommendationsScreen.styles';
import type { AIRecommendation, AIRecommendationsResponse } from './AIRecommendationsScreen';

interface ResultsAreaProps {
  recommendations: AIRecommendationsResponse | null;
  error: string | null;
  loading: boolean;
  onSelect?: (recommendation: AIRecommendation) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export const ResultsArea: React.FC<ResultsAreaProps> = ({
  recommendations,
  error,
  loading,
  onSelect,
  t,
}) => (
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

    {recommendations && (
      <>
        <View style={styles.summaryCard}>
          {recommendations.user_profile_summary && (
            <Text style={styles.profileSummary}>{recommendations.user_profile_summary}</Text>
          )}
          <View style={styles.creditsRow}>
            <Text style={styles.creditsLabel}>{t('beta.credits.charged')}:</Text>
            <Text style={styles.creditsValue}>{recommendations.credits_charged}</Text>
            <Text style={styles.creditsSeparator}>&bull;</Text>
            <Text style={styles.creditsLabel}>{t('beta.credits.remaining')}:</Text>
            <Text style={styles.creditsValue}>{recommendations.credits_remaining}</Text>
          </View>
        </View>

        {recommendations.total_recommendations === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t('beta.recommendations.noRecommendations')}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsTitle}>
              {t('beta.recommendations.forYou', { count: recommendations.total_recommendations })}
            </Text>
            <View style={styles.resultsGrid}>
              {recommendations.recommendations.map((rec, index) => (
                <RecommendationCard key={rec.id} rec={rec} index={index} onSelect={onSelect} />
              ))}
            </View>
          </>
        )}
      </>
    )}

    {!recommendations && !error && !loading && (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>{t('beta.recommendations.emptyState')}</Text>
      </View>
    )}

    {loading && (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.white} />
        <Text style={styles.loadingText}>{t('beta.recommendations.loading')}</Text>
      </View>
    )}
  </ScrollView>
);

const RecommendationCard: React.FC<{
  rec: AIRecommendation;
  index: number;
  onSelect?: (recommendation: AIRecommendation) => void;
}> = ({ rec, index, onSelect }) => (
  <FocusableButton
    onPress={() => onSelect?.(rec)}
    style={styles.recommendationCard}
    focusedStyle={styles.recommendationCardFocused}
  >
    <View style={styles.recommendationContent}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankBadgeText}>#{index + 1}</Text>
      </View>

      {rec.poster && (
        <Image source={{ uri: rec.poster }} style={styles.recommendationPoster} />
      )}

      <View style={styles.recommendationTextContainer}>
        <View style={styles.recommendationHeader}>
          <View style={styles.recommendationTitleContainer}>
            <Text style={styles.recommendationTitle} numberOfLines={2}>{rec.title}</Text>
            {rec.year && <Text style={styles.recommendationYear}>{rec.year}</Text>}
          </View>
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{rec.match_score}%</Text>
          </View>
        </View>

        <Text style={styles.recommendationDescription} numberOfLines={2}>
          {rec.description}
        </Text>

        <View style={styles.explanationContainer}>
          <Text style={styles.explanationText}>{rec.explanation}</Text>
        </View>

        <View style={styles.tagsContainer}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{rec.type}</Text>
          </View>
          {rec.genres?.slice(0, 3).map((genre) => (
            <View key={genre} style={styles.genreBadge}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  </FocusableButton>
);
