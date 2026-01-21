/**
 * Investigation Header Component
 *
 * Displays investigation name, status, owner, entity, and risk indicator.
 */

import React from 'react';
import { Investigation } from '../../types/investigations';
import { StatusBadge } from '../common/StatusBadge';

interface InvestigationHeaderProps {
  investigation: Investigation;
  riskSeverity: 'no-risk' | 'low' | 'medium' | 'high';
  riskBadgeColor: string;
}

export const InvestigationHeader: React.FC<InvestigationHeaderProps> = ({
  investigation,
  riskSeverity,
  riskBadgeColor,
}) => {
  const getRiskIcon = () => {
    if (riskSeverity === 'high') {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: riskBadgeColor }}>
          <path d="M12 2L2 22h20L12 2zm0 6l6 10H6l6-10z" />
        </svg>
      );
    }
    if (riskSeverity === 'medium') {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: riskBadgeColor }}>
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: riskBadgeColor }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
    );
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2"
        style={{
          borderColor: riskBadgeColor,
          backgroundColor: `${riskBadgeColor}20`,
        }}
      >
        {getRiskIcon()}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-xl font-semibold text-corporate-textPrimary">
            {investigation.name || investigation.id}
          </h4>
          <StatusBadge status={investigation.status} />
        </div>
        {investigation.owner && (
          <p className="text-sm text-corporate-textSecondary">
            Owner: <span className="font-medium text-corporate-accentPrimary">{investigation.owner}</span>
          </p>
        )}
        {investigation.entity_id && (
          <p className="text-sm text-corporate-textSecondary">
            Entity: <span className="font-medium text-corporate-accentPrimary">{investigation.entity_id}</span>
            {investigation.entity_type && (
              <span className="ml-2 text-corporate-textTertiary">({investigation.entity_type})</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
};
