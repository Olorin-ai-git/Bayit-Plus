import React, { useState } from 'react';
import { eventBus } from '@/shared/events/EventBus';
import type { TimelineEvent as TimelineEventType } from '../../types/events.types';

interface TimelineEventProps {
  investigationId: string;
  event: TimelineEventType;
  isExpanded?: boolean;
  onExpandToggle?: (eventId: string, expanded: boolean) => void;
  className?: string;
}

export function TimelineEvent({
  investigationId,
  event,
  isExpanded: controlledExpanded,
  onExpandToggle,
  className = ''
}: TimelineEventProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? localExpanded;

  const typeStyles: Record<typeof event.type, { icon: string; color: string }> = {
    info: { icon: 'ℹ', color: 'text-blue-400 bg-blue-900/20 border-blue-500' },
    warning: { icon: '⚠', color: 'text-yellow-400 bg-yellow-900/20 border-yellow-500' },
    critical: { icon: '✕', color: 'text-red-400 bg-red-900/20 border-red-500' },
    success: { icon: '✓', color: 'text-green-400 bg-green-900/20 border-green-500' }
  };

  const severityStyles: Record<typeof event.severity, string> = {
    low: 'text-gray-400',
    medium: 'text-cyan-400',
    high: 'text-amber-400',
    critical: 'text-red-400'
  };

  function handleExpandToggle() {
    const newExpanded = !isExpanded;

    if (onExpandToggle) {
      onExpandToggle(event.id, newExpanded);
    } else {
      setLocalExpanded(newExpanded);
    }

    eventBus.publish('visualization:timeline-event-expanded', {
      investigationId,
      eventId: event.id,
      expanded: newExpanded
    });
  }

  function formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0;

  return (
    <div className={`timeline-event ${className}`}>
      <div
        className={`
          relative flex items-start gap-3 p-3
          border-l-4 ${typeStyles[event.type].color}
          bg-gray-800/50 rounded-r-lg
          transition-all duration-200
          ${hasMetadata ? 'cursor-pointer hover:bg-gray-800/70' : ''}
        `}
        onClick={hasMetadata ? handleExpandToggle : undefined}
      >
        {/* Type Icon */}
        <div
          className={`
            flex-shrink-0 w-8 h-8 rounded-full
            flex items-center justify-center
            text-lg font-bold
            ${typeStyles[event.type].color}
          `}
        >
          {typeStyles[event.type].icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400">
                {formatTimestamp(event.timestamp)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 uppercase">
                {event.type}
              </span>
              <span className={`text-xs font-semibold uppercase ${severityStyles[event.severity]}`}>
                {event.severity}
              </span>
            </div>

            {hasMetadata && (
              <button
                className="text-gray-400 hover:text-gray-200 transition-colors"
                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              >
                <svg
                  className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-gray-200 leading-relaxed">{event.message}</p>

          {/* Metadata (Expandable) */}
          {hasMetadata && isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400 font-medium mb-2">Details:</div>
              <div className="space-y-1">
                {Object.entries(event.metadata).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-xs">
                    <span className="font-mono text-gray-500 min-w-[100px]">{key}:</span>
                    <span className="font-mono text-gray-300 break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
