/**
 * Shared types for Beta 500 Enrollment Modal
 */

export interface BetaEnrollmentModalProps {
  /** Whether the modal is visible */
  visible: boolean;

  /** Callback when user closes the modal */
  onClose: () => void;

  /** Callback when user enrolls in Beta 500 */
  onEnroll: () => Promise<void>;

  /** Current program status */
  programStatus?: {
    totalSlots: number;
    filledSlots: number;
    availableSlots: number;
    isOpen: boolean;
  };

  /** Loading state during enrollment */
  loading?: boolean;
}

export interface BetaEnrollmentResponse {
  success: boolean;
  message: string;
  userId?: string;
}
