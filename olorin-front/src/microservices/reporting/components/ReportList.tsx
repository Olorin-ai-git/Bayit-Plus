/**
 * ReportList Component - List of reports with search and filtering
 */

import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useReports } from '../hooks/useReports';
import { ReportListItem } from './ReportListItem';
import { keyboardShortcuts } from '../utils/keyboardShortcuts';
import { Report } from '../types/reports';

interface ReportListProps {
  selectedReportId?: string;
  onSelectReport: (reportId: string) => void;
  onCreateReport?: () => void;
  onExportJSON?: () => void;
  onDeleteReport?: (reportId: string) => void;
}

export const ReportList: React.FC<ReportListProps> = ({
  selectedReportId,
  onSelectReport,
  onCreateReport,
  onExportJSON,
  onDeleteReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { reports, loading, error, fetchReports } = useReports({
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    autoFetch: true,
  });

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const unregister = keyboardShortcuts.register({
      key: '/',
      handler: (e) => {
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      },
    });
    return unregister;
  }, []);

  // Keyboard shortcut: "N" to create new report
  useEffect(() => {
    if (!onCreateReport) return;
    const unregister = keyboardShortcuts.register({
      key: 'n',
      handler: (e) => {
        if (!e.ctrlKey && !e.metaKey) {
          onCreateReport();
        }
      },
    });
    return unregister;
  }, [onCreateReport]);

  // Keyboard shortcut: "Delete" to delete selected report
  useEffect(() => {
    if (!onDeleteReport || !selectedReportId) return;
    const unregister = keyboardShortcuts.register({
      key: 'Delete',
      handler: (e) => {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          if (window.confirm('Are you sure you want to delete this report?')) {
            onDeleteReport(selectedReportId);
          }
        }
      },
    });
    return unregister;
  }, [onDeleteReport, selectedReportId]);

  const filteredReports = reports.filter((report) => {
    // Filter archived reports from default "all" view
    if (activeTab === 'all') {
      return report.status !== 'Archived';
    }
    if (activeTab === 'drafts') return report.status === 'Draft';
    if (activeTab === 'published') return report.status === 'Published';
    if (activeTab === 'archived') return report.status === 'Archived';
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'published', label: 'Published' },
    { id: 'archived', label: 'Archived' },
  ];

  return (
    <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-xl overflow-hidden shadow-lg">
      <header className="flex items-center justify-between p-4 border-b border-corporate-borderPrimary/40 bg-black/30 backdrop-blur">
        <strong className="text-corporate-textPrimary font-semibold">Reports</strong>
        <div className="flex items-center gap-2">
          {onExportJSON && (
            <button
              onClick={onExportJSON}
              className="px-2.5 py-1.5 rounded border-2 border-corporate-borderPrimary/40 text-xs bg-black/40 backdrop-blur text-corporate-textSecondary hover:border-corporate-accentPrimary/60 transition-colors"
              aria-label="Export all reports as JSON"
            >
              Export JSON
            </button>
          )}
          <span className="text-xs text-corporate-textSecondary">Enter to open • Del to delete</span>
        </div>
      </header>

      <div className="p-4">
        <div className="flex gap-2 flex-wrap mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded border-2 text-xs transition-colors ${
                activeTab === tab.id
                  ? 'text-corporate-textPrimary border-corporate-accentPrimary/60 bg-black/50 backdrop-blur'
                  : 'text-corporate-textSecondary border-corporate-borderPrimary/40 bg-black/30 backdrop-blur hover:border-corporate-accentPrimary/40'
              }`}
              aria-label={`Filter by ${tab.label}`}
              aria-pressed={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 p-2.5 bg-black/30 backdrop-blur rounded-lg border-2 border-corporate-borderPrimary/40 mb-3">
          <MagnifyingGlassIcon className="w-4 h-4 text-corporate-textSecondary" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search reports… ( / )"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-corporate-textPrimary outline-none text-sm placeholder-corporate-textSecondary"
            aria-label="Search reports"
          />
          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/40 text-corporate-textSecondary">
            /
          </span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded border-2 border-corporate-borderPrimary/40 text-xs bg-black/30 backdrop-blur text-corporate-textPrimary mb-3 focus:outline-none focus:border-corporate-accentPrimary/60"
        >
          <option value="all">All</option>
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
          <option value="Archived">Archived</option>
        </select>

        {loading && (
          <div className="text-center py-8 text-corporate-textSecondary text-sm">Loading reports...</div>
        )}

        {error && (
          <div className="text-center py-8 text-corporate-error text-sm">Error: {error}</div>
        )}

        {!loading && !error && filteredReports.length === 0 && (
          <div className="text-center py-8 text-corporate-textSecondary text-sm">
            {searchQuery || statusFilter !== 'all' ? 'No reports match your filters' : 'No reports yet'}
          </div>
        )}

        <div className="flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-auto">
          {filteredReports.map((report) => (
            <ReportListItem
              key={report.id}
              report={report}
              isActive={report.id === selectedReportId}
              onClick={() => onSelectReport(report.id)}
              onDelete={onDeleteReport}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

