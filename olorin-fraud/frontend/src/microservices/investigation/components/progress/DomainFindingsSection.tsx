/**
 * Domain Findings Section
 * Displays domain-specific findings with LLM analysis including risk scores, confidence, and reasoning
 */

import React from 'react';
import { CollapsiblePanel } from '@shared/components';

interface DomainFinding {
  domain: string;
  riskScore?: number;
  confidence?: number;

  // Full format (when available)
  evidence?: string[];
  riskIndicators?: string[];
  llmAnalysis?: {
    riskScore?: number;
    confidence?: number;
    riskFactors?: string;
    reasoning?: string;
    recommendations?: string;
    llmResponse?: string;
    analysisDuration?: number;
  };

  // Summarized format (more common)
  evidenceCount?: number;
  riskIndicatorsCount?: number;
  hasLlmAnalysis?: boolean;
  llmConfidence?: number;
  analysisDuration?: number;
  llmResponsePreview?: string;

  metrics?: Record<string, any>;
}

interface DomainFindingsSectionProps {
  domainFindings: Record<string, DomainFinding>;
}

export const DomainFindingsSection: React.FC<DomainFindingsSectionProps> = React.memo(({
  domainFindings
}) => {
  if (!domainFindings || Object.keys(domainFindings).length === 0) {
    return null;
  }

  const domains = Object.entries(domainFindings);
  const domainsWithLLM = domains.filter(([_, finding]) => finding.llmAnalysis);
  const totalRiskScore = domains.reduce((sum, [_, finding]) => {
    const score = finding.llmAnalysis?.riskScore || finding.riskScore || 0;
    return sum + score;
  }, 0) / domains.length;

  return (
    <CollapsiblePanel
      title="Domain Risk Analysis"
      defaultExpanded={true}
      badges={[
        <span key="domains" className="text-xs px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
          {domains.length} Domains
        </span>,
        domainsWithLLM.length > 0 && (
          <span key="llm" className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
            {domainsWithLLM.length} with LLM Analysis
          </span>
        ),
        <span key="avg-risk" className="text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded">
          Avg Risk: {(totalRiskScore * 100).toFixed(0)}%
        </span>
      ].filter(Boolean)}
      className="mb-6"
    >
      <div className="space-y-4">
        {domains.map(([domainName, finding]) => {
          // Handle both full and summarized formats
          const riskScore = finding.llmAnalysis?.riskScore || finding.riskScore || 0;
          const confidence = finding.llmAnalysis?.confidence || finding.llmConfidence || finding.confidence || 0;
          const hasLLM = finding.hasLlmAnalysis || !!finding.llmAnalysis;
          const llmAnalysis = finding.llmAnalysis;
          const isSummarized = !finding.llmAnalysis && finding.hasLlmAnalysis;

          // Determine risk level color
          const getRiskColor = (score: number) => {
            if (score >= 0.7) return 'text-red-400';
            if (score >= 0.4) return 'text-yellow-400';
            return 'text-green-400';
          };

          const getConfidenceColor = (conf: number) => {
            if (conf >= 0.7) return 'text-blue-400';
            if (conf >= 0.4) return 'text-blue-300';
            return 'text-blue-200';
          };

          return (
            <div
              key={domainName}
              className="border border-corporate-border rounded-lg p-4 bg-corporate-surfaceSecondary/50"
            >
              {/* Domain Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-corporate-textPrimary capitalize">
                  {domainName}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-sm font-bold ${getRiskColor(riskScore)}`}>
                      Risk: {(riskScore * 100).toFixed(0)}%
                    </div>
                    <div className={`text-xs ${getConfidenceColor(confidence)}`}>
                      Confidence: {(confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  {hasLLM && (
                    <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
                      LLM Analyzed
                    </span>
                  )}
                </div>
              </div>

              {/* LLM Analysis Section */}
              {hasLLM && (
                <div className="mt-4 space-y-3 border-t border-corporate-border pt-3">
                  {isSummarized && finding.llmResponsePreview ? (
                    // Summarized format: Show preview
                    <div>
                      <h4 className="text-sm font-semibold text-corporate-textSecondary mb-2">
                        LLM Analysis Preview:
                      </h4>
                      <div className="text-sm text-corporate-textPrimary whitespace-pre-wrap bg-corporate-bgTertiary p-3 rounded">
                        {finding.llmResponsePreview}
                      </div>
                    </div>
                  ) : llmAnalysis ? (
                    // Full format: Show complete analysis
                    <>
                      {llmAnalysis.riskFactors && (
                        <div>
                          <h4 className="text-sm font-semibold text-corporate-textSecondary mb-2">
                            Risk Factors:
                          </h4>
                          <div className="text-sm text-corporate-textPrimary whitespace-pre-wrap">
                            {llmAnalysis.riskFactors}
                          </div>
                        </div>
                      )}

                      {llmAnalysis.reasoning && (
                        <div>
                          <h4 className="text-sm font-semibold text-corporate-textSecondary mb-2">
                            Reasoning:
                          </h4>
                          <div className="text-sm text-corporate-textPrimary whitespace-pre-wrap">
                            {llmAnalysis.reasoning}
                          </div>
                        </div>
                      )}

                      {llmAnalysis.recommendations && (
                        <div>
                          <h4 className="text-sm font-semibold text-corporate-textSecondary mb-2">
                            Recommendations:
                          </h4>
                          <div className="text-sm text-corporate-textPrimary whitespace-pre-wrap">
                            {llmAnalysis.recommendations}
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}

                  {/* Analysis duration - works for both formats */}
                  {(finding.analysisDuration || llmAnalysis?.analysisDuration) && (
                    <div className="text-xs text-corporate-textSecondary">
                      Analysis Duration: {(finding.analysisDuration || llmAnalysis?.analysisDuration || 0).toFixed(2)}s
                    </div>
                  )}

                  {/* LLM Confidence - only in summarized format */}
                  {isSummarized && finding.llmConfidence !== undefined && (
                    <div className="text-xs text-corporate-textSecondary">
                      LLM Confidence: {(finding.llmConfidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              )}

              {/* Evidence and Risk Indicators */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Evidence - full or summarized */}
                {finding.evidence && finding.evidence.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-corporate-textSecondary mb-2">
                      Evidence ({finding.evidence.length}):
                    </h4>
                    <ul className="text-sm text-corporate-textPrimary space-y-1">
                      {finding.evidence.slice(0, 3).map((evidence, idx) => (
                        <li key={idx} className="list-disc list-inside">
                          {evidence.length > 150 ? `${evidence.substring(0, 150)}...` : evidence}
                        </li>
                      ))}
                      {finding.evidence.length > 3 && (
                        <li className="text-xs text-corporate-textSecondary">
                          +{finding.evidence.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                ) : finding.evidenceCount !== undefined && finding.evidenceCount > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-corporate-textSecondary mb-2">
                      Evidence:
                    </h4>
                    <div className="text-sm text-corporate-textPrimary">
                      {finding.evidenceCount} evidence item{finding.evidenceCount !== 1 ? 's' : ''} found
                    </div>
                  </div>
                ) : null}

                {/* Risk Indicators - full or summarized */}
                {finding.riskIndicators && finding.riskIndicators.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-corporate-textSecondary mb-2">
                      Risk Indicators ({finding.riskIndicators.length}):
                    </h4>
                    <ul className="text-sm text-corporate-textPrimary space-y-1">
                      {finding.riskIndicators.slice(0, 3).map((indicator, idx) => (
                        <li key={idx} className="list-disc list-inside">
                          {indicator.length > 150 ? `${indicator.substring(0, 150)}...` : indicator}
                        </li>
                      ))}
                      {finding.riskIndicators.length > 3 && (
                        <li className="text-xs text-corporate-textSecondary">
                          +{finding.riskIndicators.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                ) : finding.riskIndicatorsCount !== undefined && finding.riskIndicatorsCount > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-corporate-textSecondary mb-2">
                      Risk Indicators:
                    </h4>
                    <div className="text-sm text-corporate-textPrimary">
                      {finding.riskIndicatorsCount} risk indicator{finding.riskIndicatorsCount !== 1 ? 's' : ''} identified
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Metrics Summary */}
              {finding.metrics && Object.keys(finding.metrics).length > 0 && (
                <div className="mt-4 pt-3 border-t border-corporate-border">
                  <h4 className="text-sm font-semibold text-corporate-textSecondary mb-2">
                    Metrics:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(finding.metrics).slice(0, 5).map(([key, value]) => (
                      <span
                        key={key}
                        className="text-xs px-2 py-1 bg-corporate-surfaceSecondary rounded"
                      >
                        {key}: {String(value)}
                      </span>
                    ))}
                    {Object.keys(finding.metrics).length > 5 && (
                      <span className="text-xs text-corporate-textSecondary">
                        +{Object.keys(finding.metrics).length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </CollapsiblePanel>
  );
});

DomainFindingsSection.displayName = 'DomainFindingsSection';

