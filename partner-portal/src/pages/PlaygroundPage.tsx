/**
 * API Playground Page
 *
 * Test B2B API endpoints with sample requests.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../stores/uiStore';
import { getB2BApiUrl } from '../config/env';
import { getApiClient } from '../services/api';
import { PageHeader, LoadingSpinner } from '../components/common';

type PlaygroundTab = 'fraud' | 'content';

interface ApiResponse {
  data: unknown;
  latencyMs: number;
  requestId: string;
}

export const PlaygroundPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PlaygroundTab>('fraud');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  // Fraud Detection Form
  const [entityType, setEntityType] = useState('user');
  const [entityId, setEntityId] = useState('');

  // Content AI Form
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');

  const executeRequest = async (endpoint: string, body: unknown) => {
    setIsLoading(true);
    setResponse(null);

    const startTime = performance.now();

    try {
      const client = getApiClient();
      const result = await client.post(getB2BApiUrl(endpoint), body);
      const latencyMs = Math.round(performance.now() - startTime);

      setResponse({
        data: result.data,
        latencyMs,
        requestId: result.headers['x-request-id'] || 'N/A',
      });
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startTime);
      const errorData = error instanceof Error ? { error: error.message } : { error: 'Unknown error' };

      setResponse({
        data: errorData,
        latencyMs,
        requestId: 'N/A',
      });
      toast.error(t('errors.serverError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRiskAssessment = () => {
    if (!entityId) {
      toast.error(t('common.required'));
      return;
    }
    executeRequest('/capabilities/fraud/risk-assessment', {
      entity_type: entityType,
      entity_id: entityId,
    });
  };

  const handleAnomalyDetection = () => {
    if (!entityId) {
      toast.error(t('common.required'));
      return;
    }
    executeRequest('/capabilities/fraud/anomaly-detection', {
      entity_type: entityType,
      entity_id: entityId,
      timeframe: '24h',
    });
  };

  const handleSemanticSearch = () => {
    if (!query) {
      toast.error(t('common.required'));
      return;
    }
    executeRequest('/capabilities/content/semantic-search', {
      query,
      limit: 10,
    });
  };

  const handleCulturalContext = () => {
    if (!text) {
      toast.error(t('common.required'));
      return;
    }
    executeRequest('/capabilities/content/cultural-context', {
      text,
    });
  };

  const handleRecapAgent = () => {
    executeRequest('/capabilities/content/recap-agent', {
      action: 'status',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title={t('playground.title')}
        description="Test B2B API endpoints with sample requests"
      />

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setActiveTab('fraud');
            setResponse(null);
          }}
          className={`
            px-6 py-3 rounded-xl text-sm font-medium transition-colors
            ${
              activeTab === 'fraud'
                ? 'bg-partner-primary text-white'
                : 'bg-white/10 text-white/60 hover:text-white'
            }
          `}
        >
          {t('playground.fraudDetection')}
        </button>
        <button
          onClick={() => {
            setActiveTab('content');
            setResponse(null);
          }}
          className={`
            px-6 py-3 rounded-xl text-sm font-medium transition-colors
            ${
              activeTab === 'content'
                ? 'bg-partner-primary text-white'
                : 'bg-white/10 text-white/60 hover:text-white'
            }
          `}
        >
          {t('playground.contentAI')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Panel */}
        <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Request</h2>

          {activeTab === 'fraud' && (
            <div className="space-y-6">
              {/* Entity Type */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('playground.entityType')}
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/5 border border-white/10
                    text-white
                    focus:outline-none focus:border-partner-primary
                  "
                >
                  <option value="user">User</option>
                  <option value="transaction">Transaction</option>
                  <option value="device">Device</option>
                  <option value="account">Account</option>
                </select>
              </div>

              {/* Entity ID */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('playground.entityId')}
                </label>
                <input
                  type="text"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/5 border border-white/10
                    text-white placeholder-white/40
                    focus:outline-none focus:border-partner-primary
                  "
                  placeholder="user_123"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRiskAssessment}
                  disabled={isLoading}
                  className="
                    w-full py-3 rounded-xl
                    bg-yellow-600 text-white font-medium
                    hover:bg-yellow-700
                    disabled:opacity-50
                    transition-colors
                  "
                >
                  {t('playground.riskAssessment')}
                </button>
                <button
                  onClick={handleAnomalyDetection}
                  disabled={isLoading}
                  className="
                    w-full py-3 rounded-xl
                    bg-orange-600 text-white font-medium
                    hover:bg-orange-700
                    disabled:opacity-50
                    transition-colors
                  "
                >
                  {t('playground.anomalyDetection')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Query */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('playground.query')}
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/5 border border-white/10
                    text-white placeholder-white/40
                    focus:outline-none focus:border-partner-primary
                  "
                  placeholder="Search for content..."
                />
              </div>

              {/* Text */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('playground.text')}
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/5 border border-white/10
                    text-white placeholder-white/40
                    focus:outline-none focus:border-partner-primary
                    resize-none
                  "
                  placeholder="Enter text for cultural context analysis..."
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSemanticSearch}
                  disabled={isLoading}
                  className="
                    w-full py-3 rounded-xl
                    bg-cyan-600 text-white font-medium
                    hover:bg-cyan-700
                    disabled:opacity-50
                    transition-colors
                  "
                >
                  {t('playground.semanticSearch')}
                </button>
                <button
                  onClick={handleCulturalContext}
                  disabled={isLoading}
                  className="
                    w-full py-3 rounded-xl
                    bg-purple-600 text-white font-medium
                    hover:bg-purple-700
                    disabled:opacity-50
                    transition-colors
                  "
                >
                  {t('playground.culturalContext')}
                </button>
                <button
                  onClick={handleRecapAgent}
                  disabled={isLoading}
                  className="
                    w-full py-3 rounded-xl
                    bg-indigo-600 text-white font-medium
                    hover:bg-indigo-700
                    disabled:opacity-50
                    transition-colors
                  "
                >
                  {t('playground.recapAgent')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Response Panel */}
        <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">{t('playground.response')}</h2>
            {response && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white/60">
                  {t('playground.latency')}: <span className="text-white">{response.latencyMs}ms</span>
                </span>
                <span className="text-white/60">
                  {t('playground.requestId')}: <span className="text-white font-mono">{response.requestId.slice(0, 8)}</span>
                </span>
              </div>
            )}
          </div>

          <div className="h-96 overflow-auto rounded-xl bg-black/30 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner size="lg" />
              </div>
            ) : response ? (
              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-white/40">
                Execute a request to see the response
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundPage;
