/**
 * Timeline Component
 *
 * A virtualized timeline component for displaying investigation events with
 * performance optimization for large datasets using react-window.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  type: 'investigation' | 'evidence' | 'agent' | 'system' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
  agentId?: string;
  evidenceId?: string;
  domainId?: string;
}

export interface TimelineProps {
  /** Timeline events to display */
  events: TimelineEvent[];
  /** Container height */
  height?: number;
  /** Item height for virtualization */
  itemHeight?: number;
  /** Enable filtering by event types */
  enableFiltering?: boolean;
  /** Enable search functionality */
  enableSearch?: boolean;
  /** Show timestamps in relative format */
  showRelativeTime?: boolean;
  /** Group events by time periods */
  groupByPeriod?: 'minute' | 'hour' | 'day' | 'none';
  /** Compact mode for reduced spacing */
  compact?: boolean;
  /** Show filters in header */
  showFilters?: boolean;
  /** Energy flow mode for power grid visualization */
  energyFlowMode?: boolean;
  /** Custom event renderer */
  eventRenderer?: (event: TimelineEvent) => React.ReactNode;
  /** Callback for event click */
  onEventClick?: (event: TimelineEvent) => void;
  /** Callback for event hover */
  onEventHover?: (event: TimelineEvent | null) => void;
  /** Callback for event selection in timeline */
  onEventSelect?: (eventId: string) => void;
  /** Custom styling classes */
  className?: string;
}

interface TimelineItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    events: TimelineEvent[];
    onEventClick?: (event: TimelineEvent) => void;
    onEventHover?: (event: TimelineEvent | null) => void;
    eventRenderer?: (event: TimelineEvent) => React.ReactNode;
    showRelativeTime: boolean;
  };
}

const TimelineItem: React.FC<TimelineItemProps> = ({ index, style, data }) => {
  const { events, onEventClick, onEventHover, eventRenderer, showRelativeTime } = data;
  const event = events[index];

  if (!event) return null;

  const handleClick = () => onEventClick?.(event);
  const handleMouseEnter = () => onEventHover?.(event);
  const handleMouseLeave = () => onEventHover?.(null);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (showRelativeTime) {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'Just now';
    }
    return date.toLocaleString();
  };

  const getEventIcon = (type: string, severity: string) => {
    const baseClasses = 'w-3 h-3 rounded-full flex-shrink-0';

    switch (type) {
      case 'investigation':
        return <div className={`${baseClasses} bg-blue-500`} />;
      case 'evidence':
        return <div className={`${baseClasses} bg-green-500`} />;
      case 'agent':
        return <div className={`${baseClasses} bg-purple-500`} />;
      case 'system':
        return <div className={`${baseClasses} bg-gray-500`} />;
      case 'user':
        return <div className={`${baseClasses} bg-orange-500`} />;
      default:
        return <div className={`${baseClasses} bg-gray-400`} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (eventRenderer) {
    return (
      <div style={style} className="px-4">
        {eventRenderer(event)}
      </div>
    );
  }

  return (
    <div style={style} className="px-4 py-2">
      <div
        className={`relative p-3 border-l-4 rounded-r-md cursor-pointer transition-colors hover:shadow-sm ${getSeverityColor(event.severity)}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <div className="flex items-start gap-3">
          {getEventIcon(event.type, event.severity)}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {event.title}
              </h4>
              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                {formatTimestamp(event.timestamp)}
              </span>
            </div>

            {event.description && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {event.description}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                event.type === 'investigation' ? 'bg-blue-100 text-blue-800' :
                event.type === 'evidence' ? 'bg-green-100 text-green-800' :
                event.type === 'agent' ? 'bg-purple-100 text-purple-800' :
                event.type === 'system' ? 'bg-gray-100 text-gray-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {event.type}
              </span>

              {event.agentId && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  Agent: {event.agentId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Timeline: React.FC<TimelineProps> = ({
  events,
  height = 400,
  itemHeight = 120,
  enableFiltering = true,
  enableSearch = true,
  showRelativeTime = true,
  groupByPeriod = 'none',
  compact = false,
  showFilters = true,
  energyFlowMode = false,
  eventRenderer,
  onEventClick,
  onEventHover,
  onEventSelect,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set());

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.type.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (selectedTypes.size > 0) {
      filtered = filtered.filter(event => selectedTypes.has(event.type));
    }

    // Apply severity filter
    if (selectedSeverities.size > 0) {
      filtered = filtered.filter(event => selectedSeverities.has(event.severity));
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return filtered;
  }, [events, searchTerm, selectedTypes, selectedSeverities]);

  const eventTypes = useMemo(() =>
    Array.from(new Set(events.map(e => e.type))), [events]
  );

  const severityLevels = useMemo(() =>
    Array.from(new Set(events.map(e => e.severity))), [events]
  );

  const toggleTypeFilter = useCallback((type: string) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  const toggleSeverityFilter = useCallback((severity: string) => {
    setSelectedSeverities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(severity)) {
        newSet.delete(severity);
      } else {
        newSet.add(severity);
      }
      return newSet;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedTypes(new Set());
    setSelectedSeverities(new Set());
  }, []);

  return (
    <div className={`timeline-container flex flex-col bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header with search and filters */}
      {(enableSearch || enableFiltering) && showFilters && (
        <div className={`${compact ? 'p-2' : 'p-4'} border-b border-gray-200 space-y-3 ${energyFlowMode ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : ''}`}>
          {energyFlowMode && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-blue-600">⚡</span>
              <h3 className="text-sm font-medium text-blue-900">Energy Flow Timeline</h3>
              <div className="ml-auto flex items-center gap-1 text-xs text-blue-700">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                <span className="ml-1">Live</span>
              </div>
            </div>
          )}
          {enableSearch && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search timeline events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-3 top-2.5 w-4 h-4 text-gray-400">
                🔍
              </div>
            </div>
          )}

          {enableFiltering && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Filters:</span>

              {/* Type filters */}
              {eventTypes.map(type => (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedTypes.has(type)
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}

              {/* Severity filters */}
              {severityLevels.map(severity => (
                <button
                  key={severity}
                  onClick={() => toggleSeverityFilter(severity)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedSeverities.has(severity)
                      ? 'bg-red-100 border-red-300 text-red-800'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {severity}
                </button>
              ))}

              {(selectedTypes.size > 0 || selectedSeverities.size > 0 || searchTerm) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 underline"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          <div className="text-sm text-gray-500">
            Showing {filteredEvents.length} of {events.length} events
          </div>
        </div>
      )}

      {/* Timeline content */}
      <div className="flex-1" style={{ height }}>
        {filteredEvents.length > 0 ? (
          <List
            height={height}
            itemCount={filteredEvents.length}
            itemSize={itemHeight}
            itemData={{
              events: filteredEvents,
              onEventClick,
              onEventHover,
              eventRenderer,
              showRelativeTime,
            }}
          >
            {TimelineItem}
          </List>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">📅</div>
              <p className="text-sm">No timeline events found</p>
              {(searchTerm || selectedTypes.size > 0 || selectedSeverities.size > 0) && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Clear filters to see all events
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;