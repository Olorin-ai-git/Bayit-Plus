import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Animated } from 'react-native';
import { Search, X, ChevronDown, ChevronUp, Download, Trash2, Copy, CheckCircle, XCircle, Film, Layers } from 'lucide-react';
import Clipboard from '@react-native-clipboard/clipboard';
import { colors, spacing, borderRadius } from '../../theme';
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
    <GlassView style={styles.container} intensity="medium">
      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            { opacity: toastOpacity },
          ]}
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
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
          <Pressable
            onPress={() => setIsExpanded(!isExpanded)}
            style={[styles.expandButton, isRTL && styles.expandButtonRTL]}
          >
            {isExpanded ? (
              <ChevronUp size={20} color={colors.text} />
            ) : (
              <ChevronDown size={20} color={colors.text} />
            )}
          </Pressable>
          <Text style={[styles.title, isRTL && styles.titleRTL]}>{title}</Text>
          <View style={[styles.badge, isRTL && styles.badgeRTL]}>
            <Text style={styles.badgeText}>{filteredLogs.length}</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={[styles.actions, isRTL && styles.actionsRTL]}>
            <Pressable onPress={handleCopy} style={styles.actionButton}>
              <Copy size={16} color={colors.textSecondary} />
            </Pressable>
            {showDownload && (
              <Pressable onPress={handleDownload} style={styles.actionButton}>
                <Download size={16} color={colors.textSecondary} />
              </Pressable>
            )}
            {showClear && onClear && (
              <Pressable onPress={onClear} style={styles.actionButton}>
                <Trash2 size={16} color={colors.error} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {isExpanded && (
        <>
          {/* Controls */}
          <View style={[styles.controls, isRTL && styles.controlsRTL]}>
            {/* Search */}
            {showSearch && (
              <View style={[styles.searchContainer, isRTL && styles.searchContainerRTL]}>
                <Search size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, isRTL && styles.searchInputRTL]}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
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
              <View style={[styles.levelFilters, isRTL && styles.levelFiltersRTL]}>
                {(['debug', 'info', 'warn', 'error', 'success', 'trace'] as LogLevel[]).map(
                  (level) => (
                    <Pressable
                      key={level}
                      onPress={() => toggleLevel(level)}
                      style={[
                        styles.levelButton,
                        selectedLevels.has(level) && {
                          backgroundColor: LOG_COLORS[level] + '33',
                          borderColor: LOG_COLORS[level],
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelButtonText,
                          { color: LOG_COLORS[level] },
                          selectedLevels.has(level) && styles.levelButtonTextActive,
                        ]}
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
                    style={[
                      styles.levelButton,
                      styles.groupToggleButton,
                      groupByContent && styles.groupToggleButtonActive,
                    ]}
                  >
                    <Layers size={12} color={groupByContent ? colors.primary : colors.textMuted} />
                    <Text
                      style={[
                        styles.levelButtonText,
                        { color: groupByContent ? colors.primary : colors.textMuted, marginLeft: 4 },
                      ]}
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
              style={[styles.logContainer, { maxHeight }]}
              contentContainerStyle={styles.logContentContainer}
              showsVerticalScrollIndicator={true}
              onScroll={handleScroll}
              scrollEventThrottle={100}
            >
            {filteredLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{emptyMessage}</Text>
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
                style={styles.scrollToTopButton}
              >
                <ChevronUp size={20} color={colors.text} />
                <Text style={styles.scrollToTopText}>New logs</Text>
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
        style={[styles.logEntry, isRTL && styles.logEntryRTL]}
      >
      {/* Level Indicator */}
      <View style={[styles.levelIndicator, { backgroundColor: levelColor }]} />

      <View style={styles.logContent}>
        {/* Header Line */}
        <View style={[styles.logHeader, isRTL && styles.logHeaderRTL]}>
          {showTimestamp && (
            <Text style={[styles.timestamp, isRTL && styles.timestampRTL]}>
              {formatTimestamp(log.timestamp)}
            </Text>
          )}

          <View style={[styles.levelBadge, { backgroundColor: levelColor + '33' }]}>
            <Text style={[styles.levelText, { color: levelColor }]}>
              {levelLabels[log.level]}
            </Text>
          </View>

          {showSource && log.source && (
            <Text style={[styles.source, isRTL && styles.sourceRTL]}>[{log.source}]</Text>
          )}

          {itemName && (
            <View style={styles.itemBadge}>
              <Film size={12} color={colors.primary} />
              <Text style={styles.itemName}>{itemName}</Text>
            </View>
          )}
        </View>

        {/* Message */}
        <Text style={[styles.message, isRTL && styles.messageRTL]}>
          {formatLogMessage(displayedText || log.message)}
        </Text>

        {/* Metadata (if expanded) */}
        {isExpanded && log.metadata && Object.keys(log.metadata).length > 0 && (
          <View style={styles.metadata}>
            <Text style={styles.metadataLabel}>
              {log.metadata.tool_result ? 'Tool Result:' : 
               log.metadata.tool_input ? 'Tool Input:' : 
               'Metadata:'}
            </Text>
            <Text style={styles.metadataText}>
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
    <View style={styles.groupContainer}>
      {/* Group Header */}
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        style={[styles.groupHeader, { borderLeftColor: statusColor }]}
      >
        <View style={[styles.groupHeaderContent, isRTL && { flexDirection: 'row-reverse' }]}>
          {isExpanded ? (
            <ChevronUp size={16} color={colors.textMuted} />
          ) : (
            <ChevronDown size={16} color={colors.textMuted} />
          )}

          {group.itemName ? (
            <View style={[styles.groupItemBadge, { borderColor: statusColor }]}>
              <Film size={14} color={statusColor} />
              <Text style={[styles.groupItemName, { color: statusColor }]}>
                {group.itemName}
              </Text>
            </View>
          ) : (
            <Text style={styles.groupNoContent}>General Logs</Text>
          )}

          <View style={styles.groupMeta}>
            <Text style={styles.groupCount}>{group.logs.length} logs</Text>
            <Text style={styles.groupTimestamp}>{formatTimestamp(group.latestTimestamp)}</Text>
          </View>

          {/* Status indicators */}
          <View style={styles.groupStatusIndicators}>
            {group.hasErrors && (
              <View style={[styles.groupStatusDot, { backgroundColor: colors.error }]} />
            )}
            {group.hasSuccess && (
              <View style={[styles.groupStatusDot, { backgroundColor: colors.success }]} />
            )}
          </View>
        </View>
      </Pressable>

      {/* Group Logs */}
      {isExpanded && (
        <View style={styles.groupLogs}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  toast: {
    position: 'absolute',
    top: spacing.md,
    left: '50%',
    transform: [{ translateX: -100 }],
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  expandButton: {
    padding: spacing.xs,
  },
  expandButtonRTL: {},
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    flexShrink: 1,
  },
  titleRTL: {
    textAlign: 'right',
  },
  badge: {
    backgroundColor: colors.primary + '33',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeRTL: {},
  badgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionsRTL: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  controls: {
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlsRTL: {},
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchContainerRTL: {
    flexDirection: 'row-reverse',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
    outlineStyle: 'none',
  } as any,
  searchInputRTL: {
    textAlign: 'right',
  },
  levelFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  levelFiltersRTL: {
    flexDirection: 'row-reverse',
  },
  levelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  levelButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  levelButtonTextActive: {
    fontWeight: '700',
  },
  logContainer: {
    flex: 1,
  },
  logContentContainer: {
    flexGrow: 1,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  logEntry: {
    flexDirection: 'row',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: 0,
  },
  logEntryRTL: {
    flexDirection: 'row-reverse',
  },
  levelIndicator: {
    width: 3,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  logContent: {
    flex: 1,
    minWidth: 0,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  logHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  timestampRTL: {
    textAlign: 'right',
  },
  levelBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  source: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  sourceRTL: {
    textAlign: 'right',
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  } as any,
  itemName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: 'monospace',
    maxWidth: 200,
  } as any,
  message: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  } as any,
  messageRTL: {
    textAlign: 'right',
  },
  metadata: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
    fontFamily: 'monospace',
  },
  metadataText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    lineHeight: 18,
  } as any,
  scrollToTopButton: {
    position: 'absolute',
    top: spacing.md,
    left: '50%',
    transform: [{ translateX: -60 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  } as any,
  scrollToTopText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background,
  },
  // Group toggle button
  groupToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
    paddingHorizontal: spacing.md,
  } as any,
  groupToggleButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  // Group container styles
  groupContainer: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  } as any,
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  } as any,
  groupItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  } as any,
  groupItemName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    maxWidth: 300,
  } as any,
  groupNoContent: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginLeft: 'auto',
  } as any,
  groupCount: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  groupTimestamp: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  groupStatusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  } as any,
  groupStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupLogs: {
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: spacing.sm,
  },
});
