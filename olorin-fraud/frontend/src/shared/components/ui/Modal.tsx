/**
 * Modal Component
 *
 * Modal dialog with Olorin corporate styling.
 * Follows design system colors and interaction patterns.
 */

import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
}

/**
 * Modal size mapping
 */
const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4'
};

/**
 * Modal component for dialogs and overlays
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  footer
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle body scroll
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
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={`
          ${sizeClasses[size]}
          w-full
          bg-corporate-bgSecondary
          border border-corporate-borderPrimary
          rounded-lg
          shadow-2xl
          flex flex-col
          max-h-[90vh]
          animate-in
          fade-in
          slide-in-from-bottom-4
          duration-300
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-corporate-borderPrimary">
            {title && (
              <h2
                id="modal-title"
                className="text-xl font-semibold text-corporate-textPrimary"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  p-1
                  text-corporate-textTertiary
                  hover:text-corporate-textPrimary
                  hover:bg-corporate-bgTertiary
                  rounded
                  transition-colors
                  duration-200
                "
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-corporate-borderPrimary bg-corporate-bgTertiary">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
