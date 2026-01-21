/**
 * Activity Log Component
 * Displays investigation activity log entries
 */

import React from 'react';
import { ActivityLogEntry } from '../types/investigations';

interface ActivityLogProps {
  entries: ActivityLogEntry[];
  maxHeight?: string;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({
  entries,
  maxHeight = '400px'
}) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-8 text-corporate-textSecondary">
        No activity log entries
      </div>
    );
  }

  return (
    <div
      className="space-y-3 overflow-y-auto"
      style={{ maxHeight }}
    >
      {entries.map((entry, index) => (
        <div
          key={index}
          className="flex gap-4 p-3 bg-corporate-bgSecondary/50 border border-corporate-borderPrimary/40 rounded-lg hover:border-corporate-accentPrimary/40 transition-colors"
        >
          {/* Time */}
          <div className="flex-shrink-0 w-20 text-xs text-corporate-textTertiary">
            {new Date(entry.time).toLocaleTimeString()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-corporate-textPrimary">
              {entry.text}
            </p>
            {entry.source && (
              <p className="text-xs text-corporate-textTertiary mt-1">
                Source: <span className="text-corporate-textSecondary">{entry.source}</span>
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

