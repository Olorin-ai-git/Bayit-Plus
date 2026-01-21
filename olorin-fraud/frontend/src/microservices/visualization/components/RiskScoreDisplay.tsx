import React, { useState, useMemo } from 'react';
import { AlertTriangle, Shield, TrendingUp, Info, Eye, ChevronDown, ChevronUp } from 'lucide-react';

interface RiskFactor {
  id: string;
  name: string;
  score: number;
  weight: number;
  description?: string;
  category: 'behavioral' | 'technical' | 'location' | 'device' | 'network';
  status: 'normal' | 'warning' | 'critical';
}

interface RiskScoreDisplayProps {
  overallScore: number;
  riskFactors: RiskFactor[];
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  threshold?: {
    low: number;
    medium: number;
    high: number;
  };
}

const RiskScoreDisplay: React.FC<RiskScoreDisplayProps> = ({
  overallScore,
  riskFactors = [],
  className = '',
  showDetails = true,
  size = 'md',
  animated = true,
  threshold = { low: 30, medium: 60, high: 80 },
}) => {
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Calculate risk level based on score
  const riskLevel = useMemo(() => {
    if (overallScore <= threshold.low) return 'low';
    if (overallScore <= threshold.medium) return 'medium';
    if (overallScore <= threshold.high) return 'high';
    return 'critical';
  }, [overallScore, threshold]);

  // Get risk level styling
  const getRiskStyling = (level: string) => {
    const styles = {
      low: {
        bg: 'bg-green-100',
        border: 'border-green-300',
        text: 'text-green-800',
        icon: 'text-green-600',
        progress: 'bg-green-500',
      },
      medium: {
        bg: 'bg-yellow-100',
        border: 'border-yellow-300',
        text: 'text-yellow-800',
        icon: 'text-yellow-600',
        progress: 'bg-yellow-500',
      },
      high: {
        bg: 'bg-orange-100',
        border: 'border-orange-300',
        text: 'text-orange-800',
        icon: 'text-orange-600',
        progress: 'bg-orange-500',
      },
      critical: {
        bg: 'bg-red-100',
        border: 'border-red-300',
        text: 'text-red-800',
        icon: 'text-red-600',
        progress: 'bg-red-500',
      },
    };
    return styles[level as keyof typeof styles] || styles.medium;
  };

  const styling = getRiskStyling(riskLevel);

  // Size variants
  const sizeClasses = {
    sm: {
      container: 'p-4',
      score: 'text-2xl',
      label: 'text-sm',
      progress: 'h-2',
    },
    md: {
      container: 'p-6',
      score: 'text-4xl',
      label: 'text-base',
      progress: 'h-3',
    },
    lg: {
      container: 'p-8',
      score: 'text-6xl',
      label: 'text-lg',
      progress: 'h-4',
    },
  };

  const sizeClass = sizeClasses[size];

  // Group risk factors by category
  const categorizedFactors = useMemo(() => {
    const categories = riskFactors.reduce((acc, factor) => {
      if (!acc[factor.category]) {
        acc[factor.category] = [];
      }
      acc[factor.category].push(factor);
      return acc;
    }, {} as Record<string, RiskFactor[]>);

    // Sort factors within each category by score (highest first)
    Object.keys(categories).forEach(cat => {
      categories[cat].sort((a, b) => b.score - a.score);
    });

    return categories;
  }, [riskFactors]);

  // Get icon for risk level
  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'low':
        return <Shield className={`w-6 h-6 ${styling.icon}`} />;
      case 'medium':
        return <Eye className={`w-6 h-6 ${styling.icon}`} />;
      case 'high':
        return <TrendingUp className={`w-6 h-6 ${styling.icon}`} />;
      case 'critical':
        return <AlertTriangle className={`w-6 h-6 ${styling.icon}`} />;
      default:
        return <Info className={`w-6 h-6 ${styling.icon}`} />;
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Main Risk Score Display */}
      <div className={`${styling.bg} ${styling.border} border ${sizeClass.container} rounded-t-lg`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getRiskIcon()}
            <div>
              <h3 className={`font-semibold ${styling.text} ${sizeClass.label}`}>
                Risk Assessment
              </h3>
              <p className={`text-sm ${styling.text} opacity-75 capitalize`}>
                {riskLevel} Risk Level
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-bold ${styling.text} ${sizeClass.score}`}>
              {Math.round(overallScore)}
            </div>
            <div className={`text-sm ${styling.text} opacity-75`}>/ 100</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className={`w-full ${sizeClass.progress} bg-white bg-opacity-50 rounded-full overflow-hidden`}>
            <div
              className={`${styling.progress} ${sizeClass.progress} rounded-full transition-all duration-1000 ease-out`}
              style={{
                width: animated ? `${Math.min(overallScore, 100)}%` : `${Math.min(overallScore, 100)}%`,
                transitionDelay: animated ? '0.3s' : '0s',
              }}
            />
          </div>
          {/* Threshold markers */}
          <div className="absolute top-0 left-0 w-full h-full flex items-center">
            {[threshold.low, threshold.medium, threshold.high].map((thresh, index) => (
              <div
                key={index}
                className="absolute w-0.5 h-full bg-white bg-opacity-60"
                style={{ left: `${thresh}%` }}
              />
            ))}
          </div>
        </div>

        {/* Threshold Labels */}
        <div className="flex justify-between text-xs mt-2 opacity-75">
          <span className={styling.text}>Low (0-{threshold.low})</span>
          <span className={styling.text}>Medium ({threshold.low+1}-{threshold.medium})</span>
          <span className={styling.text}>High ({threshold.medium+1}-{threshold.high})</span>
          <span className={styling.text}>Critical ({threshold.high+1}+)</span>
        </div>
      </div>

      {/* Risk Factor Details */}
      {showDetails && riskFactors.length > 0 && (
        <div className="border-t border-gray-200">
          <button
            onClick={() => setExpandedDetails(!expandedDetails)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-900">Risk Factor Breakdown</span>
            {expandedDetails ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {expandedDetails && (
            <div className="px-4 pb-4">
              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedCategory === null
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({riskFactors.length})
                </button>
                {Object.keys(categorizedFactors).map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors capitalize ${
                      selectedCategory === category
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category} ({categorizedFactors[category].length})
                  </button>
                ))}
              </div>

              {/* Risk Factors List */}
              <div className="space-y-2">
                {(selectedCategory
                  ? categorizedFactors[selectedCategory] || []
                  : riskFactors
                ).map((factor) => {
                  const factorStyling = getRiskStyling(factor.status);
                  return (
                    <div
                      key={factor.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{factor.name}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${factorStyling.bg} ${factorStyling.text}`}>
                            {factor.category}
                          </span>
                        </div>
                        {factor.description && (
                          <p className="text-sm text-gray-600 mt-1">{factor.description}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className={`font-bold ${factorStyling.text}`}>
                          {Math.round(factor.score)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Weight: {factor.weight}x
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">
              {riskFactors.filter(f => f.status === 'critical').length}
            </div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {riskFactors.filter(f => f.status === 'warning').length}
            </div>
            <div className="text-xs text-gray-600">Warning</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {riskFactors.filter(f => f.status === 'normal').length}
            </div>
            <div className="text-xs text-gray-600">Normal</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskScoreDisplay;