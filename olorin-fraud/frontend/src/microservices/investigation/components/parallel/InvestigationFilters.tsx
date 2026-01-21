/**
 * Investigation Filters Component
 * Feature: 001-startup-analysis-flow
 *
 * Search and status filter controls for the investigations table.
 */

import React, { useRef, useEffect, useState } from 'react';

interface StatusOption {
  value: string;
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'SETTINGS', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ERROR', label: 'Error' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface InvestigationFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilters: string[];
  onStatusFilterChange: (statuses: string[]) => void;
}

export const InvestigationFilters: React.FC<InvestigationFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFilterChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleStatus = (value: string) => {
    const newFilters = statusFilters.includes(value)
      ? statusFilters.filter((v) => v !== value)
      : [...statusFilters, value];
    onStatusFilterChange(newFilters);
  };

  const clearFilters = () => onStatusFilterChange([]);

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center bg-corporate-bgSecondary/30 p-4 rounded-lg border border-corporate-borderPrimary/50">
      <div className="relative flex-1 w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-corporate-textTertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search by ID, Entity, or Merchant..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 block w-full bg-black/50 border border-corporate-borderPrimary rounded-md py-2 text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-corporate-accentPrimary focus:border-corporate-accentPrimary sm:text-sm"
        />
      </div>
      <div className="w-full md:w-64 relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-between w-full bg-black/50 border border-corporate-borderPrimary rounded-md py-2 px-3 text-left text-corporate-textPrimary focus:outline-none sm:text-sm"
        >
          <span className="block truncate">
            {statusFilters.length === 0 ? 'All Statuses' : `${statusFilters.length} Selected`}
          </span>
          <svg className="h-5 w-5 text-corporate-textTertiary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        {isDropdownOpen && (
          <div className="absolute z-10 mt-1 w-full bg-corporate-bgSecondary border border-corporate-borderPrimary rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="p-2 border-b border-corporate-borderPrimary/30 sticky top-0 bg-corporate-bgSecondary z-10">
              <div
                className={`cursor-pointer px-2 py-1 rounded text-xs font-medium hover:bg-white/5 flex items-center gap-2 ${statusFilters.length === 0 ? 'text-corporate-accentPrimary' : 'text-corporate-textSecondary'}`}
                onClick={clearFilters}
              >
                <div className={`w-3 h-3 rounded-full border border-current ${statusFilters.length === 0 ? 'bg-corporate-accentPrimary' : ''}`} />
                All Statuses
              </div>
            </div>
            <div className="p-1">
              {STATUS_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center px-2 py-2 cursor-pointer hover:bg-white/5 rounded"
                  onClick={() => toggleStatus(option.value)}
                >
                  <div className={`w-4 h-4 mr-3 flex items-center justify-center border rounded ${statusFilters.includes(option.value) ? 'bg-corporate-accentPrimary border-corporate-accentPrimary text-white' : 'border-corporate-textTertiary'}`}>
                    {statusFilters.includes(option.value) && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${statusFilters.includes(option.value) ? 'text-white' : 'text-corporate-textSecondary'}`}>
                    {option.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
