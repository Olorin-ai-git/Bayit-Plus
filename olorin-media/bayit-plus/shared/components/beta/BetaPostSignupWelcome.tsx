/**
 * Beta Post-Signup Welcome Component
 *
 * Shows Beta 500 enrollment modal after user completes regular signup.
 * Integrates into signup completion flow to invite new users to Beta program.
 */

import React, { useState, useEffect } from 'react';
import { BetaEnrollmentModal } from './BetaEnrollmentModal';

export interface BetaPostSignupWelcomeProps {
  /** Whether to show the welcome modal */
  visible: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when user enrolls */
  onEnroll: () => Promise<void>;
  /** API base URL */
  apiBaseUrl?: string;
  /** Auto-show delay in ms (default: 1500ms) */
  autoShowDelay?: number;
}

export interface ProgramStatus {
  totalSlots: number;
  filledSlots: number;
  availableSlots: number;
  isOpen: boolean;
  programName: string;
}

/**
 * Post-Signup Welcome component that shows Beta 500 enrollment opportunity
 *
 * @example
 * ```tsx
 * const [showBetaWelcome, setShowBetaWelcome] = useState(false);
 *
 * const handleSignupComplete = async () => {
 *   await createUserAccount();
 *   setShowBetaWelcome(true); // Show Beta welcome after signup
 * };
 *
 * return (
 *   <>
 *     <SignupForm onComplete={handleSignupComplete} />
 *     <BetaPostSignupWelcome
 *       visible={showBetaWelcome}
 *       onClose={() => setShowBetaWelcome(false)}
 *       onEnroll={handleBetaEnrollment}
 *     />
 *   </>
 * );
 * ```
 */
export const BetaPostSignupWelcome: React.FC<BetaPostSignupWelcomeProps> = ({
  visible,
  onClose,
  onEnroll,
  apiBaseUrl = '/api/v1',
  autoShowDelay = 1500,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [programStatus, setProgramStatus] = useState<ProgramStatus | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      // Delay showing modal to let signup completion animations finish
      const timer = setTimeout(() => {
        setShowModal(true);
        fetchProgramStatus();
      }, autoShowDelay);

      return () => clearTimeout(timer);
    } else {
      setShowModal(false);
    }
  }, [visible, autoShowDelay]);

  const fetchProgramStatus = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/beta/status`);
      const data = await response.json();
      setProgramStatus(data);
    } catch (error) {
      console.error('Failed to fetch Beta program status:', error);
    }
  };

  const handleEnroll = async () => {
    setLoading(true);
    try {
      await onEnroll();
      setShowModal(false);
      onClose();
    } catch (error) {
      console.error('Enrollment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    onClose();
  };

  return (
    <BetaEnrollmentModal
      visible={showModal}
      onClose={handleClose}
      onEnroll={handleEnroll}
      programStatus={programStatus}
      loading={loading}
    />
  );
};

export default BetaPostSignupWelcome;
