/**
 * Window Picker Component
 *
 * Component for selecting time windows (presets or custom dates).
 * Supports recent_14d, retro_14d_6mo_back, and custom windows.
 *
 * Constitutional Compliance:
 * - All dates in ISO 8601 format
 * - America/New_York timezone handling (backend)
 * - No hardcoded date ranges
 */

import React, { useEffect, useState } from 'react';
import { Input } from '@shared/components/ui/Input';
import type { WindowSpec, WindowPreset } from '../types/comparison';

interface WindowPickerProps {
  label: string;
  value: WindowSpec;
  onChange: (spec: WindowSpec) => void;
  matchDuration?: boolean;
  referenceWindow?: WindowSpec; // For "Match durations" feature
}

const PRESETS: { value: WindowPreset; label: string }[] = [
  { value: 'recent_14d', label: 'Recent 14d' },
  { value: 'retro_14d_6mo_back', label: 'Retro 14d (6mo back)' },
  { value: 'custom', label: 'Custom' }
];

export const WindowPicker: React.FC<WindowPickerProps> = ({
  label,
  value,
  onChange,
  matchDuration = false,
  referenceWindow
}) => {
  const handlePresetChange = (preset: WindowPreset) => {
    if (preset === 'custom') {
      onChange({ preset, start: value.start, end: value.end, label: value.label });
    } else {
      onChange({ preset, label: undefined });
    }
  };

  const handleStartChange = (start: string) => {
    const newSpec = { ...value, start };
    
    // If "Match durations" is enabled and we have a reference window, adjust end
    if (matchDuration && referenceWindow && referenceWindow.start && referenceWindow.end) {
      const startDate = new Date(start);
      const refStart = new Date(referenceWindow.start);
      const refEnd = new Date(referenceWindow.end);
      const durationMs = refEnd.getTime() - refStart.getTime();
      const newEnd = new Date(startDate.getTime() + durationMs);
      newSpec.end = newEnd.toISOString();
    }
    
    onChange(newSpec);
  };

  const handleEndChange = (end: string) => {
    onChange({ ...value, end });
  };

  const handleLabelChange = (label: string) => {
    onChange({ ...value, label });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-corporate-textPrimary">
        {label}
      </label>

      <select
        value={value.preset}
        onChange={(e) => handlePresetChange(e.target.value as WindowPreset)}
        className="w-full px-4 py-2 bg-black/30 backdrop-blur border-2 border-corporate-accentPrimary/40 rounded-lg text-corporate-textPrimary focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary"
      >
        {PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>

      {value.preset === 'custom' && (
        <div className="space-y-3 mt-3">
          <div>
            <label className="block text-xs text-corporate-textSecondary mb-1">
              Start Date
            </label>
            <Input
              type="datetime-local"
              value={value.start ? (() => {
                try {
                  const date = new Date(value.start);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                } catch {
                  return value.start.replace('Z', '').substring(0, 16) || '';
                }
              })() : ''}
              onChange={(e) => {
                const localValue = e.target.value;
                const isoValue = localValue ? `${localValue}:00Z` : '';
                handleStartChange(isoValue);
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-corporate-textSecondary mb-1">
              End Date
              {matchDuration && referenceWindow && (
                <span className="text-xs text-corporate-accentPrimary ml-2">
                  (Auto-matched to Window A duration)
                </span>
              )}
            </label>
            <Input
              type="datetime-local"
              value={value.end ? (() => {
                try {
                  const date = new Date(value.end);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                } catch {
                  return value.end.replace('Z', '').substring(0, 16) || '';
                }
              })() : ''}
              onChange={(e) => {
                const localValue = e.target.value;
                const isoValue = localValue ? `${localValue}:00Z` : '';
                handleEndChange(isoValue);
              }}
              disabled={matchDuration && referenceWindow !== undefined}
            />
          </div>
          <div>
            <label className="block text-xs text-corporate-textSecondary mb-1">
              Custom Label (optional)
            </label>
            <Input
              type="text"
              value={value.label || ''}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Window label"
            />
          </div>
        </div>
      )}
    </div>
  );
};

