/**
 * ReportListItem Component - Individual report item in the list
 */

import React from 'react';
import { Report } from '../types/reports';
import { StatusBadge } from './common/StatusBadge';
import { TagChip } from './common/TagChip';

interface ReportListItemProps {
  report: Report;
  isActive?: boolean;
  onClick: () => void;
  onDelete?: (reportId: string) => void;
}

export const ReportListItem: React.FC<ReportListItemProps> = ({
  report,
  isActive = false,
  onClick,
  onDelete,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all backdrop-blur ${
        isActive
          ? 'border-corporate-accentPrimary/60 bg-black/50'
          : 'border-corporate-borderPrimary/40 bg-black/30 hover:bg-black/40 hover:border-corporate-accentPrimary/40'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
        if (e.key === 'Delete' && onDelete) {
          e.preventDefault();
          e.stopPropagation();
          if (window.confirm(`Are you sure you want to delete "${report.title}"?`)) {
            onDelete(report.id);
          }
        }
      }}
      aria-label={`Report: ${report.title}, Status: ${report.status}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-corporate-textPrimary text-sm flex-1 line-clamp-2">
          {report.title}
        </h3>
        <StatusBadge status={report.status} />
      </div>
      
      <div className="flex items-center gap-2 text-xs text-corporate-textSecondary mb-2">
        <span>{report.owner}</span>
        <span>•</span>
        <span>{formatDate(report.updated_at)}</span>
      </div>

      {report.tags && report.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {report.tags.slice(0, 3).map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
          {report.tags.length > 3 && (
            <span className="text-xs text-corporate-textSecondary px-2 py-1">
              +{report.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

