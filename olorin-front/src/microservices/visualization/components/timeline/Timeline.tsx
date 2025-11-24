import React, { useState, useMemo, useCallback } from 'react';
import { List } from 'react-window';
import { TimelineEvent } from './TimelineEvent';
import { TimelineFilters, TimelineFilterState } from './TimelineFilters';
import { useEventBus } from '../../hooks/useEventBus';
import { useDebounce } from '../../hooks/useDebounce';
import type { TimelineEvent as TimelineEventType, InvestigationLogEntryEvent } from '../../types/events.types';

interface TimelineProps {
  investigationId: string;
  height?: number;
  className?: string;
}

export function Timeline({
  investigationId,
  height = 600,
  className = ''
}: TimelineProps) {
  const [events, setEvents] = useState<TimelineEventType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TimelineFilterState>({
    types: ['info', 'warning', 'critical', 'success'],
    severities: ['low', 'medium', 'high', 'critical']
  });
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEventBus<InvestigationLogEntryEvent>('investigation:log-entry', (event) => {
    if (event.data.investigationId === investigationId) {
      setEvents(prev => {
        const newEvents = [...prev, event.data.logEntry];
        return newEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
    }
  });

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (!filters.types.includes(event.type)) return false;
      if (!filters.severities.includes(event.severity)) return false;

      if (filters.dateRange?.start) {
        const eventDate = new Date(event.timestamp);
        const startDate = new Date(filters.dateRange.start);
        if (eventDate < startDate) return false;
      }

      if (filters.dateRange?.end) {
        const eventDate = new Date(event.timestamp);
        const endDate = new Date(filters.dateRange.end);
        if (eventDate > endDate) return false;
      }

      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const messageMatch = event.message.toLowerCase().includes(searchLower);
        const metadataMatch = event.metadata
          ? JSON.stringify(event.metadata).toLowerCase().includes(searchLower)
          : false;
        return messageMatch || metadataMatch;
      }

      return true;
    });
  }, [events, filters, debouncedSearch]);

  const handleFilterChange = useCallback((newFilters: TimelineFilterState) => {
    setFilters(newFilters);
  }, []);

  const handleExpandToggle = useCallback((eventId: string, expanded: boolean) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(eventId);
      } else {
        newSet.delete(eventId);
      }
      return newSet;
    });
  }, []);

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const event = filteredEvents[index];
    return (
      <div style={style}>
        <TimelineEvent
          investigationId={investigationId}
          event={event}
          isExpanded={expandedEvents.has(event.id)}
          onExpandToggle={handleExpandToggle}
          className="mb-2"
        />
      </div>
    );
  }, [filteredEvents, investigationId, expandedEvents, handleExpandToggle]);

  return (
    <div className={`timeline-container ${className}`}>
      {/* Search and Filters */}
      <div className="space-y-3 mb-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Filters */}
        <TimelineFilters
          investigationId={investigationId}
          initialFilters={filters}
          onFilterChange={handleFilterChange}
          resultCount={filteredEvents.length}
        />
      </div>

      {/* Event Count */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-sm text-gray-400">
          Showing {filteredEvents.length} of {events.length} events
        </div>
        {debouncedSearch && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-orange-400 hover:text-orange-300"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Timeline Events (Virtualized) */}
      {filteredEvents.length > 0 ? (
        <List
          height={height}
          itemCount={filteredEvents.length}
          itemSize={expandedEvents.size > 0 ? 150 : 100}
          width="100%"
          className="timeline-list bg-gray-900/50 rounded-lg p-2"
        >
          {Row}
        </List>
      ) : (
        <div className="flex items-center justify-center h-64 bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-700">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-gray-400">
              {events.length === 0 ? 'No events yet' : 'No events match your filters'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
