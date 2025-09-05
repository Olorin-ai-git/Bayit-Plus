import React, { useState, useMemo } from 'react';
import { RAGDomainUtilizationProps, RAGDomainMetrics } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';
import RAGDomainCard from './RAGDomainCard';
import RAGDomainChartView from './RAGDomainChartView';

/**
 * RAG Domain Utilization Component
 * Analyzes domain-specific knowledge patterns and utilization
 */
const RAGDomainUtilization: React.FC<RAGDomainUtilizationProps> = ({
  investigationId,
  domains = [],
  timeframe = '24h',
  showTrends = true,
}) => {
  const [liveDomains, setLiveDomains] = useState<RAGDomainMetrics[]>(domains);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'chart'>('grid');

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onDomainUpdate: (data) => {
      setLiveDomains(data.domains);
    },
    onRAGEvent: (event) => {
      // Update domain metrics based on RAG events
      if (event.data.domain) {
        setLiveDomains(prev => prev.map(domain => 
          domain.name === event.data.domain 
            ? { ...domain, queryCount: domain.queryCount + 1 }
            : domain
        ));
      }
    },
  });

  const sortedDomains = useMemo(() => {
    return [...liveDomains].sort((a, b) => b.utilizationScore - a.utilizationScore);
  }, [liveDomains]);

  const totalQueries = liveDomains.reduce((sum, domain) => sum + domain.queryCount, 0);
  const avgUtilization = liveDomains.length > 0 
    ? liveDomains.reduce((sum, domain) => sum + domain.utilizationScore, 0) / liveDomains.length 
    : 0;

  const renderDomainCard = (domain: RAGDomainMetrics) => {
    const isSelected = selectedDomain === domain.name;
    
    return (
      <RAGDomainCard
        key={domain.name}
        domain={domain}
        totalQueries={totalQueries}
        isSelected={isSelected}
        showTrends={showTrends}
        onSelect={setSelectedDomain}
      />
    );
  };

  const renderChartView = () => {
    return (
      <RAGDomainChartView
        domains={sortedDomains}
        totalQueries={totalQueries}
        showTrends={showTrends}
      />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Domain Utilization</h3>
            <p className="text-sm text-gray-500">
              {liveDomains.length} domains • {totalQueries} total queries • Avg utilization: {(avgUtilization * 100).toFixed(1)}%
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 border rounded-md">
              {['grid', 'list', 'chart'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === mode 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {mode === 'grid' && '🔲'}
                  {mode === 'list' && '🗺️'}
                  {mode === 'chart' && '📉'}
                </button>
              ))}
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span>{isConnected ? 'Live' : 'Static'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {liveDomains.length > 0 ? (
          <div>
            {viewMode === 'chart' ? (
              renderChartView()
            ) : (
              <div className={`${
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                  : 'space-y-4'
              }`}>
                {sortedDomains.map(renderDomainCard)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📁</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Domain Data Available</h4>
            <p className="text-sm text-gray-500">
              Domain utilization metrics will appear here once queries are processed.
            </p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {liveDomains.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{liveDomains.length}</div>
              <div className="text-xs text-gray-500">Active Domains</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {liveDomains.filter(d => d.utilizationScore >= 0.8).length}
              </div>
              <div className="text-xs text-gray-500">High Utilization</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {(avgUtilization * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Avg Utilization</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {totalQueries}
              </div>
              <div className="text-xs text-gray-500">Total Queries</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGDomainUtilization;