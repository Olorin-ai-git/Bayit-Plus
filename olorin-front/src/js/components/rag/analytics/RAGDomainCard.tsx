import React from 'react';
import { RAGDomainMetrics } from '../../../types/RAGTypes';
import RAGDomainDetails from './RAGDomainDetails';

interface RAGDomainCardProps {
  domain: RAGDomainMetrics;
  totalQueries: number;
  isSelected: boolean;
  showTrends: boolean;
  onSelect: (domainName: string | null) => void;
}

const RAGDomainCard: React.FC<RAGDomainCardProps> = ({
  domain,
  totalQueries,
  isSelected,
  showTrends,
  onSelect,
}) => {
  const getDomainIcon = (domainName: string) => {
    const icons: Record<string, string> = {
      'security': '🔒',
      'fraud': '🕵️',
      'compliance': '📄',
      'risk': '⚠️',
      'device': '📱',
      'location': '🌍',
      'transaction': '💳',
      'network': '🌐',
      'behavioral': '🧠',
      'identity': '🆔',
      'general': '📊',
    };
    return icons[domainName.toLowerCase()] || '📁';
  };

  const getUtilizationColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 0.6) return 'text-blue-600 bg-blue-100 border-blue-200';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getUtilizationLevel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Moderate';
    return 'Low';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return '📈 ↑';
    if (trend < -5) return '📉 ↓';
    return '➡️';
  };

  const utilizationPercentage = (domain.queryCount / Math.max(1, totalQueries)) * 100;

  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={() => onSelect(isSelected ? null : domain.name)}
    >
      {/* Domain Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getDomainIcon(domain.name)}</span>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 capitalize">
              {domain.name} Domain
            </h4>
            <p className="text-xs text-gray-500">{domain.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            getUtilizationColor(domain.utilizationScore)
          }`}>
            {getUtilizationLevel(domain.utilizationScore)}
          </span>
          {showTrends && domain.trend !== undefined && (
            <span className="text-xs text-gray-500">
              {getTrendIcon(domain.trend)} {domain.trend > 0 ? '+' : ''}{domain.trend.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{domain.queryCount}</div>
          <div className="text-xs text-gray-500">Queries</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {utilizationPercentage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Share</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {(domain.successRate * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Success</div>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Utilization Score</span>
          <span>{(domain.utilizationScore * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              domain.utilizationScore >= 0.8 ? 'bg-green-500' :
              domain.utilizationScore >= 0.6 ? 'bg-blue-500' :
              domain.utilizationScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${domain.utilizationScore * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Top Topics */}
      {domain.topTopics && domain.topTopics.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-gray-700 mb-1">Popular Topics</h5>
          <div className="flex flex-wrap gap-1">
            {domain.topTopics.slice(0, 3).map((topic, idx) => (
              <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {topic}
              </span>
            ))}
            {domain.topTopics.length > 3 && (
              <span className="text-xs text-gray-500">+{domain.topTopics.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isSelected && <RAGDomainDetails domain={domain} />}
    </div>
  );
};

export default RAGDomainCard;