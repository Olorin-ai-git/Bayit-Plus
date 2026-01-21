/**
 * Anomaly Details Modal
 * Feature: 005-polling-and-persistence
 *
 * Modal for displaying comprehensive anomaly details when clicking radar blips.
 * Adapted from Olorin Investigation Wizard modal patterns with Olorin corporate styling.
 * Shows full anomaly information including detection metadata, risk assessment, and evidence.
 */

import React from 'react';
import { Modal } from './Modal';
import { RadarAnomaly } from '@shared/types/radar.types';

export interface AnomalyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomaly: RadarAnomaly | null;
}

/**
 * Formats Unix timestamp to readable date/time string
 */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Gets risk level badge styling based on severity
 */
const getRiskBadgeStyles = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'bg-red-900/30 border-corporate-error text-red-300';
    case 'high':
      return 'bg-amber-900/20 border-amber-500 text-amber-300';
    case 'medium':
      return 'bg-cyan-900/30 border-cyan-500 text-cyan-300';
    case 'low':
    default:
      return 'bg-gray-800/50 border-gray-600 text-gray-400';
  }
};

/**
 * Modal component displaying full anomaly details with Olorin corporate styling
 */
export const AnomalyDetailsModal: React.FC<AnomalyDetailsModalProps> = ({
  isOpen,
  onClose,
  anomaly,
}) => {
  if (!anomaly) return null;

  const {
    id,
    type,
    riskLevel,
    severity,
    detected,
    detectedBy,
    evidence,
    color,
  } = anomaly;

  const riskBadgeStyles = getRiskBadgeStyles(severity);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Anomaly Details"
      size="lg"
      closeOnBackdrop={true}
    >
      <div className="space-y-4">
        {/* Anomaly Header with Risk Indicator */}
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2"
            style={{
              borderColor: color,
              backgroundColor: `${color}20`,
            }}
          >
            {severity === 'critical' && (
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ color }}
              >
                <path d="M12 2L2 22h20L12 2zm0 6l6 10H6l6-10z" />
              </svg>
            )}
            {severity === 'high' && (
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ color }}
              >
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
            )}
            {(severity === 'medium' || severity === 'low') && (
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ color }}
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-semibold text-corporate-textPrimary">
              {type}
            </h4>
            <p className="text-sm text-corporate-textSecondary mt-1">
              Agent: <span className="font-medium text-corporate-accentPrimary">{detectedBy.agent}</span>
            </p>
            <p className="text-sm text-corporate-textSecondary mt-1">
              Detected {formatTimestamp(detected)}
            </p>
          </div>
        </div>

        {/* Risk Assessment Card */}
        <div
          className={`border-l-4 rounded-lg p-4 ${riskBadgeStyles}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Risk Assessment
            </span>
            <span
              className="text-lg font-bold"
              style={{ color }}
            >
              {severity.toUpperCase()}
            </span>
          </div>
          <div className="relative w-full h-3 bg-black/30 backdrop-blur rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
              style={{
                width: `${riskLevel}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <p className="text-xs mt-2 text-corporate-textSecondary">
            Risk Level: {riskLevel}/100
          </p>
        </div>

        {/* Detection Metadata Card */}
        <div className="bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40 p-4">
          <h5 className="text-sm font-semibold text-corporate-textPrimary mb-3">
            Detection Metadata
          </h5>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-corporate-textTertiary">
                Anomaly ID:
              </span>
              <span className="text-xs font-mono text-corporate-textSecondary">
                {id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-corporate-textTertiary">
                Detected By Agent:
              </span>
              <span className="text-xs text-corporate-textSecondary">
                {detectedBy.agent}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-corporate-textTertiary">
                Detection Tool:
              </span>
              <span className="text-xs text-corporate-textSecondary">
                {detectedBy.tool}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-corporate-textTertiary">
                Agent Index:
              </span>
              <span className="text-xs text-corporate-textSecondary">
                {detectedBy.agentIndex}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-corporate-textTertiary">
                Tool Index:
              </span>
              <span className="text-xs text-corporate-textSecondary">
                {detectedBy.toolIndex}
              </span>
            </div>
          </div>
        </div>

        {/* Evidence Section (if available) */}
        {evidence && (
          <div className="bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40 p-4">
            <h5 className="text-sm font-semibold text-corporate-textPrimary mb-3">
              Evidence
            </h5>
            <pre className="text-xs font-mono text-corporate-textSecondary whitespace-pre-wrap break-words bg-black p-3 rounded border-2 border-corporate-borderSecondary/40 overflow-x-auto max-h-64">
              {JSON.stringify(evidence, null, 2)}
            </pre>
          </div>
        )}

        {/* LLM Thoughts Section (if available) */}
        {anomaly.llmThoughts && (
          <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-500/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
              <h5 className="text-sm font-semibold text-blue-300">
                AI Analysis & Reasoning
              </h5>
            </div>
            <div className="bg-black/50 p-4 rounded border border-blue-500/20">
              <p className="text-sm text-corporate-textSecondary leading-relaxed whitespace-pre-wrap">
                {anomaly.llmThoughts}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-blue-400/70">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 2v2.01L3 8v11h5v-5h4v5h5V8l-6-3.99V2H9zm4 13h-2v2h2v-2zm-2-8h2v5h-2V7z" />
              </svg>
              <span>Generated by {detectedBy.agent} Agent</span>
            </div>
          </div>
        )}

        {/* Raw Data Section (if available) */}
        {anomaly.rawData && (
          <div className="bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-corporate-accentSecondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
                <h5 className="text-sm font-semibold text-corporate-textPrimary">
                  Raw Detection Data
                </h5>
              </div>
              <span className="text-xs px-2 py-1 bg-corporate-accentSecondary/20 text-corporate-accentSecondary rounded border border-corporate-accentSecondary/30">
                Forensics
              </span>
            </div>
            <pre className="text-xs font-mono text-corporate-textSecondary whitespace-pre-wrap break-words bg-black p-3 rounded border-2 border-corporate-borderSecondary/40 overflow-x-auto max-h-80">
              {JSON.stringify(anomaly.rawData, null, 2)}
            </pre>
            <div className="mt-3 text-xs text-corporate-textTertiary">
              <span className="font-semibold">Note:</span> This data is preserved for forensic analysis and compliance requirements.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-corporate-borderPrimary">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white font-medium transition-all duration-200 shadow-lg hover:shadow-corporate-accentPrimary/50 hover:scale-105 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AnomalyDetailsModal;
