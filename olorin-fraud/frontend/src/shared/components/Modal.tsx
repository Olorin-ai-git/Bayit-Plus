/**
 * Modal Component
 * Feature: 005-polling-and-persistence
 *
 * Base modal component adapted from Olorin web plugin with Olorin corporate styling.
 * Provides consistent modal UX with focus management, keyboard navigation, and accessibility.
 * Uses Olorin corporate color palette for investigation wizard consistency.
 */

import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
}

/**
 * Modal component with focus trapping and keyboard navigation
 * Follows Olorin corporate design system
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  showCloseButton = true,
  closeOnBackdrop = true,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
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
  }, [isOpen, onClose]);

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

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop with Olorin styling */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out"
        onClick={handleBackdropClick}
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          tabIndex={-1}
          className={`
            relative w-full ${sizeClasses[size]} transform overflow-hidden
            rounded-lg bg-black border-2 border-corporate-borderPrimary/40
            shadow-2xl transition-all duration-300 ease-out
            animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4
            flex flex-col max-h-[90vh]
            ${className}
          `}
        >
          {/* Header with Olorin corporate styling */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between border-b border-corporate-borderPrimary px-6 py-4 shrink-0">
              {title && (
                <h3
                  id="modal-title"
                  className="text-lg font-semibold text-corporate-textPrimary"
                >
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-corporate-textTertiary hover:bg-black/30 backdrop-blur hover:text-corporate-textPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary focus:ring-offset-2 transition-all duration-200"
                  aria-label="Close modal"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
