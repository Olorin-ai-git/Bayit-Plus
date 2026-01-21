/**
 * Export Menu Component
 * Feature: 004-new-olorin-frontend
 *
 * Dropdown menu for exporting investigation results in multiple formats.
 * Uses Olorin purple styling with format-specific icons.
 */

import React, { useState } from 'react';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';

export type ExportFormat = 'pdf' | 'csv' | 'json';

export interface ExportMenuProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
  isExporting?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Export menu with multiple format options
 */
export const ExportMenu: React.FC<ExportMenuProps> = ({
  onExport,
  isExporting = false,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false);
    setExportingFormat(format);

    try {
      await onExport(format);
    } finally {
      setExportingFormat(null);
    }
  };

  const exportOptions: Array<{
    format: ExportFormat;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      format: 'pdf',
      label: 'PDF Report',
      description: 'Comprehensive investigation report',
      icon: DocumentTextIcon
    },
    {
      format: 'csv',
      label: 'CSV Data',
      description: 'Spreadsheet-compatible data export',
      icon: TableCellsIcon
    },
    {
      format: 'json',
      label: 'JSON Data',
      description: 'Machine-readable structured data',
      icon: CodeBracketIcon
    }
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Export Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          disabled || isExporting
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white hover:scale-105 active:scale-95'
        }`}
      >
        <ArrowDownTrayIcon className="w-5 h-5" />
        <span>{isExporting ? 'Exporting...' : 'Export'}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-2 w-64 bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg shadow-lg overflow-hidden z-10">
          {exportOptions.map(({ format, label, description, icon: Icon }) => (
            <button
              key={format}
              type="button"
              onClick={() => handleExport(format)}
              disabled={exportingFormat === format}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-black/30 backdrop-blur transition-colors text-left"
            >
              <Icon className="w-6 h-6 text-corporate-accentPrimary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-corporate-textPrimary">{label}</h4>
                <p className="text-xs text-corporate-textSecondary mt-1">{description}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading Indicator */}
      {exportingFormat && (
        <div className="absolute right-0 mt-2 w-64 bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-corporate-accentPrimary border-t-transparent animate-spin" />
            <span className="text-sm text-corporate-textPrimary">
              Exporting as {exportingFormat.toUpperCase()}...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
