import React, { useMemo } from 'react';
import { AlertTriangle, Shield, TrendingUp, Eye, Info, Activity } from 'lucide-react';

interface RiskMetrics {
  overallScore: number;
  behavioralRisk: number;
  technicalRisk: number;
  locationRisk: number;
  deviceRisk: number;
  networkRisk: number;
  accountAge: number; // in days
  transactionVolume: number;
  anomalyCount: number;
  lastUpdated: string;
}

interface OverallRiskScoreProps {
  metrics: RiskMetrics;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  animated?: boolean;
  threshold?: {
    low: number;
    medium: number;
    high: number;
  };
  onScoreClick?: () => void;
}

const OverallRiskScore: React.FC<OverallRiskScoreProps> = ({
  metrics,
  className = '',
  size = 'md',
  showDetails = true,
  animated = true,
  threshold = { low: 30, medium: 60, high: 80 },
  onScoreClick,
}) => {
  // Calculate risk level based on overall score
  const riskLevel = useMemo(() => {
    if (metrics.overallScore <= threshold.low) return 'low';
    if (metrics.overallScore <= threshold.medium) return 'medium';
    if (metrics.overallScore <= threshold.high) return 'high';
    return 'critical';
  }, [metrics.overallScore, threshold]);

  // Get risk level styling
  const getRiskStyling = (level: string) => {
    const styles = {
      low: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        icon: 'text-green-600',
        progress: 'bg-green-500',
        ring: 'ring-green-100',
      },
      medium: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: 'text-yellow-600',
        progress: 'bg-yellow-500',
        ring: 'ring-yellow-100',
      },
      high: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        icon: 'text-orange-600',
        progress: 'bg-orange-500',
        ring: 'ring-orange-100',
      },
      critical: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'text-red-600',
        progress: 'bg-red-500',
        ring: 'ring-red-100',
      },
    };
    return styles[level as keyof typeof styles] || styles.medium;
  };

  const styling = getRiskStyling(riskLevel);

  // Size variants
  const sizeClasses = {
    sm: {
      container: 'p-4',
      score: 'text-3xl',
      subScore: 'text-sm',
      icon: 'w-5 h-5',
      label: 'text-xs',
    },
    md: {
      container: 'p-6',
      score: 'text-5xl',
      subScore: 'text-base',
      icon: 'w-6 h-6',
      label: 'text-sm',
    },
    lg: {
      container: 'p-8',
      score: 'text-7xl',
      subScore: 'text-lg',
      icon: 'w-8 h-8',
      label: 'text-base',
    },
  };

  const sizeClass = sizeClasses[size];

  // Get icon for risk level
  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'low':
        return <Shield className={`${sizeClass.icon} ${styling.icon}`} />;
      case 'medium':
        return <Eye className={`${sizeClass.icon} ${styling.icon}`} />;
      case 'high':
        return <TrendingUp className={`${sizeClass.icon} ${styling.icon}`} />;
      case 'critical':
        return <AlertTriangle className={`${sizeClass.icon} ${styling.icon}`} />;
      default:
        return <Info className={`${sizeClass.icon} ${styling.icon}`} />;
    }
  };

  // Calculate category risk scores for breakdown
  const categoryRisks = [
    { name: 'Behavioral', score: metrics.behavioralRisk, color: 'blue' },
    { name: 'Technical', score: metrics.technicalRisk, color: 'purple' },
    { name: 'Location', score: metrics.locationRisk, color: 'green' },
    { name: 'Device', score: metrics.deviceRisk, color: 'orange' },
    { name: 'Network', score: metrics.networkRisk, color: 'red' },
  ];

  // Format time since last update
  const getTimeSinceUpdate = () => {
    const updateTime = new Date(metrics.lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - updateTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm ${styling.border} ${className}`}>
      {/* Main Score Display */}
      <div
        className={`${styling.bg} ${sizeClass.container} rounded-t-xl cursor-pointer transition-all duration-200 hover:${styling.ring} hover:ring-4`}
        onClick={onScoreClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getRiskIcon()}
            <div>
              <h3 className={`font-bold ${styling.text} ${sizeClass.label} uppercase tracking-wide`}>
                Overall Risk Score
              </h3>
              <p className={`${styling.text} opacity-75 ${sizeClass.label} capitalize`}>
                {riskLevel} Risk Level
              </p>
            </div>
          </div>

          <div className="text-center">
            <div className={`font-bold ${styling.text} ${sizeClass.score} leading-none`}>
              {Math.round(metrics.overallScore)}
            </div>
            <div className={`${styling.text} opacity-75 ${sizeClass.label}`}>/ 100</div>
          </div>
        </div>

        {/* Circular Progress Indicator */}
        <div className="flex justify-center mt-4">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-white opacity-20"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={styling.text}
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - metrics.overallScore / 100)}`}
                style={{
                  transition: animated ? 'stroke-dashoffset 1s ease-in-out' : 'none',
                  transitionDelay: animated ? '0.3s' : '0s',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className={`${sizeClass.icon} ${styling.icon}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Category Breakdown */}
      {showDetails && (
        <div className="p-6 space-y-4">
          <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
            Risk Breakdown
          </h4>

          <div className="grid grid-cols-5 gap-3">
            {categoryRisks.map((category) => {
              const categoryLevel = category.score <= threshold.low ? 'low' :
                                 category.score <= threshold.medium ? 'medium' :
                                 category.score <= threshold.high ? 'high' : 'critical';
              const categoryStyling = getRiskStyling(categoryLevel);

              return (
                <div key={category.name} className="text-center">
                  <div className={`${categoryStyling.bg} ${categoryStyling.border} border rounded-lg p-3`}>
                    <div className={`font-bold ${categoryStyling.text} text-lg`}>
                      {Math.round(category.score)}
                    </div>
                    <div className={`${categoryStyling.text} text-xs mt-1 font-medium`}>
                      {category.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {metrics.accountAge}
              </div>
              <div className="text-xs text-gray-600">Days Old</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                ${metrics.transactionVolume.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">Volume</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {metrics.anomalyCount}
              </div>
              <div className="text-xs text-gray-600">Anomalies</div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="flex items-center justify-center pt-2 text-xs text-gray-500">
            <Activity className="w-3 h-3 mr-1" />
            Updated {getTimeSinceUpdate()}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverallRiskScore;