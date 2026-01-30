/**
 * AI Recommendations Panel for Web
 *
 * Personalized content recommendations using Beta 500 AI.
 * Cost: 3 credits per request.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBetaFeatureGate } from '../../../../shared/hooks/useBetaFeatureGate';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';

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

export interface AIRecommendationsPanelProps {
  isEnrolled: boolean;
  onSelectRecommendation?: (recommendation: AIRecommendation) => void;
  apiBaseUrl?: string;
}

const AI_RECOMMENDATIONS_CREDIT_COST = 3; // Credits required for AI recommendations

export const AIRecommendationsPanel: React.FC<AIRecommendationsPanelProps> = ({
  isEnrolled,
  onSelectRecommendation,
  apiBaseUrl = '/api/v1',
}) => {
  const { t } = useTranslation();
  const [contentType, setContentType] = useState<string>('all');
  const [context, setContext] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);

  const {
    canAccess,
    showEnrollmentPrompt,
    requestFeatureAccess,
    dismissPrompt,
  } = useBetaFeatureGate({
    feature: 'ai_recommendations',
    isEnrolled,
  });

  const contentTypeOptions = [
    { value: 'all', label: t('beta.recommendations.contentTypes.all') },
    { value: 'movies', label: t('beta.recommendations.contentTypes.movies') },
    { value: 'series', label: t('beta.recommendations.contentTypes.series') },
    { value: 'podcasts', label: t('beta.recommendations.contentTypes.podcasts') },
    { value: 'audiobooks', label: t('beta.recommendations.contentTypes.audiobooks') },
  ];

  const contextSuggestions = [
    t('beta.recommendations.contexts.weekend'),
    t('beta.recommendations.contexts.family'),
    t('beta.recommendations.contexts.relax'),
    t('beta.recommendations.contexts.educational'),
    t('beta.recommendations.contexts.funny'),
  ];

  // Fetch current credit balance on component mount
  useEffect(() => {
    fetchCurrentBalance();
  }, []);

  const fetchCurrentBalance = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/beta/credits/balance`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentBalance(data.balance);
      }
    } catch (err) {
      // Silent fail - balance check is not critical
      console.warn('Failed to fetch credit balance:', err);
    }
  };

  const fetchRecommendations = async () => {
    if (!canAccess) {
      requestFeatureAccess();
      return;
    }

    // Pre-authorization check
    if (currentBalance !== null && currentBalance < AI_RECOMMENDATIONS_CREDIT_COST) {
      setShowInsufficientModal(true);
      return;
    }

    setLoading(true);
    setError(null);

    // Optimistic update: deduct credits immediately
    if (currentBalance !== null) {
      setCurrentBalance(currentBalance - AI_RECOMMENDATIONS_CREDIT_COST);
    }

    try {
      const params = new URLSearchParams({
        content_type: contentType,
        limit: '10',
      });

      if (context.trim()) {
        params.append('context', context.trim());
      }

      const response = await fetch(`${apiBaseUrl}/beta/ai-recommendations?${params}`, {
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
      // Update balance with actual value from server
      setCurrentBalance(data.credits_remaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
      // Rollback optimistic update on error
      if (currentBalance !== null) {
        setCurrentBalance(currentBalance + AI_RECOMMENDATIONS_CREDIT_COST);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          ✨ {t('beta.recommendations.title')}
        </h2>
        <p className="text-sm text-white/60">
          {t('beta.recommendations.subtitle')}
        </p>
      </div>

      {/* Controls */}
      <div className="space-y-4 mb-6">
        {/* Content Type Selector */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {t('beta.recommendations.contentTypeLabel')}
          </label>
          <div className="flex flex-wrap gap-2">
            {contentTypeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setContentType(option.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  contentType === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Context Input */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {t('beta.recommendations.contextLabel')}
          </label>
          <input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={t('beta.recommendations.contextPlaceholder')}
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {contextSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setContext(suggestion)}
                className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/60 hover:text-white transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Get Recommendations Button */}
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/40 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {t('beta.recommendations.loading')}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {t('beta.recommendations.getRecommendations')}
            </>
          )}
        </button>

        {/* Cost Info */}
        <div className="flex items-center gap-2 text-sm text-white/60">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t('beta.recommendations.costInfo')}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {recommendations && (
        <div className="space-y-4">
          {/* Profile Summary & Credits */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
            <div>
              {recommendations.user_profile_summary && (
                <p className="text-sm text-white/80">
                  📊 {recommendations.user_profile_summary}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/60">{t('beta.credits.charged')}:</span>
              <span className="text-white font-semibold">{recommendations.credits_charged}</span>
              <span className="text-white/60">•</span>
              <span className="text-white/60">{t('beta.credits.remaining')}:</span>
              <span className="text-white font-semibold">{recommendations.credits_remaining}</span>
            </div>
          </div>

          {/* Recommendations Grid */}
          {recommendations.total_recommendations === 0 ? (
            <div className="text-center py-12 text-white/60">
              {t('beta.recommendations.noRecommendations')}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">
                {t('beta.recommendations.forYou', { count: recommendations.total_recommendations })}
              </h3>
              {recommendations.recommendations.map((rec, index) => (
                <button
                  key={rec.id}
                  onClick={() => onSelectRecommendation?.(rec)}
                  className="group w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all text-left"
                >
                  <div className="flex gap-4">
                    {/* Match Score Badge */}
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl text-white font-bold text-lg">
                      #{index + 1}
                    </div>

                    {/* Poster */}
                    {rec.poster && (
                      <img
                        src={rec.poster}
                        alt={rec.title}
                        className="w-16 h-24 object-cover rounded-lg"
                      />
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold group-hover:text-blue-300 transition-colors truncate">
                            {rec.title}
                          </h4>
                          {rec.year && (
                            <p className="text-xs text-white/40 mt-1">{rec.year}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-300 font-semibold">
                            {rec.match_score}% match
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-white/60 line-clamp-2 mb-3">{rec.description}</p>

                      {/* Explanation */}
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <p className="text-sm text-blue-200">
                          💡 {rec.explanation}
                        </p>
                      </div>

                      {/* Genres & Type */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 bg-white/5 rounded text-white/60">
                          {rec.type}
                        </span>
                        {rec.genres?.map((genre) => (
                          <span
                            key={genre}
                            className="text-xs px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-purple-300"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!recommendations && !error && !loading && (
        <div className="text-center py-12 text-white/60">
          <svg className="w-16 h-16 mx-auto mb-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p>{t('beta.recommendations.emptyState')}</p>
        </div>
      )}

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        visible={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        requiredCredits={AI_RECOMMENDATIONS_CREDIT_COST}
        currentBalance={currentBalance || 0}
        featureName={t('beta.recommendations.title')}
      />
    </div>
  );
};

export default AIRecommendationsPanel;
