/**
 * Modal Component
 * Reusable modal wrapper with backdrop and close functionality
 */

import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-corporate-bgSecondary border border-corporate-borderPrimary rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-4 md:p-5 border-b border-corporate-borderPrimary/40 bg-corporate-bgSecondary">
          <h2 className="text-lg md:text-xl font-semibold text-corporate-textPrimary">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-corporate-bgSecondary rounded-lg transition-colors text-corporate-textSecondary hover:text-corporate-textPrimary"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

