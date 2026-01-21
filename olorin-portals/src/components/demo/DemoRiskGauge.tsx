/**
 * Demo Risk Gauge Component
 *
 * Animated circular gauge displaying the overall risk score.
 */

import React, { useEffect, useState } from 'react';

interface DemoRiskGaugeProps {
  score: number; // 0-100
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const getRiskLevel = (score: number): { label: string; color: string } => {
  if (score >= 80) return { label: 'CRITICAL', color: '#ef4444' };
  if (score >= 60) return { label: 'HIGH', color: '#f97316' };
  if (score >= 40) return { label: 'MEDIUM', color: '#eab308' };
  if (score >= 20) return { label: 'LOW', color: '#22c55e' };
  return { label: 'MINIMAL', color: '#10b981' };
};

const getSizeConfig = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return { diameter: 120, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-xs' };
    case 'lg':
      return { diameter: 200, strokeWidth: 12, fontSize: 'text-5xl', labelSize: 'text-sm' };
    default:
      return { diameter: 160, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-sm' };
  }
};

export const DemoRiskGauge: React.FC<DemoRiskGaugeProps> = ({
  score,
  label = 'Risk Score',
  size = 'md',
  animated = true,
}) => {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const { diameter, strokeWidth, fontSize, labelSize } = getSizeConfig(size);
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const riskInfo = getRiskLevel(score);

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }

    // Animate the score
    const duration = 1500;
    const startTime = Date.now();
    const startScore = displayScore;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentScore = startScore + (score - startScore) * easeOut;

      setDisplayScore(currentScore);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, animated]);

  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: diameter, height: diameter }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={diameter} height={diameter}>
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-corporate-bgTertiary"
          />
          {/* Progress circle */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            stroke={riskInfo.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
            style={{
              filter: `drop-shadow(0 0 8px ${riskInfo.color}50)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${fontSize} font-bold text-corporate-textPrimary`}>{Math.round(displayScore)}</span>
          <span className={`${labelSize} font-medium`} style={{ color: riskInfo.color }}>
            {riskInfo.label}
          </span>
        </div>
      </div>

      {label && <span className="mt-4 text-corporate-textMuted text-sm">{label}</span>}
    </div>
  );
};

export default DemoRiskGauge;
