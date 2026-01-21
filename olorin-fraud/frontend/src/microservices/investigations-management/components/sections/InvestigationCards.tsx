/**
 * Investigation Cards Components
 *
 * Risk assessment, progress, metadata, and description cards.
 */

import React from 'react';
import { Investigation } from '../../types/investigations';
import { formatDate } from '../utils/InvestigationRiskUtils';

interface RiskCardProps {
  score: number;
  severity: 'no-risk' | 'low' | 'medium' | 'high';
  badgeStyles: string;
  badgeColor: string;
}

export const InvestigationRiskCard: React.FC<RiskCardProps> = ({ score, severity, badgeStyles, badgeColor }) => (
  <div className={`border-l-4 rounded-lg p-4 ${badgeStyles}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold uppercase tracking-wide">Risk Assessment</span>
      <span className="text-lg font-bold" style={{ color: badgeColor }}>
        {severity === 'no-risk' ? 'NO RISK' : severity.toUpperCase()}
      </span>
    </div>
    <div className="relative w-full h-3 bg-black/30 backdrop-blur rounded-full overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
        style={{ width: `${score}%`, backgroundColor: badgeColor }}
      />
    </div>
    <p className="text-xs mt-2 text-corporate-textSecondary">Risk Score: {score.toFixed(1)}/100</p>
  </div>
);

interface ProgressCardProps {
  progress: number;
}

export const InvestigationProgressCard: React.FC<ProgressCardProps> = ({ progress }) => (
  <div className="bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40 p-4">
    <h5 className="text-sm font-semibold text-corporate-textPrimary mb-3">Overall Progress</h5>
    <div className="relative w-full h-3 bg-black/30 backdrop-blur rounded-full overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary"
        style={{ width: `${progress}%` }}
      />
    </div>
    <p className="text-xs mt-2 text-corporate-textSecondary">Progress: {progress.toFixed(1)}%</p>
  </div>
);

interface MetadataCardProps {
  investigation: Investigation;
}

export const InvestigationMetadataCard: React.FC<MetadataCardProps> = ({ investigation }) => (
  <div className="bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40 p-4">
    <h5 className="text-sm font-semibold text-corporate-textPrimary mb-3">Investigation Details</h5>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-xs text-corporate-textTertiary">Investigation ID:</span>
        <span className="text-xs font-mono text-corporate-textSecondary">{investigation.id}</span>
      </div>
      {investigation.created && (
        <div className="flex justify-between">
          <span className="text-xs text-corporate-textTertiary">Created:</span>
          <span className="text-xs text-corporate-textSecondary">{formatDate(investigation.created)}</span>
        </div>
      )}
      {investigation.updated && (
        <div className="flex justify-between">
          <span className="text-xs text-corporate-textTertiary">Updated:</span>
          <span className="text-xs text-corporate-textSecondary">{formatDate(investigation.updated)}</span>
        </div>
      )}
      {investigation.from && (
        <div className="flex justify-between">
          <span className="text-xs text-corporate-textTertiary">From:</span>
          <span className="text-xs text-corporate-textSecondary">{formatDate(investigation.from)}</span>
        </div>
      )}
      {investigation.to && (
        <div className="flex justify-between">
          <span className="text-xs text-corporate-textTertiary">To:</span>
          <span className="text-xs text-corporate-textSecondary">{formatDate(investigation.to)}</span>
        </div>
      )}
      {investigation.riskModel && (
        <div className="flex justify-between">
          <span className="text-xs text-corporate-textTertiary">Risk Model:</span>
          <span className="text-xs text-corporate-textSecondary">{investigation.riskModel}</span>
        </div>
      )}
      {investigation.sources && investigation.sources.length > 0 && (
        <div className="flex justify-between">
          <span className="text-xs text-corporate-textTertiary">Sources:</span>
          <span className="text-xs text-corporate-textSecondary">
            {investigation.sources.length} source{investigation.sources.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      {investigation.tools && investigation.tools.length > 0 && (
        <div className="flex justify-between">
          <span className="text-xs text-corporate-textTertiary">Tools:</span>
          <span className="text-xs text-corporate-textSecondary">
            {investigation.tools.length} tool{investigation.tools.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  </div>
);

interface DescriptionCardProps {
  description: string;
}

export const InvestigationDescriptionCard: React.FC<DescriptionCardProps> = ({ description }) => (
  <div className="bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40 p-4">
    <h5 className="text-sm font-semibold text-corporate-textPrimary mb-3">Description</h5>
    <p className="text-sm text-corporate-textSecondary leading-relaxed">{description}</p>
  </div>
);

interface SourcesToolsCardProps {
  sources?: string[];
  tools?: string[];
}

export const InvestigationSourcesToolsCard: React.FC<SourcesToolsCardProps> = ({ sources, tools }) => {
  if ((!sources || sources.length === 0) && (!tools || tools.length === 0)) return null;

  return (
    <div className="bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40 p-4">
      <h5 className="text-sm font-semibold text-corporate-textPrimary mb-3">Sources & Tools</h5>
      {sources && sources.length > 0 && (
        <div className="mb-3">
          <span className="text-xs text-corporate-textTertiary mb-2 block">Sources:</span>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded text-xs border border-corporate-borderPrimary/40 text-corporate-textSecondary bg-corporate-bgSecondary"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      )}
      {tools && tools.length > 0 && (
        <div>
          <span className="text-xs text-corporate-textTertiary mb-2 block">Tools:</span>
          <div className="flex flex-wrap gap-2">
            {tools.map((tool, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded text-xs border border-corporate-borderPrimary/40 text-corporate-textSecondary bg-corporate-bgSecondary"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
