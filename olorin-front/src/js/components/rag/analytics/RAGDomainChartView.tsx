import React from 'react';
import { RAGDomainMetrics } from '../../../types/RAGTypes';

interface RAGDomainChartViewProps {
  domains: RAGDomainMetrics[];
  totalQueries: number;
  showTrends: boolean;
}

const RAGDomainChartView: React.FC<RAGDomainChartViewProps> = ({
  domains,
  totalQueries,
  showTrends,
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

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return '📈 ↑';
    if (trend < -5) return '📉 ↓';
    return '➡️';
  };

  const maxQueries = Math.max(...domains.map(d => d.queryCount));
  
  return (
    <div className="space-y-4">
      {domains.map((domain) => {
        const barWidth = (domain.queryCount / maxQueries) * 100;
        const utilizationPercentage = (domain.queryCount / Math.max(1, totalQueries)) * 100;
        
        return (
          <div key={domain.name} className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getDomainIcon(domain.name)}</span>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 capitalize">
                    {domain.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {domain.queryCount} queries ({utilizationPercentage.toFixed(1)}%)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  getUtilizationColor(domain.utilizationScore).split(' ')[0]
                }`}>
                  {(domain.utilizationScore * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">
                  {(domain.successRate * 100).toFixed(0)}% success
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div 
                  className={`h-6 rounded-full flex items-center px-3 text-white text-xs font-medium ${
                    domain.utilizationScore >= 0.8 ? 'bg-green-500' :
                    domain.utilizationScore >= 0.6 ? 'bg-blue-500' :
                    domain.utilizationScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(15, barWidth)}%` }}
                >
                  {barWidth > 15 && `${domain.queryCount} queries`}
                </div>
              </div>
              {showTrends && domain.trend !== undefined && (
                <div className="absolute right-0 top-0 -mt-6 text-xs text-gray-500">
                  {getTrendIcon(domain.trend)} {domain.trend > 0 ? '+' : ''}{domain.trend.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RAGDomainChartView;