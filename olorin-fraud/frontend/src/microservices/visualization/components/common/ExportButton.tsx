/**
 * Export Button Component
 *
 * Configurable export button with dropdown for format selection.
 * Tailwind CSS only, accessible with ARIA labels.
 *
 * NO HARDCODED VALUES - Configuration-driven and accessible.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ExportFormat, exportService } from '../../services/exportService';

/**
 * Export button props
 */
export interface ExportButtonProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
  supportedFormats?: ExportFormat[];
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Export Button Component
 */
export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  supportedFormats,
  disabled = false,
  className = '',
  label = 'Export'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formats = supportedFormats || exportService.getSupportedFormats();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      await onExport(format);
    } catch (error) {
      console.error('[ExportButton] Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatLabels: Record<ExportFormat, string> = {
    png: 'PNG Image',
    svg: 'SVG Vector',
    json: 'JSON Data'
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className="px-4 py-2 bg-corporate-accentPrimary text-white rounded-lg font-medium
                 hover:bg-corporate-accentPrimaryHover transition-all duration-200
                 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                 focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary focus:ring-offset-2
                 flex items-center gap-2"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {isExporting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            {label}
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-corporate-bgSecondary border border-corporate-borderPrimary rounded-lg shadow-lg z-10"
          role="menu"
          aria-orientation="vertical"
        >
          {formats.map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              className="w-full px-4 py-2 text-left text-sm text-corporate-textPrimary
                       hover:bg-corporate-bgTertiary transition-colors first:rounded-t-lg last:rounded-b-lg"
              role="menuitem"
              aria-label={`Export as ${formatLabels[format]}`}
            >
              {formatLabels[format]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExportButton;
