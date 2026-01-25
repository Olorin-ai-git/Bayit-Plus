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
  SafeAreaView,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@olorin/glass-ui/hooks';

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
  const notifications = useNotifications();

  const handleCommandPress = useCallback(
    (command: VoiceCommand) => {
      setSelectedCommandId(command.id);
      onCommandSelect?.(command);
    },
    [onCommandSelect]
  );

  const handleDeleteCommand = useCallback(
    (commandId: string) => {
      notifications.show({
        level: 'warning',
        message: 'Remove this command from history?',
        title: 'Delete Command',
        dismissable: true,
        action: {
          label: 'Delete',
          type: 'action',
          onPress: () => {
            onCommandDelete?.(commandId);
          },
        },
      });
    },
    [onCommandDelete, notifications]
  );

  const sortedCommands = [...commands]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxItems);

  const groupedCommands = groupCommandsByDate(sortedCommands);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-1 justify-center items-center">
          <Text className="text-sm text-slate-400">Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sortedCommands.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-slate-800">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-sm text-blue-600 font-medium">✕ Close</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white">Command History</Text>
          <View className="w-12" />
        </View>
        <View className="flex-1 justify-center items-center">
          <Text className="text-5xl mb-3">🎤</Text>
          <Text className="text-lg font-semibold text-slate-100 mb-2">No Commands Yet</Text>
          <Text className="text-sm text-slate-400">
            Voice commands will appear here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-slate-800">
        <TouchableOpacity onPress={onClose}>
          <Text className="text-sm text-blue-600 font-medium">✕ Close</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-white">Command History</Text>
        <Text className="text-sm text-slate-400 font-medium">{sortedCommands.length}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 12 }}
      >
        {Object.entries(groupedCommands).map(([date, commandList]) => (
          <View key={date}>
            <View className="px-4 py-3 flex-row items-center gap-3">
              <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {date}
              </Text>
              <View className="flex-1 h-px bg-slate-700" />
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
      className={`mx-3 my-1.5 bg-slate-800 rounded-lg px-3 py-3 border ${
        isSelected ? 'bg-slate-700/50 border-blue-600' : 'border-slate-700'
      }`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start gap-3">
        {/* Status Badge */}
        <View
          className="w-7 h-7 rounded-full justify-center items-center mt-0.5"
          style={{ backgroundColor: statusColor }}
        >
          <Text className="text-sm font-bold text-white">{statusIcon}</Text>
        </View>

        {/* Command Details */}
        <View className="flex-1">
          <Text className="text-xs font-semibold text-slate-100 mb-1.5" numberOfLines={1}>
            {command.transcription}
          </Text>

          <View className="flex-row items-center gap-2 mb-1">
            <View
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: commandTypeColor }}
            >
              <Text className="text-xs font-semibold text-white capitalize">
                {command.commandType}
              </Text>
            </View>

            <Text className="text-xs text-slate-400">
              {formatDistanceToNow(command.timestamp, { addSuffix: true })}
            </Text>

            <Text className="text-xs text-slate-600">
              {command.executionTime}ms
            </Text>
          </View>

          {command.responseText && (
            <Text className="text-xs text-slate-300 mt-1" numberOfLines={1}>
              {command.responseText}
            </Text>
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          className="w-7 h-7 justify-center items-center rounded"
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xl text-slate-600 font-light">×</Text>
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
