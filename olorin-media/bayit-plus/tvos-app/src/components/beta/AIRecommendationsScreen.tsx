/**
 * AI Recommendations Screen - tvOS Platform (Apple TV)
 *
 * Personalized content recommendations using Beta 500 AI.
 * Cost: 3 credits per request.
 * Uses StyleSheet + TV-optimized focus navigation for 10-foot UI.
 */

import React, { useState } from 'react';
import { View, Text, ActivityIndicator, TVFocusGuideView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTVEventHandler } from '@bayit/tv-navigation';
import { FocusableButton } from '@bayit/tv-components';
import { useBetaFeatureGate } from '../../../../shared/hooks/useBetaFeatureGate';
import { colors } from '@olorin/design-tokens';
import { styles } from './AIRecommendationsScreen.styles';
import { ResultsArea } from './AIRecommendationsResults';
import { ContentTypeSelector, ContextInput } from './AIRecommendationsInputs';

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
  onBack?: () => void;
  apiBaseUrl?: string;
}

const CONTENT_TYPES = ['all', 'movies', 'series', 'podcasts', 'audiobooks'];

export const AIRecommendationsScreen: React.FC<AIRecommendationsScreenProps> = ({
  isEnrolled,
  onSelectRecommendation,
  onBack,
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

  useTVEventHandler((evt: any) => {
    if (evt.eventType === 'menu') {
      onBack?.();
      return true;
    }
    return false;
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
      const params = new URLSearchParams({ content_type: contentType, limit: '10' });
      if (context.trim()) {
        params.append('context', context.trim());
      }

      const response = await fetch(`${apiBaseUrl}/beta/recommendations?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('beta.recommendations.title')}</Text>
        <Text style={styles.subtitle}>{t('beta.recommendations.subtitle')}</Text>
      </View>

      <TVFocusGuideView autoFocus>
        <ContentTypeSelector
          types={CONTENT_TYPES}
          selected={contentType}
          onSelect={setContentType}
          t={t}
        />
      </TVFocusGuideView>

      <ContextInput
        context={context}
        onChangeContext={setContext}
        suggestions={contextSuggestions}
        loading={loading}
        t={t}
      />

      <FocusableButton
        onPress={fetchRecommendations}
        disabled={loading}
        style={[styles.getButton, loading && styles.getButtonDisabled]}
        focusedStyle={styles.getButtonFocused}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.getButtonText}>{t('beta.recommendations.getRecommendations')}</Text>
        )}
      </FocusableButton>

      <View style={styles.costInfo}>
        <Text style={styles.costInfoText}>{t('beta.recommendations.costInfo')}</Text>
      </View>

      <ResultsArea
        recommendations={recommendations}
        error={error}
        loading={loading}
        onSelect={onSelectRecommendation}
        t={t}
      />
    </View>
  );
};

export default AIRecommendationsScreen;
