/**
 * Confirmation Modal Component
 * 
 * A reusable confirmation dialog with glassmorphic styling following Olorin design system.
 * Provides approve/cancel functionality with consistent UX patterns.
 */

import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
}

/**
 * Confirmation modal with glassmorphic styling and Olorin corporate design
 */
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  size = 'md',
  closeOnBackdrop = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus the confirm button by default for better UX
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
    } else {
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }

      // Enter key confirms
      if (event.key === 'Enter' && isOpen && !event.shiftKey) {
        event.preventDefault();
        onConfirm();
      }

      // Focus trapping
      if (event.key === 'Tab' && isOpen) {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );

        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[
            focusableElements.length - 1
          ] as HTMLElement;

          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  // Prevent body scroll when modal is open
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

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
  };

  const confirmButtonClasses = {
    danger: 'bg-corporate-error hover:bg-red-600 text-white border-corporate-error hover:border-red-600 shadow-lg hover:shadow-red-500/50',
    primary: 'bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white border-corporate-accentPrimary hover:border-corporate-accentPrimary shadow-lg hover:shadow-corporate-accentPrimary/50',
    secondary: 'bg-corporate-accentSecondary hover:bg-purple-600 text-white border-corporate-accentSecondary hover:border-purple-600 shadow-lg hover:shadow-purple-500/50',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop with glassmorphic blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} bg-black/40 backdrop-blur-xl rounded-xl border-2 border-corporate-borderPrimary/50 shadow-2xl transform transition-all`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-message"
        tabIndex={-1}
      >
        {/* Glassmorphic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-corporate-accentPrimary/10 via-transparent to-corporate-accentSecondary/10 rounded-xl pointer-events-none" />
        
        {/* Content */}
        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Warning Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-corporate-error/20 border-2 border-corporate-error/40 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-corporate-error"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3
                id="confirmation-modal-title"
                className="text-xl font-semibold text-corporate-textPrimary"
              >
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 rounded-lg text-corporate-textSecondary hover:text-corporate-textPrimary hover:bg-corporate-bgSecondary/50 transition-all duration-200 border border-transparent hover:border-corporate-borderPrimary/40"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Message */}
          <div
            id="confirmation-modal-message"
            className="mb-6"
          >
            <p className="text-sm md:text-base text-corporate-textSecondary leading-relaxed">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-corporate-borderPrimary/40">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-corporate-bgSecondary/50 border border-corporate-borderPrimary/40 hover:border-corporate-borderPrimary text-corporate-textSecondary hover:text-corporate-textPrimary font-medium transition-all duration-200 hover:bg-corporate-bgSecondary/70"
            >
              {cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={handleConfirm}
              className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95 border-2 ${confirmButtonClasses[confirmVariant]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

