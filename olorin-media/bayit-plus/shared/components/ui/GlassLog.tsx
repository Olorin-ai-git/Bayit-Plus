import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Animated, StyleSheet } from 'react-native';
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
  itemName?: string;
  contentId?: string;
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
  debug: '#9CA3AF',
  info: colors.primary,
  warn: colors.warning,
  error: colors.error,
  success: colors.success,
  trace: '#A78BFA',
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
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger'>('success');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fullText: Record<string, string> = {};
    const newAnimations: Record<string, { translateY: Animated.Value; opacity: Animated.Value }> = { ...logAnimations };
    const currentLogIds = new Set(logs.map(log => log.id));
    const previousLogIds = previousLogIdsRef.current;

    const newLogIdsArray = logs.filter(log => !previousLogIds.has(log.id)).map(log => log.id);
    const hasNewLogs = newLogIdsArray.length > 0;

    setNewLogIds(new Set(newLogIdsArray));

    logs.forEach((log) => {
      fullText[log.id] = log.message;

      const isNewLog = newLogIdsArray.includes(log.id);

      if (!newAnimations[log.id]) {
        if (isNewLog) {
          newAnimations[log.id] = {
            translateY: new Animated.Value(0),
            opacity: new Animated.Value(0),
          };

          Animated.timing(newAnimations[log.id].opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        } else if (hasNewLogs) {
          newAnimations[log.id] = {
            translateY: new Animated.Value(80),
            opacity: new Animated.Value(1),
          };

          Animated.spring(newAnimations[log.id].translateY, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start();
        } else {
          newAnimations[log.id] = {
            translateY: new Animated.Value(0),
            opacity: new Animated.Value(1),
          };
        }
      }
    });

    setDisplayedText(fullText);
    setLogAnimations(newAnimations);
    previousLogIdsRef.current = currentLogIds;
    setTimeout(() => setNewLogIds(new Set()), 400);
  }, [logs]);

  useEffect(() => {
    if (autoScrollEnabled && scrollViewRef.current && !isUserScrollingRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [logs, autoScrollEnabled]);

  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const isAtTop = scrollY <= 50;

    setIsNearTop(isAtTop);

    if (!isAtTop && autoScrollEnabled) {
      isUserScrollingRef.current = true;
      setAutoScrollEnabled(false);
    }

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
    if (!selectedLevels.has(log.level)) {
      return false;
    }

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

      if (log.itemName && !group.itemName) {
        group.itemName = log.itemName;
      }

      if (log.level === 'error') group.hasErrors = true;
      if (log.level === 'success') group.hasSuccess = true;

      const logTime = typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp;
      const groupTime = typeof group.latestTimestamp === 'string' ? new Date(group.latestTimestamp) : group.latestTimestamp;
      if (logTime > groupTime) {
        group.latestTimestamp = log.timestamp;
      }
    });

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
      const logText = logs
        .map((log) => {
          const ts = formatTimestamp(log.timestamp);
          const source = log.source ? `[${log.source}]` : '';
          return `[${ts}] [${levelLabels[log.level]}] ${source} ${log.message}`;
        })
        .join('\n');

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

    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

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

      Clipboard.setString(logText);

      const count = filteredLogs.length;
      showToast(
        `✓ Copied ${count} log ${count === 1 ? 'entry' : 'entries'}`,
        'success'
      );
    } catch (error) {
      showToast(
        `✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'danger'
      );
    }
  };

  return (
    <GlassView style={styles.container} intensity="medium">
      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
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
        <View style={[styles.headerLeft, isRTL && styles.headerLeftRTL]}>
          <Pressable onPress={() => setIsExpanded(!isExpanded)} style={styles.expandButton}>
            {isExpanded ? (
              <ChevronUp size={20} color={colors.text} />
            ) : (
              <ChevronDown size={20} color={colors.text} />
            )}
          </Pressable>
          <Text style={[styles.title, isRTL && styles.titleRTL]}>{title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{filteredLogs.length}</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={[styles.headerActions, isRTL && styles.headerActionsRTL]}>
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
          <View style={styles.controls}>
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
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelButtonText,
                          { color: LOG_COLORS[level] },
                          selectedLevels.has(level) && styles.levelButtonTextActive
                        ]}
                      >
                        {levelLabels[level]}
                      </Text>
                    </Pressable>
                  )
                )}

                {showGroupByContent && (
                  <Pressable
                    onPress={() => setGroupByContent(!groupByContent)}
                    style={[
                      styles.groupButton,
                      groupByContent && styles.groupButtonActive
                    ]}
                  >
                    <Layers size={12} color={groupByContent ? colors.primary : colors.textMuted} />
                    <Text
                      style={[
                        styles.groupButtonText,
                        groupByContent && styles.groupButtonTextActive
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
          <View style={styles.logContainer}>
            <ScrollView
              ref={scrollViewRef}
              style={[styles.scrollView, { maxHeight }]}
              contentContainerStyle={[
                styles.scrollViewContent,
                filteredLogs.length === 0 && { flex: 1 }
              ]}
              showsVerticalScrollIndicator={true}
              onScroll={handleScroll}
              scrollEventThrottle={100}
            >
              {filteredLogs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{emptyMessage}</Text>
                </View>
              ) : groupByContent ? (
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

            {!autoScrollEnabled && (
              <Pressable onPress={handleScrollToTop} style={styles.scrollToTopButton}>
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
        <View style={[styles.levelIndicator, { backgroundColor: levelColor }]} />

        <View style={styles.logContent}>
          <View style={[styles.logHeader, isRTL && styles.logHeaderRTL]}>
            {showTimestamp && (
              <Text style={[styles.timestamp, isRTL && styles.timestampRTL]}>
                {formatTimestamp(log.timestamp)}
              </Text>
            )}

            <View style={[styles.levelBadge, { backgroundColor: levelColor + '33' }]}>
              <Text style={[styles.levelBadgeText, { color: levelColor }]}>
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

          <Text style={[styles.message, isRTL && styles.messageRTL]}>
            {displayedText || log.message}
          </Text>

          {isExpanded && log.metadata && Object.keys(log.metadata).length > 0 && (
            <View style={styles.metadataContainer}>
              <Text style={styles.metadataTitle}>
                {log.metadata.tool_result ? 'Tool Result:' :
                 log.metadata.tool_input ? 'Tool Input:' :
                 'Metadata:'}
              </Text>
              <Text style={styles.metadataContent}>
                {JSON.stringify(log.metadata.tool_result || log.metadata.tool_input || log.metadata, null, 2)}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

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

  const statusColor = group.hasErrors ? colors.error : group.hasSuccess ? colors.success : colors.primary;

  return (
    <View style={styles.groupContainer}>
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        style={[styles.groupHeader, { borderLeftColor: statusColor }]}
      >
        <View style={[styles.groupHeaderContent, isRTL && styles.groupHeaderContentRTL]}>
          {isExpanded ? (
            <ChevronUp size={16} color={colors.textMuted} />
          ) : (
            <ChevronDown size={16} color={colors.textMuted} />
          )}

          {group.itemName ? (
            <View style={[styles.groupTitle, { borderColor: statusColor }]}>
              <Film size={14} color={statusColor} />
              <Text style={[styles.groupTitleText, { color: statusColor }]}>
                {group.itemName}
              </Text>
            </View>
          ) : (
            <Text style={styles.groupTitleEmpty}>General Logs</Text>
          )}

          <View style={styles.groupInfo}>
            <Text style={styles.groupInfoText}>{group.logs.length} logs</Text>
            <Text style={styles.groupInfoText}>{formatTimestamp(group.latestTimestamp)}</Text>
          </View>

          <View style={styles.groupStatus}>
            {group.hasErrors && (
              <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
            )}
            {group.hasSuccess && (
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            )}
          </View>
        </View>
      </Pressable>

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
  },
  toast: {
    position: 'absolute',
    top: 16,
    left: '50%',
    zIndex: 1000,
    transform: [{ translateX: -100 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerLeftRTL: {
    flexDirection: 'row-reverse',
  },
  expandButton: {
    padding: 4,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  titleRTL: {
    textAlign: 'right',
  },
  badge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionsRTL: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    padding: 8,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 8,
  },
  controls: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  searchContainerRTL: {
    flexDirection: 'row-reverse',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
    marginHorizontal: 8,
    outlineStyle: 'none',
  } as any,
  searchInputRTL: {
    textAlign: 'right',
  },
  levelFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -8,
    marginLeft: -8,
  },
  levelFiltersRTL: {
    flexDirection: 'row-reverse',
  },
  levelButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 8,
    marginLeft: 8,
  },
  levelButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  levelButtonTextActive: {
    fontWeight: 'bold',
  },
  groupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  groupButtonActive: {
    borderColor: '#a855f7',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  groupButtonText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    color: colors.textMuted,
  },
  groupButtonTextActive: {
    color: colors.primary,
  },
  logContainer: {
    position: 'relative',
    flex: 1,
  },
  scrollView: {
    flex: 1,
    minHeight: 200,
  },
  scrollViewContent: {
    flexGrow: 1,
    minHeight: 200,
  },
  emptyContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollToTopButton: {
    position: 'absolute',
    top: 16,
    left: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a855f7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    zIndex: 100,
    transform: [{ translateX: -60 }],
  },
  scrollToTopText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  logEntry: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: 0,
  },
  logEntryRTL: {
    flexDirection: 'row-reverse',
  },
  levelIndicator: {
    width: 3,
    marginRight: 8,
    borderRadius: borderRadius.sm,
  },
  logContent: {
    flex: 1,
    minWidth: 0,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  timestamp: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'monospace',
    marginRight: 8,
  },
  timestampRTL: {
    textAlign: 'right',
  },
  levelBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    marginRight: 8,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  source: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    marginRight: 8,
  },
  sourceRTL: {
    textAlign: 'right',
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    maxWidth: 200,
  },
  itemName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a855f7',
    fontFamily: 'monospace',
    marginLeft: 4,
  },
  message: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  messageRTL: {
    textAlign: 'right',
  },
  metadataContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: borderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: '#a855f7',
  },
  metadataTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a855f7',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  metadataContent: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  groupContainer: {
    marginBottom: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    overflow: 'hidden',
  },
  groupHeader: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupHeaderContentRTL: {
    flexDirection: 'row-reverse',
  },
  groupTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    maxWidth: 300,
    marginLeft: 8,
  },
  groupTitleText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginLeft: 4,
  },
  groupTitleEmpty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  groupInfoText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'monospace',
    marginLeft: 16,
  },
  groupStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginLeft: 4,
  },
  groupLogs: {
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 8,
  },
});
