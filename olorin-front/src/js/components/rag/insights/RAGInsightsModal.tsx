import React, { useState, useEffect } from 'react';
import RAGAnalyticsDashboard from './RAGAnalyticsDashboard';
import RAGPerformanceCharts from './RAGPerformanceCharts';
import { RAGInsightsModalProps, RAGInsight, RAGMetrics } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

/**
 * RAG Insights Modal Component
 * Comprehensive analytics dashboard for RAG system performance and insights
 */
const RAGInsightsModal: React.FC<RAGInsightsModalProps> = ({
  isOpen,
  onClose,
  insights,
  metrics,
  investigationId,
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'performance' | 'insights'>('overview');
  const [liveMetrics, setLiveMetrics] = useState<RAGMetrics>(metrics);
  const [liveInsights, setLiveInsights] = useState<RAGInsight[]>(insights);

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onPerformanceUpdate: (data) => {
      setLiveMetrics(data.metrics);
    },
    onRAGEvent: (event) => {
      // Convert RAG event to insight format
      const newInsight: RAGInsight = {
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: event.type.replace('rag_', '') as any,
        agent: event.agent_type,
        operation: event.data.operation,
        sources: event.data.knowledge_sources || [],
        confidence: event.data.confidence_score || 0,
        timestamp: event.timestamp,
        details: event.data,
      };
      setLiveInsights(prev => [newInsight, ...prev].slice(0, 100)); // Keep last 100
    },
  });

  // Update local state when props change
  useEffect(() => {
    setLiveMetrics(metrics);
  }, [metrics]);

  useEffect(() => {
    setLiveInsights(insights);
  }, [insights]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'performance', name: 'Performance', icon: '⚡' },
    { id: 'insights', name: 'Insights', icon: '💡' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900" id="modal-title">
                RAG Analytics Dashboard
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Investigation: {investigationId} • Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </p>
            </div>
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="max-h-96 overflow-y-auto">
            {selectedTab === 'overview' && (
              <RAGAnalyticsDashboard 
                metrics={liveMetrics}
                insights={liveInsights}
                investigationId={investigationId}
              />
            )}
            {selectedTab === 'performance' && (
              <RAGPerformanceCharts 
                metrics={liveMetrics}
                investigationId={investigationId}
                realTime={true}
              />
            )}
            {selectedTab === 'insights' && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Recent RAG Insights ({liveInsights.length})
                  </h4>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {liveInsights.slice(0, 20).map((insight) => (
                      <div key={insight.id} className="bg-white rounded-md p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                              {insight.type.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{insight.agent}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {new Date(insight.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              insight.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                              insight.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {(insight.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{insight.operation}</p>
                        {insight.sources.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">Sources:</span>
                            <div className="flex flex-wrap gap-1">
                              {insight.sources.slice(0, 3).map((source, idx) => (
                                <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  {source}
                                </span>
                              ))}
                              {insight.sources.length > 3 && (
                                <span className="text-xs text-gray-500">+{insight.sources.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              onClick={() => setSelectedTab('overview')}
            >
              Reset View
            </button>
            <button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGInsightsModal;