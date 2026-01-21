/**
 * ReportHeader Component - Header with action buttons for report management
 */

import React from 'react';
import { Report, ReportStatus } from '../types/reports';

interface ReportHeaderProps {
  report: Report | null;
  onEdit?: () => void;
  onPublish?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  onPresent?: () => void;
  onStatusChange?: (status: ReportStatus) => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  report,
  onEdit,
  onPublish,
  onShare,
  onPrint,
  onPresent,
  onStatusChange,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!report) {
    return (
      <header className="flex items-center justify-between p-4 border-b border-corporate-borderPrimary/40 bg-black/30 backdrop-blur">
        <div>
          <div className="font-bold text-corporate-textPrimary">No report selected</div>
          <div className="text-corporate-textSecondary text-sm">—</div>
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between p-4 border-b border-corporate-borderPrimary/40 bg-black/30 backdrop-blur">
      <div className="flex-1">
        <div className="font-bold text-corporate-textPrimary text-lg">{report.title}</div>
        <div className="text-corporate-textSecondary text-sm mt-1">
          {report.owner} • {formatDate(report.updated_at)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onStatusChange && (
          <select
            value={report.status}
            onChange={(e) => onStatusChange(e.target.value as ReportStatus)}
            className="px-2.5 py-1.5 rounded border-2 border-corporate-borderPrimary/40 bg-black/30 backdrop-blur text-corporate-textPrimary text-xs hover:border-corporate-accentPrimary/60 transition-colors focus:outline-none"
            aria-label="Report status"
          >
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>
        )}
        {onPresent && (
          <button
            onClick={onPresent}
            className="px-3 py-2 rounded border-2 border-corporate-borderPrimary/40 bg-black/30 backdrop-blur text-corporate-textSecondary text-sm hover:border-corporate-accentPrimary/60 transition-colors"
            aria-label="Present report in fullscreen"
          >
            Present
          </button>
        )}
        {onPrint && (
          <button
            onClick={onPrint}
            className="px-3 py-2 rounded border-2 border-corporate-borderPrimary/40 bg-black/30 backdrop-blur text-corporate-textSecondary text-sm hover:border-corporate-accentPrimary/60 transition-colors"
            aria-label="Print or export PDF"
          >
            Print/PDF
          </button>
        )}
        {onShare && (
          <button
            onClick={onShare}
            className="px-3 py-2 rounded border-2 border-corporate-borderPrimary/40 bg-black/30 backdrop-blur text-corporate-textSecondary text-sm hover:border-corporate-accentPrimary/60 transition-colors"
            aria-label="Share report"
          >
            Share
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-2 rounded border-2 border-corporate-accentPrimary/60 bg-black/40 backdrop-blur text-corporate-textTertiary text-sm hover:border-corporate-accentPrimary transition-colors"
            aria-label="Edit report"
          >
            Edit
          </button>
        )}
        {onPublish && (
          <button
            onClick={onPublish}
            className="px-3 py-2 rounded bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white text-sm transition-colors font-medium"
            aria-label={report.status === 'Published' ? 'Unpublish report' : 'Publish report'}
          >
            {report.status === 'Published' ? 'Unpublish' : 'Publish'}
          </button>
        )}
      </div>
    </header>
  );
};

