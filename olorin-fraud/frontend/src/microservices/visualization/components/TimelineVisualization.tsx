import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  TimelineItem,
  TimelineGroup,
  TimelineOptions,
  VisualizationTheme,
  VisualizationEvent,
  ExportOptions,
  VisualizationError
} from '../types/visualization';

// Props interface
interface TimelineVisualizationProps {
  items: TimelineItem[];
  groups?: TimelineGroup[];
  options?: TimelineOptions;
  theme?: VisualizationTheme;
  width?: string | number;
  height?: string | number;
  className?: string;
  enableZoom?: boolean;
  enableMove?: boolean;
  enableSelection?: boolean;
  selectedItems?: string[];
  highlightedItems?: string[];
  currentTime?: Date;
  showCurrentTime?: boolean;
  loading?: boolean;
  error?: VisualizationError | null;
  onItemClick?: (event: VisualizationEvent) => void;
  onItemDoubleClick?: (event: VisualizationEvent) => void;
  onItemMove?: (item: TimelineItem, callback: (item: TimelineItem | null) => void) => void;
  onSelectionChange?: (selection: string[]) => void;
  onRangeChange?: (range: { start: Date; end: Date }) => void;
  onTimeChange?: (time: Date) => void;
  onError?: (error: VisualizationError) => void;
  onExport?: (options: ExportOptions) => Promise<void>;
}

// Timeline controls component
const TimelineControls: React.FC<{
  onFitToView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onToggleCurrentTime: () => void;
  onExport?: () => void;
  showCurrentTime: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
}> = ({
  onFitToView,
  onZoomIn,
  onZoomOut,
  onMoveLeft,
  onMoveRight,
  onToggleCurrentTime,
  onExport,
  showCurrentTime,
  canZoomIn,
  canZoomOut
}) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
    <div className="flex items-center space-x-2">
      <button
        onClick={onFitToView}
        title="Fit to View"
        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      >
        Fit All
      </button>

      <div className="flex items-center space-x-1 border border-gray-300 rounded overflow-hidden">
        <button
          onClick={onZoomOut}
          disabled={!canZoomOut}
          title="Zoom Out"
          className="px-2 py-1 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ➖
        </button>
        <button
          onClick={onZoomIn}
          disabled={!canZoomIn}
          title="Zoom In"
          className="px-2 py-1 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-l border-gray-300"
        >
          ➕
        </button>
      </div>

      <div className="flex items-center space-x-1 border border-gray-300 rounded overflow-hidden">
        <button
          onClick={onMoveLeft}
          title="Move Left"
          className="px-2 py-1 bg-white hover:bg-gray-50 transition-colors"
        >
          ⬅️
        </button>
        <button
          onClick={onMoveRight}
          title="Move Right"
          className="px-2 py-1 bg-white hover:bg-gray-50 transition-colors border-l border-gray-300"
        >
          ➡️
        </button>
      </div>
    </div>

    <div className="flex items-center space-x-2">
      <button
        onClick={onToggleCurrentTime}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          showCurrentTime
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        Now
      </button>

      {onExport && (
        <button
          onClick={onExport}
          title="Export Timeline"
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Export
        </button>
      )}
    </div>
  </div>
);

// Timeline item component
const TimelineItemComponent: React.FC<{
  item: TimelineItem;
  isSelected: boolean;
  isHighlighted: boolean;
  theme?: VisualizationTheme;
  onClick?: () => void;
  onDoubleClick?: () => void;
}> = ({ item, isSelected, isHighlighted, theme, onClick, onDoubleClick }) => {
  const itemStart = new Date(item.start);
  const itemEnd = item.end ? new Date(item.end) : null;
  const isRange = itemEnd && itemEnd.getTime() !== itemStart.getTime();

  const getItemColor = () => {
    if (isSelected) return theme?.colors.primary[0] || '#3B82F6';
    if (isHighlighted) return theme?.colors.warning[0] || '#F59E0B';

    switch (item.type) {
      case 'point':
        return theme?.colors.info[0] || '#818CF8';
      case 'range':
        return theme?.colors.success[0] || '#10B981';
      case 'background':
        return theme?.colors.neutral[2] || '#D1D5DB';
      default:
        return theme?.colors.primary[1] || '#60A5FA';
    }
  };

  return (
    <div
      className={`timeline-item ${item.type || 'box'} ${item.className || ''}`}
      style={{
        backgroundColor: getItemColor(),
        borderRadius: '4px',
        padding: '4px 8px',
        margin: '2px 0',
        cursor: 'pointer',
        opacity: item.type === 'background' ? 0.3 : 1,
        ...item.style && JSON.parse(item.style)
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={item.title || item.content}
    >
      <div className="flex items-center space-x-2">
        {isRange && <span className="text-xs text-white">📅</span>}
        {!isRange && <span className="text-xs text-white">•</span>}
        <span className="text-xs text-white font-medium truncate">
          {item.content}
        </span>
      </div>
      {item.title && (
        <div className="text-xs text-white opacity-75 truncate mt-1">
          {item.title}
        </div>
      )}
    </div>
  );
};

// Timeline group header
const TimelineGroupHeader: React.FC<{
  group: TimelineGroup;
  theme?: VisualizationTheme;
}> = ({ group, theme }) => (
  <div
    className={`timeline-group-header ${group.className || ''}`}
    style={{
      padding: '8px 12px',
      borderBottom: `1px solid ${theme?.colors.neutral[2] || '#E5E7EB'}`,
      backgroundColor: theme?.background.secondary || '#F9FAFB',
      ...group.style && JSON.parse(group.style)
    }}
  >
    <div className="font-medium text-gray-900">{group.content}</div>
    {group.title && (
      <div className="text-sm text-gray-500 mt-1">{group.title}</div>
    )}
  </div>
);

// Timeline scale/axis component
const TimelineScale: React.FC<{
  start: Date;
  end: Date;
  width: number;
  theme?: VisualizationTheme;
}> = ({ start, end, width, theme }) => {
  const range = end.getTime() - start.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;

  // Determine appropriate scale based on range
  let interval: number;
  let format: (date: Date) => string;

  if (range > 30 * dayMs) {
    // Months
    interval = 30 * dayMs;
    format = (date) => date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } else if (range > 7 * dayMs) {
    // Days
    interval = dayMs;
    format = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else if (range > dayMs) {
    // Hours
    interval = hourMs;
    format = (date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } else {
    // Minutes
    interval = minuteMs;
    format = (date) => date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  const ticks: Date[] = [];
  let current = new Date(Math.ceil(start.getTime() / interval) * interval);

  while (current <= end) {
    ticks.push(new Date(current));
    current = new Date(current.getTime() + interval);
  }

  return (
    <div
      className="timeline-scale"
      style={{
        height: '40px',
        borderBottom: `1px solid ${theme?.colors.neutral[2] || '#E5E7EB'}`,
        backgroundColor: theme?.background.secondary || '#F9FAFB',
        position: 'relative'
      }}
    >
      {ticks.map((tick, index) => {
        const position = ((tick.getTime() - start.getTime()) / range) * width;

        return (
          <div
            key={index}
            className="absolute top-0 h-full flex items-center"
            style={{
              left: `${position}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-xs text-gray-600 whitespace-nowrap">
              {format(tick)}
            </div>
            <div
              className="absolute top-full w-px bg-gray-300"
              style={{ height: '10px', left: '50%', transform: 'translateX(-50%)' }}
            />
          </div>
        );
      })}
    </div>
  );
};

// Mock timeline implementation (would use vis-timeline in production)
const MockTimeline = {
  fit: () => {},
  getWindow: () => ({ start: new Date(), end: new Date() }),
  setWindow: () => {},
  moveTo: () => {},
  zoomIn: () => {},
  zoomOut: () => {},
  on: () => {},
  off: () => {},
  setData: () => {},
  setOptions: () => {},
  destroy: () => {},
  getSelection: () => [],
  setSelection: () => {},
  focus: () => {}
};

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  items,
  groups = [],
  options = {},
  theme,
  width = '100%',
  height = '400px',
  className = '',
  enableZoom = true,
  enableMove = true,
  enableSelection = true,
  selectedItems = [],
  highlightedItems = [],
  currentTime,
  showCurrentTime = false,
  loading = false,
  error = null,
  onItemClick,
  onItemDoubleClick,
  onItemMove,
  onSelectionChange,
  onRangeChange,
  onTimeChange,
  onError,
  onExport
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<any>(null);

  // State
  const [timelineInstance, setTimelineInstance] = useState<any>(null);
  const [showCurrentTimeState, setShowCurrentTimeState] = useState(showCurrentTime);
  const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Calculate timeline range
  const timelineRange = useMemo(() => {
    if (items.length === 0) {
      const now = new Date();
      return {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        end: now
      };
    }

    const allDates = items.flatMap(item => {
      const dates = [new Date(item.start)];
      if (item.end) dates.push(new Date(item.end));
      return dates;
    });

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Add padding
    const padding = (maxDate.getTime() - minDate.getTime()) * 0.1;

    return {
      start: new Date(minDate.getTime() - padding),
      end: new Date(maxDate.getTime() + padding)
    };
  }, [items]);

  // Group items by group
  const groupedItems = useMemo(() => {
    const grouped = new Map<string, TimelineItem[]>();

    items.forEach(item => {
      const groupId = item.group || 'default';
      if (!grouped.has(groupId)) {
        grouped.set(groupId, []);
      }
      grouped.get(groupId)!.push(item);
    });

    return grouped;
  }, [items]);

  // Initialize timeline
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // In production, would use vis-timeline:
      // import { Timeline } from 'vis-timeline';
      // const timeline = new Timeline(containerRef.current, items, groups, options);

      const timeline = MockTimeline;
      timelineRef.current = timeline;
      setTimelineInstance(timeline);
      setCurrentRange(timelineRange);

      // Set up event listeners
      if (enableSelection) {
        // Mock event setup
      }

    } catch (error) {
      const vizError: VisualizationError = {
        type: 'render',
        message: 'Failed to initialize timeline',
        details: error,
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: [
          'Check if vis-timeline is properly installed',
          'Verify data format is correct',
          'Try refreshing the component'
        ]
      };
      onError?.(vizError);
    }

    return () => {
      if (timelineRef.current) {
        timelineRef.current.destroy();
      }
    };
  }, [items, groups, options, enableSelection, onError, timelineRange]);

  // Control handlers
  const handleFitToView = useCallback(() => {
    timelineRef.current?.fit();
    setCurrentRange(timelineRange);
    setZoomLevel(1);
  }, [timelineRange]);

  const handleZoomIn = useCallback(() => {
    if (zoomLevel < 10) {
      timelineRef.current?.zoomIn(0.5);
      setZoomLevel(prev => prev * 1.5);
    }
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (zoomLevel > 0.1) {
      timelineRef.current?.zoomOut(0.5);
      setZoomLevel(prev => prev / 1.5);
    }
  }, [zoomLevel]);

  const handleMoveLeft = useCallback(() => {
    if (currentRange) {
      const duration = currentRange.end.getTime() - currentRange.start.getTime();
      const shift = duration * 0.2;
      const newRange = {
        start: new Date(currentRange.start.getTime() - shift),
        end: new Date(currentRange.end.getTime() - shift)
      };
      setCurrentRange(newRange);
      onRangeChange?.(newRange);
    }
  }, [currentRange, onRangeChange]);

  const handleMoveRight = useCallback(() => {
    if (currentRange) {
      const duration = currentRange.end.getTime() - currentRange.start.getTime();
      const shift = duration * 0.2;
      const newRange = {
        start: new Date(currentRange.start.getTime() + shift),
        end: new Date(currentRange.end.getTime() + shift)
      };
      setCurrentRange(newRange);
      onRangeChange?.(newRange);
    }
  }, [currentRange, onRangeChange]);

  const handleToggleCurrentTime = useCallback(() => {
    setShowCurrentTimeState(prev => !prev);
    if (currentTime) {
      timelineRef.current?.moveTo(currentTime);
      onTimeChange?.(currentTime);
    }
  }, [currentTime, onTimeChange]);

  const handleExport = useCallback(async () => {
    if (!onExport || !containerRef.current) return;

    try {
      const exportOptions: ExportOptions = {
        format: 'png',
        quality: 1,
        dimensions: {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        },
        backgroundColor: theme?.background.surface || '#ffffff',
        title: 'Timeline Visualization'
      };

      await onExport(exportOptions);
    } catch (error) {
      const vizError: VisualizationError = {
        type: 'render',
        message: 'Failed to export timeline',
        details: error,
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: ['Try again', 'Check if timeline is fully loaded']
      };

      onError?.(vizError);
    }
  }, [onExport, theme, onError]);

  // Handle item interactions
  const handleItemClick = useCallback((item: TimelineItem) => {
    if (onItemClick) {
      const event: VisualizationEvent = {
        type: 'click',
        target: item.id,
        data: item,
        timestamp: new Date().toISOString()
      };
      onItemClick(event);
    }
  }, [onItemClick]);

  const handleItemDoubleClick = useCallback((item: TimelineItem) => {
    if (onItemDoubleClick) {
      const event: VisualizationEvent = {
        type: 'click',
        target: item.id,
        data: item,
        timestamp: new Date().toISOString()
      };
      onItemDoubleClick(event);
    }
  }, [onItemDoubleClick]);

  // Render loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="animate-pulse p-6">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Timeline Error</h3>
          <p className="text-red-700">{error.message}</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Controls */}
      <TimelineControls
        onFitToView={handleFitToView}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onMoveLeft={handleMoveLeft}
        onMoveRight={handleMoveRight}
        onToggleCurrentTime={handleToggleCurrentTime}
        onExport={onExport ? handleExport : undefined}
        showCurrentTime={showCurrentTimeState}
        canZoomIn={zoomLevel < 10}
        canZoomOut={zoomLevel > 0.1}
      />

      {/* Timeline Container */}
      <div
        ref={containerRef}
        style={{
          width: typeof width === 'string' ? width : `${width}px`,
          height: typeof height === 'string' ? height : `${height}px`
        }}
        className="relative overflow-hidden"
      >
        {/* Timeline Scale */}
        {currentRange && (
          <TimelineScale
            start={currentRange.start}
            end={currentRange.end}
            width={containerRef.current?.offsetWidth || 800}
            theme={theme}
          />
        )}

        {/* Timeline Content */}
        <div className="flex-1 overflow-auto">
          {groups.length > 0 ? (
            // Grouped timeline
            groups.map(group => (
              <div key={group.id} className="border-b border-gray-200 last:border-b-0">
                <TimelineGroupHeader group={group} theme={theme} />
                <div className="p-2 space-y-1">
                  {(groupedItems.get(group.id) || []).map(item => (
                    <TimelineItemComponent
                      key={item.id}
                      item={item}
                      isSelected={selectedItems.includes(item.id)}
                      isHighlighted={highlightedItems.includes(item.id)}
                      theme={theme}
                      onClick={() => handleItemClick(item)}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Simple timeline
            <div className="p-4 space-y-2">
              {items.map(item => (
                <TimelineItemComponent
                  key={item.id}
                  item={item}
                  isSelected={selectedItems.includes(item.id)}
                  isHighlighted={highlightedItems.includes(item.id)}
                  theme={theme}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Current Time Indicator */}
        {showCurrentTimeState && (currentTime || showCurrentTime) && currentRange && (
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none"
            style={{
              left: `${((currentTime?.getTime() || Date.now()) - currentRange.start.getTime()) /
                (currentRange.end.getTime() - currentRange.start.getTime()) * 100}%`
            }}
          >
            <div className="absolute top-0 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded">
              Now
            </div>
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-4">📅</div>
              <p className="text-lg font-medium mb-2">No Timeline Data</p>
              <p className="text-sm">Add some events to see the timeline visualization</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with item count */}
      {items.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t text-sm text-gray-600">
          {items.length} event{items.length !== 1 ? 's' : ''} • {groups.length} group{groups.length !== 1 ? 's' : ''}
          {selectedItems.length > 0 && ` • ${selectedItems.length} selected`}
        </div>
      )}
    </div>
  );
};

export default TimelineVisualization;