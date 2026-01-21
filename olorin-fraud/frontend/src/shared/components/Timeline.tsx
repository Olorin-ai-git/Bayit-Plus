/**
 * Timeline Component
 * Feature: 004-new-olorin-frontend
 *
 * Displays chronological timeline of investigation events.
 * Uses Olorin purple styling with event type indicators.
 */

import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface TimelineProps {
  events: TimelineEvent[];
  maxHeight?: string;
  className?: string;
}

/**
 * Timeline with chronological events
 */
export const Timeline: React.FC<TimelineProps> = ({
  events,
  maxHeight = 'max-h-96',
  className = ''
}) => {
  if (events.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <ClockIcon className="w-12 h-12 text-corporate-textTertiary mx-auto mb-3" />
        <p className="text-sm text-corporate-textTertiary">No events recorded</p>
      </div>
    );
  }

  return (
    <div className={`${maxHeight} overflow-y-auto ${className}`}>
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-corporate-borderPrimary" />

        {/* Events */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={event.id} className="relative pl-10">
              {/* Event Indicator */}
              <div
                className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${getEventIndicator(
                  event.type
                )}`}
              >
                {getEventIcon(event.type)}
              </div>

              {/* Event Card */}
              <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg p-4 hover:border-corporate-accentPrimary transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-corporate-textPrimary">
                    {event.title}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded ${getEventBadge(event.type)}`}>
                    {event.type}
                  </span>
                </div>

                {/* Description */}
                {event.description && (
                  <p className="text-sm text-corporate-textSecondary mb-2">
                    {event.description}
                  </p>
                )}

                {/* Metadata */}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-corporate-borderPrimary">
                    <dl className="grid grid-cols-2 gap-2">
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-xs text-corporate-textTertiary">
                            {formatKey(key)}
                          </dt>
                          <dd className="text-xs text-corporate-textPrimary">
                            {String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-xs text-corporate-textTertiary mt-3">
                  {formatTimestamp(event.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Get event indicator styling
 */
function getEventIndicator(type: TimelineEvent['type']): string {
  const indicators: Record<TimelineEvent['type'], string> = {
    info: 'bg-blue-900/30 border-blue-500',
    warning: 'bg-amber-900/30 border-amber-500',
    critical: 'bg-red-900/30 border-corporate-error',
    success: 'bg-corporate-success/30 border-corporate-success'
  };
  return indicators[type];
}

/**
 * Get event icon
 */
function getEventIcon(type: TimelineEvent['type']): string {
  const icons: Record<TimelineEvent['type'], string> = {
    info: '9',
    warning: ' ',
    critical: '',
    success: ''
  };
  return icons[type];
}

/**
 * Get event badge styling
 */
function getEventBadge(type: TimelineEvent['type']): string {
  const badges: Record<TimelineEvent['type'], string> = {
    info: 'bg-blue-900/30 text-blue-400',
    warning: 'bg-amber-900/30 text-amber-400',
    critical: 'bg-red-900/30 text-corporate-error',
    success: 'bg-corporate-success/30 text-corporate-success'
  };
  return badges[type];
}

/**
 * Format metadata key for display
 */
function formatKey(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

export default Timeline;
