/**
 * Investigation Drawer Component
 * Slide-out drawer for viewing investigation details
 */

import React, { useEffect } from 'react';
import { Investigation } from '../types/investigations';
import { StatusBadge } from './common/StatusBadge';
import { ProgressBar } from './common/ProgressBar';
import { PhaseTimeline } from './PhaseTimeline';
import { ActivityLog } from './ActivityLog';

interface InvestigationDrawerProps {
  investigation: Investigation | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (investigation: Investigation) => void;
  onDelete?: (investigation: Investigation) => void;
  onReplay?: (investigation: Investigation) => void;
}

export const InvestigationDrawer: React.FC<InvestigationDrawerProps> = ({
  investigation,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onReplay
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!investigation) return null;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleString();
    } catch {
      return '—';
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/55 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-full md:max-w-2xl bg-corporate-bgSecondary border-l border-corporate-borderPrimary/40 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex-shrink-0 p-4 md:p-6 border-b border-corporate-borderPrimary/40 bg-corporate-bgSecondary">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-corporate-accentPrimary mb-2 truncate" title={investigation.name}>
                  {investigation.name}
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <StatusBadge status={investigation.status} />
                  {investigation.owner && (
                    <span className="text-sm text-corporate-textSecondary">
                      Owner: <strong className="text-corporate-textPrimary">{investigation.owner}</strong>
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2 hover:bg-corporate-bgSecondary rounded-lg transition-colors text-corporate-textSecondary hover:text-corporate-textPrimary"
                aria-label="Close drawer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              {onEdit && (
                <button
                  onClick={() => onEdit(investigation)}
                  className="px-3 py-1.5 text-sm bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textSecondary hover:border-corporate-accentPrimary transition-colors"
                >
                  Edit
                </button>
              )}
              {onReplay && (
                <button
                  onClick={() => onReplay(investigation)}
                  className="px-3 py-1.5 text-sm bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textSecondary hover:border-corporate-accentPrimary transition-colors"
                >
                  Replay
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(investigation)}
                  className="px-3 py-1.5 text-sm bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-error hover:border-corporate-error transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Description */}
            {investigation.description && (
              <section>
                <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">
                  Description
                </h3>
                <p className="text-sm text-corporate-textSecondary">
                  {investigation.description}
                </p>
              </section>
            )}

            {/* Progress */}
            <section>
              <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">
                Overall Progress
              </h3>
              <ProgressBar progress={investigation.progress || 0} showLabel />
            </section>

            {/* Metadata */}
            <section>
              <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">
                Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
                {investigation.riskModel && (
                  <div>
                    <span className="text-corporate-textSecondary">Risk Model:</span>
                    <span className="ml-2 text-corporate-textPrimary font-medium">{investigation.riskModel}</span>
                  </div>
                )}
                {investigation.created && (
                  <div>
                    <span className="text-corporate-textSecondary">Created:</span>
                    <span className="ml-2 text-corporate-textPrimary">{formatDate(investigation.created)}</span>
                  </div>
                )}
                {investigation.updated && (
                  <div>
                    <span className="text-corporate-textSecondary">Updated:</span>
                    <span className="ml-2 text-corporate-textPrimary">{formatDate(investigation.updated)}</span>
                  </div>
                )}
                {investigation.from && investigation.to && (
                  <>
                    <div>
                      <span className="text-corporate-textSecondary">From:</span>
                      <span className="ml-2 text-corporate-textPrimary">{formatDate(investigation.from)}</span>
                    </div>
                    <div>
                      <span className="text-corporate-textSecondary">To:</span>
                      <span className="ml-2 text-corporate-textPrimary">{formatDate(investigation.to)}</span>
                    </div>
                  </>
                )}
                {investigation.overall_risk_score !== undefined && (
                  <div>
                    <span className="text-corporate-textSecondary">Risk Score:</span>
                    <span className="ml-2 text-corporate-textPrimary font-medium">{investigation.overall_risk_score}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Sources and Tools */}
            {(investigation.sources?.length > 0 || investigation.tools?.length > 0) && (
              <section>
                <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">
                  Sources & Tools
                </h3>
                <div className="space-y-3">
                  {investigation.sources?.length > 0 && (
                    <div>
                      <span className="text-sm text-corporate-textSecondary mb-2 block">Sources:</span>
                      <div className="flex flex-wrap gap-2">
                        {investigation.sources.map((source, idx) => (
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
                  {investigation.tools?.length > 0 && (
                    <div>
                      <span className="text-sm text-corporate-textSecondary mb-2 block">Tools:</span>
                      <div className="flex flex-wrap gap-2">
                        {investigation.tools.map((tool, idx) => (
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
              </section>
            )}

            {/* Phases */}
            {investigation.phases && investigation.phases.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">
                  Phases
                </h3>
                <PhaseTimeline phases={investigation.phases} />
              </section>
            )}

            {/* Domain Analysis */}
            {(investigation.location_llm_thoughts || investigation.network_llm_thoughts || 
              investigation.logs_llm_thoughts || investigation.device_llm_thoughts ||
              investigation.location_risk_score || investigation.network_risk_score ||
              investigation.logs_risk_score || investigation.device_risk_score) && (
              <section>
                <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">
                  Domain Analysis
                </h3>
                <div className="space-y-4">
                  {/* Location Domain */}
                  {(investigation.location_llm_thoughts || investigation.location_risk_score) && (
                    <div className="p-4 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-corporate-textPrimary">Location</h4>
                        {investigation.location_risk_score !== undefined && (
                          <span className="text-xs px-2 py-1 rounded bg-corporate-bgSecondary border border-corporate-borderPrimary/40 text-corporate-textSecondary">
                            Risk: {investigation.location_risk_score.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {investigation.location_llm_thoughts && (
                        <p className="text-sm text-corporate-textSecondary whitespace-pre-wrap">
                          {investigation.location_llm_thoughts}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Network Domain */}
                  {(investigation.network_llm_thoughts || investigation.network_risk_score) && (
                    <div className="p-4 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-corporate-textPrimary">Network</h4>
                        {investigation.network_risk_score !== undefined && (
                          <span className="text-xs px-2 py-1 rounded bg-corporate-bgSecondary border border-corporate-borderPrimary/40 text-corporate-textSecondary">
                            Risk: {investigation.network_risk_score.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {investigation.network_llm_thoughts && (
                        <p className="text-sm text-corporate-textSecondary whitespace-pre-wrap">
                          {investigation.network_llm_thoughts}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Logs Domain */}
                  {(investigation.logs_llm_thoughts || investigation.logs_risk_score) && (
                    <div className="p-4 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-corporate-textPrimary">Logs</h4>
                        {investigation.logs_risk_score !== undefined && (
                          <span className="text-xs px-2 py-1 rounded bg-corporate-bgSecondary border border-corporate-borderPrimary/40 text-corporate-textSecondary">
                            Risk: {investigation.logs_risk_score.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {investigation.logs_llm_thoughts && (
                        <p className="text-sm text-corporate-textSecondary whitespace-pre-wrap">
                          {investigation.logs_llm_thoughts}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Device Domain */}
                  {(investigation.device_llm_thoughts || investigation.device_risk_score) && (
                    <div className="p-4 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-corporate-textPrimary">Device</h4>
                        {investigation.device_risk_score !== undefined && (
                          <span className="text-xs px-2 py-1 rounded bg-corporate-bgSecondary border border-corporate-borderPrimary/40 text-corporate-textSecondary">
                            Risk: {investigation.device_risk_score.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {investigation.device_llm_thoughts && (
                        <p className="text-sm text-corporate-textSecondary whitespace-pre-wrap">
                          {investigation.device_llm_thoughts}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Activity Log */}
            <section>
              <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">
                Activity Log
              </h3>
              <ActivityLog entries={[]} />
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

