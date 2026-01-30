/**
 * AI Search Modal for Web
 *
 * Natural language search interface using Beta 500 AI Search.
 * Cost: 2 credits per search.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBetaFeatureGate } from '../../../../shared/hooks/useBetaFeatureGate';

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

  const {
    canAccess,
    showEnrollmentPrompt,
    requestFeatureAccess,
    dismissPrompt,
  } = useBetaFeatureGate({
    feature: 'ai_search',
    isEnrolled,
  });

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !searching) {
      handleSearch();
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {t('beta.aiSearch.title')}
            </h2>
            <p className="text-sm text-white/60 mt-1">
              {t('beta.aiSearch.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-white/10">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('beta.aiSearch.placeholder')}
              className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
              disabled={searching}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/40 text-white font-semibold rounded-xl transition-colors"
            >
              {searching ? t('beta.aiSearch.searching') : t('beta.aiSearch.search')}
            </button>
          </div>

          {/* Cost Info */}
          <div className="mt-3 flex items-center gap-2 text-sm text-white/60">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t('beta.aiSearch.costInfo')}</span>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
              {error}
            </div>
          )}

          {results && (
            <>
              {/* Query Analysis */}
              {results.query_analysis && (
                <div className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-semibold text-white/80 mb-2">
                    {t('beta.aiSearch.queryAnalysis')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {results.query_analysis.mood && (
                      <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-300">
                        {results.query_analysis.mood}
                      </span>
                    )}
                    {results.query_analysis.genres?.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-300"
                      >
                        {genre}
                      </span>
                    ))}
                    {results.query_analysis.language && (
                      <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-sm text-green-300">
                        {results.query_analysis.language}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Results Count & Credits */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/60">
                  {t('beta.aiSearch.resultsCount', { count: results.total_results })}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-white/60">{t('beta.credits.charged')}:</span>
                  <span className="text-white font-semibold">{results.credits_charged}</span>
                  <span className="text-white/60">•</span>
                  <span className="text-white/60">{t('beta.credits.remaining')}:</span>
                  <span className="text-white font-semibold">{results.credits_remaining}</span>
                </div>
              </div>

              {/* Results Grid */}
              {results.total_results === 0 ? (
                <div className="text-center py-12 text-white/60">
                  {t('beta.aiSearch.noResults')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => onSelectResult?.(result)}
                      className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all text-left"
                    >
                      <div className="flex gap-4">
                        {result.poster && (
                          <img
                            src={result.poster}
                            alt={result.title}
                            className="w-20 h-28 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-white font-semibold group-hover:text-blue-300 transition-colors">
                              {result.title}
                            </h4>
                            <span className="text-xs px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-blue-300 whitespace-nowrap">
                              {Math.round(result.relevance_score)}%
                            </span>
                          </div>
                          <p className="text-sm text-white/60 line-clamp-3">{result.description}</p>
                          <div className="mt-2">
                            <span className="text-xs px-2 py-1 bg-white/5 rounded text-white/60">
                              {result.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {!results && !error && !searching && (
            <div className="text-center py-12 text-white/60">
              <svg className="w-16 h-16 mx-auto mb-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>{t('beta.aiSearch.emptyState')}</p>
              <p className="text-sm mt-2 text-white/40">
                {t('beta.aiSearch.exampleQueries')}
              </p>
            </div>
          )}

          {searching && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-white/60">{t('beta.aiSearch.analyzing')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISearchModal;
