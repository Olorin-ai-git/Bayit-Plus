import React from 'react';

interface RiskScoreDisplayProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercentage?: boolean;
  className?: string;
}

export const RiskScoreDisplay: React.FC<RiskScoreDisplayProps> = ({
  score,
  maxScore = 100,
  size = 'md',
  showLabel = true,
  showPercentage = true,
  className = ''
}) => {
  const normalizedScore = Math.min(Math.max(score, 0), maxScore);
  const percentage = (normalizedScore / maxScore) * 100;

  const getRiskLevel = (percentage: number) => {
    if (percentage >= 80) return { level: 'Critical', color: 'red' };
    if (percentage >= 60) return { level: 'High', color: 'orange' };
    if (percentage >= 40) return { level: 'Medium', color: 'yellow' };
    if (percentage >= 20) return { level: 'Low', color: 'green' };
    return { level: 'Minimal', color: 'green' };
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return {
          bg: 'bg-red-500',
          text: 'text-red-600',
          border: 'border-red-200',
          bgLight: 'bg-red-50'
        };
      case 'orange':
        return {
          bg: 'bg-orange-500',
          text: 'text-orange-600',
          border: 'border-orange-200',
          bgLight: 'bg-orange-50'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-500',
          text: 'text-yellow-600',
          border: 'border-yellow-200',
          bgLight: 'bg-yellow-50'
        };
      case 'green':
      default:
        return {
          bg: 'bg-green-500',
          text: 'text-green-600',
          border: 'border-green-200',
          bgLight: 'bg-green-50'
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-16 h-16',
          text: 'text-sm',
          label: 'text-xs',
          stroke: '4'
        };
      case 'lg':
        return {
          container: 'w-32 h-32',
          text: 'text-2xl',
          label: 'text-base',
          stroke: '8'
        };
      case 'md':
      default:
        return {
          container: 'w-24 h-24',
          text: 'text-lg',
          label: 'text-sm',
          stroke: '6'
        };
    }
  };

  const riskInfo = getRiskLevel(percentage);
  const colors = getColorClasses(riskInfo.color);
  const sizes = getSizeClasses(size);

  const radius = size === 'sm' ? 28 : size === 'lg' ? 56 : 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {/* Circular Progress */}
      <div className={`relative ${sizes.container}`}>
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
          {/* Background Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth={sizes.stroke}
            fill="transparent"
            className="text-gray-200"
          />

          {/* Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth={sizes.stroke}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={colors.bg}
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>

        {/* Score Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`font-bold ${colors.text} ${sizes.text}`}>
              {showPercentage ? `${Math.round(percentage)}%` : Math.round(normalizedScore)}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Level Label */}
      {showLabel && (
        <div className="text-center">
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${sizes.label} font-medium ${colors.text} ${colors.bgLight} ${colors.border} border`}>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              {riskInfo.level === 'Critical' && (
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              )}
              {(riskInfo.level === 'High' || riskInfo.level === 'Medium') && (
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              )}
              {(riskInfo.level === 'Low' || riskInfo.level === 'Minimal') && (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              )}
            </svg>
            {riskInfo.level} Risk
          </div>
        </div>
      )}

      {/* Score Details */}
      {showPercentage && (
        <div className="text-center">
          <div className="text-xs text-gray-500">
            {Math.round(normalizedScore)}/{maxScore} points
          </div>
        </div>
      )}
    </div>
  );
};