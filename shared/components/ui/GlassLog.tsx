import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Animated } from 'react-native';
import { Search, X, ChevronDown, ChevronUp, Download, Trash2, Copy, CheckCircle, XCircle } from 'lucide-react';
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
  onClear?: () => void;
  onDownload?: () => void;
  title?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  levelLabels?: Record<LogLevel, string>;
  isRTL?: boolean;
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
  onClear,
  onDownload,
  title = 'Logs',
  searchPlaceholder = 'Search logs...',
  emptyMessage = 'No logs to display',
  levelLabels = DEFAULT_LEVEL_LABELS,
  isRTL = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(
    new Set(['debug', 'info', 'warn', 'error', 'success', 'trace'])
  );
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger'>('success');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Auto-scroll to top when new logs arrive (newest logs are at the top)
  useEffect(() => {
    if (autoScroll && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [logs, autoScroll]);

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
              </View>
            )}
          </View>

          {/* Log Entries */}
          <ScrollView
            ref={scrollViewRef}
            style={[styles.logContainer, { maxHeight }]}
            showsVerticalScrollIndicator={true}
          >
            {filteredLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{emptyMessage}</Text>
              </View>
            ) : (
              filteredLogs.map((log) => (
                <LogEntryItem
                  key={log.id}
                  log={log}
                  showTimestamp={showTimestamp}
                  showSource={showSource}
                  isRTL={isRTL}
                  levelLabels={levelLabels}
                />
              ))
            )}
          </ScrollView>
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
}

const LogEntryItem: React.FC<LogEntryItemProps> = ({
  log,
  showTimestamp,
  showSource,
  isRTL,
  levelLabels,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const levelColor = LOG_COLORS[log.level];

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
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
        </View>

        {/* Message */}
        <Text style={[styles.message, isRTL && styles.messageRTL]}>{log.message}</Text>

        {/* Metadata (if expanded) */}
        {isExpanded && log.metadata && (
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              {JSON.stringify(log.metadata, null, 2)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
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
  message: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  messageRTL: {
    textAlign: 'right',
  },
  metadata: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  metadataText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
});
