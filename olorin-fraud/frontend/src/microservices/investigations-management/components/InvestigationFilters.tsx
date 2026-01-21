/**
 * Investigation Filters Component
 * Provides search, status filter, and tab-based filtering
 */

import React from 'react';
import { InvestigationTab, InvestigationStatus } from '../types/investigations';

interface InvestigationFiltersProps {
  searchQuery: string;
  statusFilter: InvestigationStatus | 'all';
  currentTab: InvestigationTab;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (status: InvestigationStatus | 'all') => void;
  onTabChange: (tab: InvestigationTab) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

const tabs: { id: InvestigationTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My Items' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
  { id: 'archived', label: 'Archived' }
];

const statusOptions: { value: InvestigationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'archived', label: 'Archived' }
];

export const InvestigationFilters: React.FC<InvestigationFiltersProps> = ({
  searchQuery,
  statusFilter,
  currentTab,
  onSearchChange,
  onStatusFilterChange,
  onTabChange,
  searchInputRef
}) => {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2 flex-1 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg px-3 md:px-4 py-2">
          <svg className="w-4 h-4 text-corporate-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search investigations… ( / )"
            className="flex-1 bg-transparent border-none outline-none text-corporate-textPrimary placeholder-corporate-textTertiary"
          />
          <span className="px-2 py-1 text-xs bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded text-corporate-textSecondary">
            /
          </span>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as InvestigationStatus | 'all')}
          className="px-3 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary text-xs md:text-sm w-full sm:w-auto"
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg border text-xs md:text-sm transition-all ${
              currentTab === tab.id
                ? 'border-corporate-accentPrimary bg-corporate-accentPrimary/20 text-corporate-accentPrimary shadow-lg shadow-corporate-accentPrimary/20'
                : 'border-corporate-borderPrimary/40 bg-corporate-bgSecondary text-corporate-textSecondary hover:border-corporate-accentPrimary/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

