/**
 * Investigation Details Modal (Refactored)
 *
 * Modal for displaying comprehensive investigation details.
 * Uses extracted sub-components for maintainability and file size compliance.
 * Shows full investigation information including metadata, risk assessment, domain analysis, and evidence.
 */

import React from 'react';
import { Modal } from '../components/common/Modal';
import { Investigation } from '../types/investigations';
import { LiveLogStream } from '@shared/components/LiveLogStream';
import { InvestigationHeader } from './sections/InvestigationHeader';
import {
  InvestigationRiskCard,
  InvestigationProgressCard,
  InvestigationMetadataCard,
  InvestigationDescriptionCard,
  InvestigationSourcesToolsCard,
} from './sections/InvestigationCards';
import { InvestigationDomainAnalysis } from './sections/InvestigationDomainAnalysis';
import { InvestigationActions } from './sections/InvestigationActions';
import {
  calculateOverallRiskScore,
  getRiskSeverity,
  getRiskBadgeStyles,
} from './utils/InvestigationRiskUtils';

export interface InvestigationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  investigation: Investigation | null;
  onDelete?: (investigation: Investigation) => void;
  onReplay?: (investigation: Investigation) => void;
}

/**
 * Modal component displaying full investigation details with Olorin corporate styling
 */
export const InvestigationDetailsModal: React.FC<InvestigationDetailsModalProps> = ({
  isOpen,
  onClose,
  investigation,
  onDelete,
  onReplay,
}) => {
  if (!investigation) return null;

  const normalizedRiskScore = calculateOverallRiskScore(investigation);
  const riskSeverity = getRiskSeverity(normalizedRiskScore);
  const riskBadge = getRiskBadgeStyles(riskSeverity);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={investigation.name || investigation.id}
      size="xl"
      closeOnBackdrop={true}
    >
      <div className="space-y-4">
        {/* Investigation Header with Risk Indicator */}
        <InvestigationHeader
          investigation={investigation}
          riskSeverity={riskSeverity}
          riskBadgeColor={riskBadge.color}
        />

        {/* Action Buttons (Replay, Delete) */}
        <InvestigationActions
          investigation={investigation}
          onClose={onClose}
          onDelete={onDelete}
          onReplay={onReplay}
        />

        {/* Risk Assessment Card */}
        {normalizedRiskScore !== null && (
          <InvestigationRiskCard
            score={normalizedRiskScore}
            severity={riskSeverity}
            badgeStyles={riskBadge.styles}
            badgeColor={riskBadge.color}
          />
        )}

        {/* Progress Card */}
        {investigation.progress !== undefined && investigation.progress !== null && (
          <InvestigationProgressCard progress={investigation.progress} />
        )}

        {/* Investigation Metadata Card */}
        <InvestigationMetadataCard investigation={investigation} />

        {/* Description Section */}
        {investigation.description && (
          <InvestigationDescriptionCard description={investigation.description} />
        )}

        {/* Domain Analysis Section */}
        <InvestigationDomainAnalysis investigation={investigation} />

        {/* Live Log Stream Section */}
        <div className="bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40 p-4">
          <h5 className="text-sm font-semibold text-corporate-textPrimary mb-4">
            Live Log Stream
          </h5>
          <LiveLogStream
            investigationId={investigation.id}
            baseUrl={process.env.REACT_APP_API_BASE_URL}
            height={400}
            rowHeight={60}
            autoConnect={true}
            autoScroll={true}
            showTimestamp={true}
            showSource={true}
          />
        </div>

        {/* Sources & Tools Section */}
        <InvestigationSourcesToolsCard
          sources={investigation.sources}
          tools={investigation.tools}
        />
      </div>
    </Modal>
  );
};

export default InvestigationDetailsModal;
