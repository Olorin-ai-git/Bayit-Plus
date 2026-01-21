/**
 * Investigation Domain Analysis Component
 *
 * Displays risk analysis for Location, Network, Logs, and Device domains.
 * Shows AI-generated thoughts and risk scores for each domain.
 */

import React from 'react';
import { Investigation } from '../../types/investigations';
import { getRiskBadgeStyles, getRiskSeverity } from '../utils/InvestigationRiskUtils';

interface InvestigationDomainAnalysisProps {
  investigation: Investigation;
}

interface DomainCardProps {
  title: string;
  riskScore?: number | null;
  thoughts?: string | null;
}

const DomainCard: React.FC<DomainCardProps> = ({ title, riskScore, thoughts }) => {
  const normalizedScore =
    riskScore !== null && riskScore !== undefined
      ? riskScore > 1
        ? riskScore
        : riskScore * 100
      : null;

  const severity = getRiskSeverity(normalizedScore);
  const badgeStyles = getRiskBadgeStyles(severity);

  return (
    <div className="bg-black/50 rounded-lg border border-corporate-borderSecondary/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h6 className="text-sm font-semibold text-corporate-textPrimary">{title}</h6>
        {normalizedScore !== null && (
          <span className={`text-xs px-2 py-1 rounded border ${badgeStyles.styles}`}>
            Risk: {normalizedScore.toFixed(1)}
          </span>
        )}
      </div>
      {thoughts && (
        <div className="bg-black/50 p-3 rounded border border-corporate-borderSecondary/20">
          <p className="text-xs text-corporate-textSecondary leading-relaxed whitespace-pre-wrap">
            {thoughts}
          </p>
        </div>
      )}
    </div>
  );
};

export const InvestigationDomainAnalysis: React.FC<InvestigationDomainAnalysisProps> = ({
  investigation,
}) => {
  const hasLocationData =
    investigation.location_llm_thoughts || investigation.location_risk_score !== undefined;
  const hasNetworkData =
    investigation.network_llm_thoughts || investigation.network_risk_score !== undefined;
  const hasLogsData =
    investigation.logs_llm_thoughts || investigation.logs_risk_score !== undefined;
  const hasDeviceData =
    investigation.device_llm_thoughts || investigation.device_risk_score !== undefined;

  const hasDomainData = hasLocationData || hasNetworkData || hasLogsData || hasDeviceData;

  if (!hasDomainData) return null;

  return (
    <div className="bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40 p-4">
      <h5 className="text-sm font-semibold text-corporate-textPrimary mb-4">Domain Analysis</h5>
      <div className="space-y-4">
        {hasLocationData && (
          <DomainCard
            title="Location"
            riskScore={investigation.location_risk_score}
            thoughts={investigation.location_llm_thoughts}
          />
        )}

        {hasNetworkData && (
          <DomainCard
            title="Network"
            riskScore={investigation.network_risk_score}
            thoughts={investigation.network_llm_thoughts}
          />
        )}

        {hasLogsData && (
          <DomainCard
            title="Logs"
            riskScore={investigation.logs_risk_score}
            thoughts={investigation.logs_llm_thoughts}
          />
        )}

        {hasDeviceData && (
          <DomainCard
            title="Device"
            riskScore={investigation.device_risk_score}
            thoughts={investigation.device_llm_thoughts}
          />
        )}
      </div>
    </div>
  );
};
