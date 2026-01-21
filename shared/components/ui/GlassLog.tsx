import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Animated } from 'react-native';
import { Search, X, ChevronDown, ChevronUp, Download, Trash2, Copy, CheckCircle, XCircle, Film, Layers } from 'lucide-react';
import Clipboard from '@react-native-clipboard/clipboard';
import { colors } from '../../theme';
import { GlassView } from './GlassView';
import { GlassButton } from './GlassButton';
import { GlassBadge } from './GlassBadge';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'trace';

export interface LogEntry {
  id: string;
  timestamp: Date | string;
  level: LogLevel;
  message: string;
  source?: string;
  metadata?: Record<string, any>;
  itemName?: string; // Content item name (movie/show title)
  contentId?: string; // Content item ID
}

interface GlassLogProps {
  logs: LogEntry[];
  maxHeight?: number;
  autoScroll?: boolean;
  showTimestamp?: boolean;
  showSource?: boolean;
  showSearch?: boolean;
  showLevelFilter?: boolean;
  showClear?: boolean;
  showDownload?: boolean;
  showGroupByContent?: boolean;
  defaultGroupByContent?: boolean;
  onClear?: () => void;
  onDownload?: () => void;
  title?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  levelLabels?: Record<LogLevel, string>;
  groupByContentLabel?: string;
  isRTL?: boolean;
  animateEntries?: boolean;
  typewriterSpeed?: number;
}

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '#9CA3AF',    // Gray
  info: colors.primary,  // Cyan
  warn: colors.warning,  // Yellow
  error: colors.error,   // Red
  success: colors.success, // Green
  trace: '#A78BFA',    // Purple
};

const DEFAULT_LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  success: 'SUCCESS',
  trace: 'TRACE',
};

export const GlassLog: React.FC<GlassLogProps> = ({
  logs,
  maxHeight = 500,
  autoScroll = true,
  showTimestamp = true,
  showSource = true,
  showSearch = true,
  showLevelFilter = true,
  showClear = true,
  showDownload = true,
  showGroupByContent = true,
  defaultGroupByContent = false,
  onClear,
  onDownload,
  title = 'Logs',
  searchPlaceholder = 'Search logs...',
  emptyMessage = 'No logs to display',
  levelLabels = DEFAULT_LEVEL_LABELS,
  groupByContentLabel = 'Group by content',
  isRTL = false,
  animateEntries = false,
  typewriterSpeed = 50,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(
    new Set(['debug', 'info', 'warn', 'error', 'success', 'trace'])
  );
  const [isExpanded, setIsExpanded] = useState(true);
  const [groupByContent, setGroupByContent] = useState(defaultGroupByContent);
  const scrollViewRef = useRef<ScrollView>(null);
  const [displayedText, setDisplayedText] = useState<Record<string, string>>({});
  const [logAnimations, setLogAnimations] = useState<Record<string, {
    translateY: Animated.Value;
    opacity: Animated.Value;
  }>>({});
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(autoScroll);
  const [isNearTop, setIsNearTop] = useState(true);
  const isUserScrollingRef = useRef(false);
  const previousLogIdsRef = useRef<Set<string>>(new Set());
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger'>('success');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Slide-down and fade-in animation when new log entries are added
  useEffect(() => {
    const fullText: Record<string, string> = {};
    const newAnimations: Record<string, { translateY: Animated.Value; opacity: Animated.Value }> = { ...logAnimations };
    const currentLogIds = new Set(logs.map(log => log.id));
    const previousLogIds = previousLogIdsRef.current;
    
    // Find new log entries (ones that weren't in the previous set)
    const newLogIdsArray = logs.filter(log => !previousLogIds.has(log.id)).map(log => log.id);
    const hasNewLogs = newLogIdsArray.length > 0;
    
    setNewLogIds(new Set(newLogIdsArray));
    
    logs.forEach((log) => {
      fullText[log.id] = log.message;
      
      const isNewLog = newLogIdsArray.includes(log.id);
      
      // Initialize animation values if they don't exist
      if (!newAnimations[log.id]) {
        if (isNewLog) {
          // New log: fade in from transparent
          newAnimations[log.id] = {
            translateY: new Animated.Value(0),
            opacity: new Animated.Value(0),
          };
          
          // Fade in the new log
          Animated.timing(newAnimations[log.id].opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        } else if (hasNewLogs) {
          // Existing log when new logs are added: start pushed down, then slide to normal position
          newAnimations[log.id] = {
            translateY: new Animated.Value(80), // Start 80px down
            opacity: new Animated.Value(1),
          };
          
          // Slide up to normal position
          Animated.spring(newAnimations[log.id].translateY, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start();
        } else {
          // Initial load or no new logs: no animation
          newAnimations[log.id] = {
            translateY: new Animated.Value(0),
            opacity: new Animated.Value(1),
          };
        }
      }
    });
    
    setDisplayedText(fullText);
    setLogAnimations(newAnimations);
    
    // Update previous log IDs for next comparison
    previousLogIdsRef.current = currentLogIds;
    
    // Clear new log IDs after animation
    setTimeout(() => setNewLogIds(new Set()), 400);
  }, [logs]);

  // Auto-scroll to top when new logs arrive (newest logs are at the top)
  useEffect(() => {
    if (autoScrollEnabled && scrollViewRef.current && !isUserScrollingRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [logs, autoScrollEnabled]);

  // Handle scroll event to detect user scrolling
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const isAtTop = scrollY <= 50; // Within 50px of top
    
    setIsNearTop(isAtTop);
    
    // If user scrolled away from top, disable auto-scroll
    if (!isAtTop && autoScrollEnabled) {
      isUserScrollingRef.current = true;
      setAutoScrollEnabled(false);
    }
    
    // If user scrolled back to top, re-enable auto-scroll
    if (isAtTop && !autoScrollEnabled) {
      isUserScrollingRef.current = false;
      setAutoScrollEnabled(true);
    }
  };

  const handleScrollToTop = () => {
    isUserScrollingRef.current = false;
    setAutoScrollEnabled(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const toggleLevel = (level: LogLevel) => {
    const newLevels = new Set(selectedLevels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    setSelectedLevels(newLevels);
  };

  const filteredLogs = logs.filter((log) => {
    // Filter by level
    if (!selectedLevels.has(log.level)) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(query) ||
        log.source?.toLowerCase().includes(query) ||
        JSON.stringify(log.metadata).toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Group logs by content item when grouping is enabled
  interface LogGroup {
    contentId: string | null;
    itemName: string | null;
    logs: LogEntry[];
    latestTimestamp: Date | string;
    hasErrors: boolean;
    hasSuccess: boolean;
  }

  const groupedLogs = React.useMemo((): LogGroup[] => {
    if (!groupByContent) return [];

    const groups: Map<string, LogGroup> = new Map();
    const NO_CONTENT_KEY = '__no_content__';

    filteredLogs.forEach((log) => {
      const key = log.contentId || NO_CONTENT_KEY;

      if (!groups.has(key)) {
        groups.set(key, {
          contentId: log.contentId || null,
          itemName: log.itemName || null,
          logs: [],
          latestTimestamp: log.timestamp,
          hasErrors: false,
          hasSuccess: false,
        });
      }

      const group = groups.get(key)!;
      group.logs.push(log);

      // Update item name if we find one
      if (log.itemName && !group.itemName) {
        group.itemName = log.itemName;
      }

      // Track error/success status
      if (log.level === 'error') group.hasErrors = true;
      if (log.level === 'success') group.hasSuccess = true;

      // Update latest timestamp
      const logTime = typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp;
      const groupTime = typeof group.latestTimestamp === 'string' ? new Date(group.latestTimestamp) : group.latestTimestamp;
      if (logTime > groupTime) {
        group.latestTimestamp = log.timestamp;
      }
    });

    // Convert to array and sort by latest timestamp (most recent first)
    const result = Array.from(groups.values()).sort((a, b) => {
      const timeA = typeof a.latestTimestamp === 'string' ? new Date(a.latestTimestamp) : a.latestTimestamp;
      const timeB = typeof b.latestTimestamp === 'string' ? new Date(b.latestTimestamp) : b.latestTimestamp;
      return timeB.getTime() - timeA.getTime();
    });

    return result;
  }, [filteredLogs, groupByContent]);

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      const logText = logs
        .map((log) => {
          const ts = formatTimestamp(log.timestamp);
          const source = log.source ? `[${log.source}]` : '';
          return `[${ts}] [${levelLabels[log.level]}] ${source} ${log.message}`;
        })
        .join('\n');

      // Create blob and download
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs-${Date.now()}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const showToast = (message: string, type: 'success' | 'danger') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    // Fade in
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
      });
    }, 3000);
  };

  const handleCopy = () => {
    try {
      // Format filtered logs as text
      const logText = filteredLogs
        .map((log) => {
          const ts = formatTimestamp(log.timestamp);
          const source = log.source ? `[${log.source}]` : '';
          return `[${ts}] [${levelLabels[log.level]}] ${source} ${log.message}`;
        })
        .join('\n');

      if (!logText || filteredLogs.length === 0) {
        showToast('No logs to copy', 'danger');
        return;
      }

      // Copy to clipboard
      Clipboard.setString(logText);

      // Show success feedback with count
      const count = filteredLogs.length;
      showToast(
        `✓ Copied ${count} log ${count === 1 ? 'entry' : 'entries'}`,
        'success'
      );
    } catch (error) {
      // Show error feedback
      showToast(
        `✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'danger'
      );
    }
  };

  return (
    <GlassView className="flex-1 rounded-lg overflow-hidden relative" intensity="medium">
      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View
          className="absolute top-4 left-1/2 z-[1000] shadow-lg"
          style={{ opacity: toastOpacity, transform: [{ translateX: -100 }] }}
        >
          <GlassBadge
            variant={toastType}
            size="lg"
            icon={
              toastType === 'success' ? (
                <CheckCircle size={16} color={colors.success} />
              ) : (
                <XCircle size={16} color={colors.error} />
              )
            }
          >
            {toastMessage}
          </GlassBadge>
        </Animated.View>
      )}

      {/* Header */}
      <View className={`flex-row justify-between items-center p-4 border-b border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <View className={`flex-row items-center gap-2 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Pressable
            onPress={() => setIsExpanded(!isExpanded)}
            className="p-1"
          >
            {isExpanded ? (
              <ChevronUp size={20} color={colors.text} />
            ) : (
              <ChevronDown size={20} color={colors.text} />
            )}
          </Pressable>
          <Text className={`text-base font-semibold text-white flex-1 ${isRTL ? 'text-right' : ''}`}>{title}</Text>
          <View className="bg-purple-500/20 px-2 py-0.5 rounded-full">
            <Text className="text-xs text-purple-500 font-semibold">{filteredLogs.length}</Text>
          </View>
        </View>

        {isExpanded && (
          <View className={`flex-row gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Pressable onPress={handleCopy} className="p-2 rounded bg-white/5">
              <Copy size={16} color={colors.textSecondary} />
            </Pressable>
            {showDownload && (
              <Pressable onPress={handleDownload} className="p-2 rounded bg-white/5">
                <Download size={16} color={colors.textSecondary} />
              </Pressable>
            )}
            {showClear && onClear && (
              <Pressable onPress={onClear} className="p-2 rounded bg-white/5">
                <Trash2 size={16} color={colors.error} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {isExpanded && (
        <>
          {/* Controls */}
          <View className={`p-4 gap-4 border-b border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Search */}
            {showSearch && (
              <View className={`flex-row items-center gap-2 bg-white/5 rounded-lg px-4 py-2 border border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Search size={16} color={colors.textMuted} />
                <TextInput
                  className={`flex-1 text-sm text-white p-0 ${isRTL ? 'text-right' : ''}`}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{ outlineStyle: 'none' } as any}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <X size={16} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            )}

            {/* Level Filters */}
            {showLevelFilter && (
              <View className={`flex-row flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {(['debug', 'info', 'warn', 'error', 'success', 'trace'] as LogLevel[]).map(
                  (level) => (
                    <Pressable
                      key={level}
                      onPress={() => toggleLevel(level)}
                      className="px-4 py-1 rounded border border-white/10 bg-white/5"
                      style={selectedLevels.has(level) && {
                        backgroundColor: LOG_COLORS[level] + '33',
                        borderColor: LOG_COLORS[level],
                      }}
                    >
                      <Text
                        className={`text-[11px] ${selectedLevels.has(level) ? 'font-bold' : 'font-semibold'}`}
                        style={{ color: LOG_COLORS[level] }}
                      >
                        {levelLabels[level]}
                      </Text>
                    </Pressable>
                  )
                )}

                {/* Group by Content Toggle */}
                {showGroupByContent && (
                  <Pressable
                    onPress={() => setGroupByContent(!groupByContent)}
                    className={`flex-row items-center ml-4 px-4 py-1 rounded border ${groupByContent ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5'}`}
                  >
                    <Layers size={12} color={groupByContent ? colors.primary : colors.textMuted} />
                    <Text
                      className="text-[11px] font-semibold ml-1"
                      style={{ color: groupByContent ? colors.primary : colors.textMuted }}
                    >
                      {groupByContentLabel}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Log Entries */}
          <View style={{ position: 'relative', flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1 }}
              style={{ maxHeight }}
              showsVerticalScrollIndicator={true}
              onScroll={handleScroll}
              scrollEventThrottle={100}
            >
            {filteredLogs.length === 0 ? (
              <View className="p-8 items-center justify-center">
                <Text className="text-sm text-gray-500">{emptyMessage}</Text>
              </View>
            ) : groupByContent ? (
              // Grouped View
              groupedLogs.map((group) => (
                <LogGroupItem
                  key={group.contentId || '__no_content__'}
                  group={group}
                  showTimestamp={showTimestamp}
                  showSource={showSource}
                  isRTL={isRTL}
                  levelLabels={levelLabels}
                  animateEntries={animateEntries}
                  displayedText={displayedText}
                  logAnimations={logAnimations}
                  newLogIds={newLogIds}
                />
              ))
            ) : (
              // Flat View
              filteredLogs.map((log) => (
                <LogEntryItem
                  key={log.id}
                  log={log}
                  showTimestamp={showTimestamp}
                  showSource={showSource}
                  isRTL={isRTL}
                  levelLabels={levelLabels}
                  animateEntries={animateEntries}
                  displayedText={displayedText[log.id] || ''}
                  animations={logAnimations[log.id]}
                  isNew={newLogIds.has(log.id)}
                />
              ))
            )}
            </ScrollView>

            {/* Scroll to Top Button */}
            {!autoScrollEnabled && (
              <Pressable
                onPress={handleScrollToTop}
                className="absolute top-4 left-1/2 flex-row items-center gap-1 bg-purple-500 px-4 py-2 rounded-full shadow-lg z-[100]"
                style={{ transform: [{ translateX: -60 }] }}
              >
                <ChevronUp size={20} color={colors.text} />
                <Text className="text-[13px] font-semibold text-gray-900">New logs</Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </GlassView>
  );
};

interface LogEntryItemProps {
  log: LogEntry;
  showTimestamp: boolean;
  showSource: boolean;
  isRTL: boolean;
  levelLabels: Record<LogLevel, string>;
  animateEntries: boolean;
  displayedText: string;
  animations?: {
    translateY: Animated.Value;
    opacity: Animated.Value;
  };
  isNew?: boolean;
}

const LogEntryItem: React.FC<LogEntryItemProps> = ({
  log,
  showTimestamp,
  showSource,
  isRTL,
  levelLabels,
  animateEntries,
  displayedText,
  animations,
  isNew,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const levelColor = LOG_COLORS[log.level];

  // Use item name from structured log entry
  const itemName = log.itemName;

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // Format message - keep it simple since backend now provides structured data
  const formatLogMessage = (message: string) => {
    // Message is already clean from backend, just return as-is
    return message;
  };

  return (
    <Animated.View
      style={{
        opacity: animations?.opacity || 1,
        transform: animations?.translateY
          ? [{ translateY: animations.translateY }]
          : [],
      }}
    >
      <Pressable
        onPress={() => log.metadata && setIsExpanded(!isExpanded)}
        className={`flex-row p-2 border-b border-white/5 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}
      >
      {/* Level Indicator */}
      <View className="w-[3px] mr-2 rounded" style={{ backgroundColor: levelColor }} />

      <View className="flex-1 min-w-0">
        {/* Header Line */}
        <View className={`flex-row items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {showTimestamp && (
            <Text className={`text-[11px] text-gray-500 font-mono ${isRTL ? 'text-right' : ''}`}>
              {formatTimestamp(log.timestamp)}
            </Text>
          )}

          <View className="px-1 py-0.5 rounded-sm" style={{ backgroundColor: levelColor + '33' }}>
            <Text className="text-[10px] font-bold font-mono" style={{ color: levelColor }}>
              {levelLabels[log.level]}
            </Text>
          </View>

          {showSource && log.source && (
            <Text className={`text-[11px] text-gray-400 font-mono ${isRTL ? 'text-right' : ''}`}>[{log.source}]</Text>
          )}

          {itemName && (
            <View className="flex-row items-center gap-1 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/40" style={{ maxWidth: 200 }}>
              <Film size={12} color={colors.primary} />
              <Text className="text-[11px] font-semibold text-purple-500 font-mono">{itemName}</Text>
            </View>
          )}
        </View>

        {/* Message */}
        <Text className={`text-[13px] text-white leading-5 font-mono ${isRTL ? 'text-right' : ''}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' } as any}>
          {formatLogMessage(displayedText || log.message)}
        </Text>

        {/* Metadata (if expanded) */}
        {isExpanded && log.metadata && Object.keys(log.metadata).length > 0 && (
          <View className="mt-2 p-4 bg-black/40 rounded-lg border-l-[3px] border-purple-500">
            <Text className="text-xs font-semibold text-purple-500 mb-1 font-mono">
              {log.metadata.tool_result ? 'Tool Result:' :
               log.metadata.tool_input ? 'Tool Input:' :
               'Metadata:'}
            </Text>
            <Text className="text-xs text-gray-400 font-mono leading-[18px]" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' } as any}>
              {JSON.stringify(log.metadata.tool_result || log.metadata.tool_input || log.metadata, null, 2)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
    </Animated.View>
  );
};

// Log Group Item for grouped view
interface LogGroupItemProps {
  group: {
    contentId: string | null;
    itemName: string | null;
    logs: LogEntry[];
    latestTimestamp: Date | string;
    hasErrors: boolean;
    hasSuccess: boolean;
  };
  showTimestamp: boolean;
  showSource: boolean;
  isRTL: boolean;
  levelLabels: Record<LogLevel, string>;
  animateEntries: boolean;
  displayedText: Record<string, string>;
  logAnimations: Record<string, { translateY: Animated.Value; opacity: Animated.Value }>;
  newLogIds: Set<string>;
}

const LogGroupItem: React.FC<LogGroupItemProps> = ({
  group,
  showTimestamp,
  showSource,
  isRTL,
  levelLabels,
  animateEntries,
  displayedText,
  logAnimations,
  newLogIds,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // Determine group status color
  const statusColor = group.hasErrors ? colors.error : group.hasSuccess ? colors.success : colors.primary;

  return (
    <View className="mb-2 rounded-lg bg-white/2 overflow-hidden">
      {/* Group Header */}
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center p-4 bg-white/5 border-l-4 border-b border-white/10"
        style={{ borderLeftColor: statusColor }}
      >
        <View className={`flex-row items-center flex-1 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {isExpanded ? (
            <ChevronUp size={16} color={colors.textMuted} />
          ) : (
            <ChevronDown size={16} color={colors.textMuted} />
          )}

          {group.itemName ? (
            <View className="flex-row items-center gap-1 bg-black/30 px-4 py-1 rounded-lg border" style={{ borderColor: statusColor, maxWidth: 300 }}>
              <Film size={14} color={statusColor} />
              <Text className="text-[13px] font-bold font-mono" style={{ color: statusColor }}>
                {group.itemName}
              </Text>
            </View>
          ) : (
            <Text className="text-[13px] font-semibold text-gray-500 italic">General Logs</Text>
          )}

          <View className="flex-row items-center gap-4 ml-auto">
            <Text className="text-[11px] text-gray-500 font-mono">{group.logs.length} logs</Text>
            <Text className="text-[11px] text-gray-500 font-mono">{formatTimestamp(group.latestTimestamp)}</Text>
          </View>

          {/* Status indicators */}
          <View className="flex-row items-center gap-1">
            {group.hasErrors && (
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.error }} />
            )}
            {group.hasSuccess && (
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.success }} />
            )}
          </View>
        </View>
      </Pressable>

      {/* Group Logs */}
      {isExpanded && (
        <View className="pl-4 border-l border-white/10 ml-2">
          {group.logs.map((log) => (
            <LogEntryItem
              key={log.id}
              log={log}
              showTimestamp={showTimestamp}
              showSource={showSource}
              isRTL={isRTL}
              levelLabels={levelLabels}
              animateEntries={animateEntries}
              displayedText={displayedText[log.id] || ''}
              animations={logAnimations[log.id]}
              isNew={newLogIds.has(log.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
};