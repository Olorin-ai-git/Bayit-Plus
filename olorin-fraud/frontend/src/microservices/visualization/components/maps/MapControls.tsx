import React, { useState } from 'react';
import { visualizationConfig } from '../../config/environment';

interface MapControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitBounds?: () => void;
  onFilterChange?: (filters: LocationFilter) => void;
  className?: string;
}

export interface LocationFilter {
  types: string[];
  showRiskOnly: boolean;
  minRiskScore?: number;
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onFitBounds,
  onFilterChange,
  className = ''
}: MapControlsProps) {
  const [filters, setFilters] = useState<LocationFilter>({
    types: ['customer', 'business', 'device', 'transaction', 'risk'],
    showRiskOnly: false,
    minRiskScore: 0
  });
  const [showFilters, setShowFilters] = useState(false);

  const controlButtonClass = `
    w-10 h-10 flex items-center justify-center
    bg-gray-800 border border-gray-700 rounded-md
    text-gray-200 hover:bg-gray-700 hover:border-orange-500
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900
    active:scale-95
  `;

  function handleTypeToggle(type: string) {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];

    const newFilters = { ...filters, types: newTypes };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  }

  function handleRiskToggle() {
    const newFilters = { ...filters, showRiskOnly: !filters.showRiskOnly };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  }

  const locationTypes = [
    { value: 'customer', label: 'Customer', color: 'bg-blue-500' },
    { value: 'business', label: 'Business', color: 'bg-green-500' },
    { value: 'device', label: 'Device', color: 'bg-amber-500' },
    { value: 'transaction', label: 'Transaction', color: 'bg-red-500' },
    { value: 'risk', label: 'Risk', color: 'bg-red-600' }
  ];

  return (
    <div className={`map-controls ${className}`}>
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-2 shadow-xl">
        <div className="flex flex-col gap-2">
          {/* Zoom Controls */}
          <button
            onClick={onZoomIn}
            className={controlButtonClass}
            title="Zoom In"
            aria-label="Zoom in on map"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>

          <button
            onClick={onZoomOut}
            className={controlButtonClass}
            title="Zoom Out"
            aria-label="Zoom out on map"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>

          <button
            onClick={onFitBounds}
            className={controlButtonClass}
            title="Fit to Bounds"
            aria-label="Fit all markers on screen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          <div className="h-px bg-gray-700 my-1" />

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`${controlButtonClass} ${showFilters ? 'bg-orange-600 border-orange-500' : ''}`}
            title="Toggle Filters"
            aria-label="Toggle location type filters"
            aria-pressed={showFilters}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mt-2 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl min-w-[200px]">
          <h3 className="text-sm font-semibold text-gray-200 mb-3">Filter Locations</h3>

          {/* Location Types */}
          <div className="space-y-2 mb-3">
            {locationTypes.map(type => (
              <label key={type.value} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.types.includes(type.value)}
                  onChange={() => handleTypeToggle(type.value)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-900"
                />
                <span className={`w-3 h-3 rounded-full ${type.color}`} />
                <span className="text-sm text-gray-300 group-hover:text-gray-100">{type.label}</span>
              </label>
            ))}
          </div>

          <div className="h-px bg-gray-700 my-3" />

          {/* Risk Filter */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.showRiskOnly}
              onChange={handleRiskToggle}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300 group-hover:text-gray-100">Show Risk Only</span>
          </label>
        </div>
      )}
    </div>
  );
}
