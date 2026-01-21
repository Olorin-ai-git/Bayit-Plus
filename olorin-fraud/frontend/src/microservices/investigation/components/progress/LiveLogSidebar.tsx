/**
 * Live Log Sidebar Component
 * Feature: 007-progress-wizard-page
 *
 * Collapsible sidebar on the right side of the screen showing real-time investigation logs.
 * Provides toggle button and smooth expand/collapse animations.
 */

import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { LogStream } from '@shared/components';
import type { LogEntry } from '@shared/components';

interface LiveLogSidebarProps {
  logs: LogEntry[];
  defaultExpanded?: boolean;
  /** Callback when sidebar expansion state changes */
  onExpansionChange?: (isExpanded: boolean) => void;
}

export const LiveLogSidebar: React.FC<LiveLogSidebarProps> = ({
  logs,
  defaultExpanded = false,
  onExpansionChange
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Notify parent when expansion state changes
  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onExpansionChange?.(newState);
  };

  return (
    <>
      {/* Sidebar Container */}
      <div
        className={`fixed top-0 right-0 h-full bg-corporate-bgPrimary border-l-2 border-corporate-borderPrimary transition-all duration-300 ease-in-out z-40 ${
          isExpanded ? 'w-96' : 'w-0'
        }`}
        style={{
          boxShadow: isExpanded ? '-4px 0 12px rgba(0, 0, 0, 0.5)' : 'none'
        }}
      >
        {/* Sidebar Content */}
        <div className={`h-full flex flex-col ${isExpanded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-corporate-borderPrimary bg-corporate-bgSecondary">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h3 className="text-lg font-semibold text-corporate-textPrimary">
                Live Logs
              </h3>
            </div>
            <span className="text-xs px-2 py-1 bg-black/40 backdrop-blur text-corporate-textSecondary border border-corporate-borderPrimary/40 rounded">
              {logs.length} Entries
            </span>
          </div>

          {/* Log Stream Container */}
          <div className="flex-1 overflow-hidden p-4">
            <LogStream
              logs={logs}
              maxHeight="h-full"
              autoScroll={true}
              showTimestamps={true}
              showSource={true}
            />
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className={`fixed top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out z-50 ${
          isExpanded ? 'right-96' : 'right-0'
        }`}
        aria-label={isExpanded ? 'Collapse logs sidebar' : 'Expand logs sidebar'}
      >
        <div className="group relative">
          {/* Button Background */}
          <div className="bg-corporate-bgSecondary border-2 border-corporate-borderPrimary rounded-l-lg px-2 py-6 hover:bg-corporate-bgTertiary transition-all hover:border-corporate-accentPrimary shadow-lg">
            {isExpanded ? (
              <ChevronRightIcon className="w-5 h-5 text-corporate-textPrimary group-hover:text-corporate-accentPrimary transition-colors" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5 text-corporate-textPrimary group-hover:text-corporate-accentPrimary transition-colors" />
            )}
          </div>

          {/* Tooltip (when collapsed) */}
          {!isExpanded && (
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-corporate-bgSecondary border border-corporate-borderPrimary rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-corporate-textPrimary">
                    Live Logs ({logs.length})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* New Logs Badge (when collapsed and new logs) */}
          {!isExpanded && logs.length > 0 && (
            <div className="absolute -top-1 -left-1">
              <div className="w-4 h-4 bg-corporate-accentPrimary rounded-full flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
          )}
        </div>
      </button>
    </>
  );
};

export default LiveLogSidebar;
