/**
 * Investigation Modals
 * Feature: 001-startup-analysis-flow
 *
 * Modal components for cancel confirmation and report success.
 */

import React from 'react';
import { Modal } from '@shared/components/Modal';
import { WizardButton } from '@shared/components/WizardButton';

interface CancelModalProps {
  isOpen: boolean;
  investigationId: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelInvestigationModal: React.FC<CancelModalProps> = ({
  isOpen,
  investigationId,
  onClose,
  onConfirm,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Cancel Investigation" size="sm">
    <div className="space-y-6">
      <p className="text-corporate-textSecondary">
        Are you sure you want to cancel investigation{' '}
        <span className="font-mono text-corporate-textPrimary font-semibold">{investigationId}</span>?
        <br className="mb-2" />
        <span className="text-xs text-corporate-textTertiary">This action cannot be undone.</span>
      </p>
      <div className="flex justify-end gap-3">
        <WizardButton variant="secondary" onClick={onClose}>
          Keep Investigation
        </WizardButton>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded bg-corporate-error hover:bg-corporate-error/80 text-white font-medium transition-colors text-sm"
        >
          Yes, Cancel
        </button>
      </div>
    </div>
  </Modal>
);

interface ReportSuccessModalProps {
  isOpen: boolean;
  reportUrl: string | null;
  onClose: () => void;
}

export const ReportSuccessModal: React.FC<ReportSuccessModalProps> = ({ isOpen, reportUrl, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Report Generated" size="sm">
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-corporate-textPrimary font-medium text-lg text-center">
          Startup Analysis Report Ready
        </p>
        <p className="text-corporate-textSecondary text-sm text-center mt-2">
          The aggregate confusion matrix report has been generated successfully.
        </p>
      </div>
      <div className="bg-black/30 p-3 rounded-lg border border-white/10 break-all">
        <a
          href={reportUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-corporate-accentPrimary hover:text-corporate-accentPrimaryHover text-xs font-mono underline"
        >
          {reportUrl}
        </a>
      </div>
      <div className="flex justify-center gap-3">
        <button
          onClick={() => reportUrl && window.open(reportUrl, '_blank')}
          className="px-4 py-2 rounded bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white font-medium transition-colors text-sm flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download Again
        </button>
        <WizardButton variant="secondary" onClick={onClose}>
          Close
        </WizardButton>
      </div>
    </div>
  </Modal>
);
