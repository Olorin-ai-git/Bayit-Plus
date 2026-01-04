/**
 * Mobile Menu Component
 *
 * Mobile menu overlay component for ResponsiveLayout.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React from 'react';
import { LayoutPanel } from '../hooks/useResponsiveLayout';

export interface MobileMenuProps {
  isOpen: boolean;
  panels: LayoutPanel[];
  onToggle: () => void;
  onClose: () => void;
  renderPanel: (panel: LayoutPanel, index: number) => React.ReactNode;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  panels,
  onToggle,
  onClose,
  renderPanel,
}) => {
  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 bg-white border border-gray-300 rounded-md shadow-sm lg:hidden"
        aria-label="Toggle mobile menu"
      >
        <div className="w-6 h-6 flex flex-col justify-center gap-1">
          <div className={`h-0.5 bg-gray-600 transition-all ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
          <div className={`h-0.5 bg-gray-600 transition-all ${isOpen ? 'opacity-0' : ''}`} />
          <div className={`h-0.5 bg-gray-600 transition-all ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </div>
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={onClose}
          />
          <div className="absolute top-0 left-0 w-80 h-full bg-white shadow-xl overflow-y-auto">
            <div className="p-4 space-y-4">
              {panels.map((panel, index) => renderPanel(panel, index))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};