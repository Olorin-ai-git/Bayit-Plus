import React from 'react';
import { RAGToolAlternative } from '../../../types/RAGTypes';

interface RAGAlternativeComparisonProps {
  alternatives: RAGToolAlternative[];
  primaryTool?: string;
}

/**
 * RAG Alternative Comparison Component
 * Side-by-side comparison of alternative tools
 */
const RAGAlternativeComparison: React.FC<RAGAlternativeComparisonProps> = ({
  alternatives,
  primaryTool,
}) => {
  const metrics = ['suitabilityScore', 'confidence'] as const;
  const maxValues = {
    suitabilityScore: Math.max(...alternatives.map(a => a.suitabilityScore)),
    confidence: Math.max(...alternatives.map(a => a.confidence)),
  };

  const sortedAlternatives = [...alternatives].sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  return (
    <div className="space-y-4">
      {metrics.map(metric => (
        <div key={metric} className="bg-white border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 capitalize">
            {metric === 'suitabilityScore' ? 'Suitability Score' : 'Confidence Level'} Comparison
          </h4>
          <div className="space-y-3">
            {sortedAlternatives.map((alt, index) => {
              const value = alt[metric] as number;
              const barWidth = (value / maxValues[metric]) * 100;
              const isPrimary = alt.name === primaryTool;
              
              return (
                <div key={alt.name} className="flex items-center space-x-3">
                  <div className="w-24 text-xs font-medium text-gray-700 truncate">
                    {alt.name}
                  </div>
                  <div className="flex-1 relative">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className={`h-4 rounded-full flex items-center px-2 text-white text-xs font-medium ${
                          isPrimary ? 'bg-indigo-600' :
                          value >= 0.8 ? 'bg-green-500' :
                          value >= 0.6 ? 'bg-blue-500' :
                          value >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(15, barWidth)}%` }}
                      >
                        {barWidth > 20 && `${(value * 100).toFixed(0)}%`}
                      </div>
                    </div>
                    {isPrimary && (
                      <span className="absolute -top-6 left-0 text-xs text-indigo-600 font-medium">
                        Primary Tool
                      </span>
                    )}
                  </div>
                  <div className="w-16 text-xs text-gray-600">
                    {(value * 100).toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RAGAlternativeComparison;
