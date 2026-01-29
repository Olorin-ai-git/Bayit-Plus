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
  SafeAreaView,
} from 'react-native';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { VoiceCommand, groupCommandsByDate } from '@bayit/shared/utils/voiceCommandUtils';
import { CommandHistoryItem } from './CommandHistoryItem';

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
          <Text
            className="text-sm text-slate-400"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            Loading history...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sortedCommands.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-slate-800">
          <TouchableOpacity onPress={onClose} style={{ minWidth: 44, minHeight: 44 }} className="justify-center">
            <Text
              className="text-sm text-blue-600 font-medium"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              ✕ Close
            </Text>
          </TouchableOpacity>
          <Text
            className="text-lg font-semibold text-white"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            Command History
          </Text>
          <View className="w-12" />
        </View>
        <View className="flex-1 justify-center items-center">
          <Text
            className="text-5xl mb-3"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            🎤
          </Text>
          <Text
            className="text-lg font-semibold text-slate-100 mb-2"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            No Commands Yet
          </Text>
          <Text
            className="text-sm text-slate-400"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
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
          <Text
            className="text-sm text-blue-600 font-medium"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            ✕ Close
          </Text>
        </TouchableOpacity>
        <Text
          className="text-lg font-semibold text-white"
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          Command History
        </Text>
        <Text
          className="text-sm text-slate-400 font-medium"
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          {sortedCommands.length}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 12 }}
      >
        {Object.entries(groupedCommands).map(([date, commandList]) => (
          <View key={date}>
            <View className="px-4 py-3 flex-row items-center gap-3">
              <Text
                className="text-xs font-semibold text-slate-400 uppercase tracking-wide"
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
              >
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

export default VoiceCommandHistory;
