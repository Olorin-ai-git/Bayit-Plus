/**
 * Voice Command History Component
 *
 * Shows history of executed voice commands with:
 * - Recent commands list
 * - Command details and results
 * - One-tap command re-execution
 * - Command deletion
 * - Grouped by date
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';

export interface VoiceCommand {
  id: string;
  transcription: string;
  commandType: string;
  action: string;
  responseText: string;
  success: boolean;
  confidence: number;
  timestamp: Date;
  executionTime: number; // ms
}

interface VoiceCommandHistoryProps {
  commands: VoiceCommand[];
  onCommandSelect?: (command: VoiceCommand) => void;
  onCommandDelete?: (commandId: string) => void;
  onClose?: () => void;
  isLoading?: boolean;
  maxItems?: number;
}

export const VoiceCommandHistory: React.FC<VoiceCommandHistoryProps> = ({
  commands,
  onCommandSelect,
  onCommandDelete,
  onClose,
  isLoading = false,
  maxItems = 50,
}) => {
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);

  const handleCommandPress = useCallback(
    (command: VoiceCommand) => {
      setSelectedCommandId(command.id);
      onCommandSelect?.(command);
    },
    [onCommandSelect]
  );

  const handleDeleteCommand = useCallback(
    (commandId: string) => {
      Alert.alert(
        'Delete Command',
        'Remove this command from history?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              onCommandDelete?.(commandId);
            },
          },
        ]
      );
    },
    [onCommandDelete]
  );

  const sortedCommands = [...commands]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxItems);

  const groupedCommands = groupCommandsByDate(sortedCommands);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sortedCommands.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Command History</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎤</Text>
          <Text style={styles.emptyTitle}>No Commands Yet</Text>
          <Text style={styles.emptyText}>
            Voice commands will appear here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Command History</Text>
        <Text style={styles.commandCount}>{sortedCommands.length}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {Object.entries(groupedCommands).map(([date, commandList]) => (
          <View key={date}>
            <View style={styles.dateSection}>
              <Text style={styles.dateText}>{date}</Text>
              <View style={styles.dateSeparator} />
            </View>

            {commandList.map((command) => (
              <CommandHistoryItem
                key={command.id}
                command={command}
                isSelected={selectedCommandId === command.id}
                onPress={() => handleCommandPress(command)}
                onDelete={() => handleDeleteCommand(command.id)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// Helper Components
// ============================================

interface CommandHistoryItemProps {
  command: VoiceCommand;
  isSelected?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
}

const CommandHistoryItem: React.FC<CommandHistoryItemProps> = ({
  command,
  isSelected,
  onPress,
  onDelete,
}) => {
  const commandTypeColor = getCommandTypeColor(command.commandType);
  const statusIcon = command.success ? '✓' : '✗';
  const statusColor = command.success ? '#10B981' : '#EF4444';

  return (
    <TouchableOpacity
      style={[
        styles.commandItem,
        isSelected && styles.commandItemSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.commandContent}>
        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor },
          ]}
        >
          <Text style={styles.statusIcon}>{statusIcon}</Text>
        </View>

        {/* Command Details */}
        <View style={styles.commandDetails}>
          <Text style={styles.transcriptionText} numberOfLines={1}>
            {command.transcription}
          </Text>

          <View style={styles.commandMetaRow}>
            <View
              style={[
                styles.typeTag,
                { backgroundColor: commandTypeColor },
              ]}
            >
              <Text style={styles.typeTagText}>
                {command.commandType}
              </Text>
            </View>

            <Text style={styles.timeText}>
              {formatDistanceToNow(command.timestamp, { addSuffix: true })}
            </Text>

            <Text style={styles.executionTimeText}>
              {command.executionTime}ms
            </Text>
          </View>

          {command.responseText && (
            <Text style={styles.responseText} numberOfLines={1}>
              {command.responseText}
            </Text>
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// Helper Functions
// ============================================

const getCommandTypeColor = (commandType: string): string => {
  const colors: Record<string, string> = {
    search: '#3B82F6',    // Blue
    play: '#10B981',      // Green
    control: '#F59E0B',   // Amber
    navigate: '#8B5CF6',  // Purple
    settings: '#6B7280',  // Gray
  };
  return colors[commandType] || '#6B7280';
};

const groupCommandsByDate = (commands: VoiceCommand[]): Record<string, VoiceCommand[]> => {
  const grouped: Record<string, VoiceCommand[]> = {};

  commands.forEach((command) => {
    const date = new Date(command.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;

    if (isSameDay(date, today)) {
      dateKey = 'Today';
    } else if (isSameDay(date, yesterday)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(command);
  });

  return grouped;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  commandCount: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  dateSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateSeparator: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  commandItem: {
    marginHorizontal: 12,
    marginVertical: 6,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  commandItemSelected: {
    backgroundColor: '#1E3A5F',
    borderColor: '#3B82F6',
  },
  commandContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  statusIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  commandDetails: {
    flex: 1,
  },
  transcriptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 6,
  },
  commandMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  executionTimeText: {
    fontSize: 11,
    color: '#64748B',
  },
  responseText: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 4,
  },
  deleteButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  deleteButtonText: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '300',
  },
});
