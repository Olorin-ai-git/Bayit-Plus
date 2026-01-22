/**
 * GlassModal Component
 * Accessible modal dialog with glassmorphic styling
 */

import React, { useEffect, useCallback, ReactNode } from 'react';
import { glassTokens } from '../../styles/glass-tokens';

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  visible,
  onClose,
  children,
  className = '',
}) => {
  // Close on Escape key
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && visible) {
        onClose();
      }
    },
    [visible, onClose]
  );

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [visible, handleEscape]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 ${glassTokens.layers.modal}`} />

      {/* Modal Content */}
      <div
        className={`relative ${glassTokens.layers.card} rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default GlassModal;
