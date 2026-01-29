/**
 * Command History Item Component
 * Individual command display in history list
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { VoiceCommand, getCommandTypeColor } from '@bayit/shared/utils/voiceCommandUtils';

interface CommandHistoryItemProps {
  command: VoiceCommand;
  isSelected?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
}

export const CommandHistoryItem: React.FC<CommandHistoryItemProps> = ({
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
          <Text
            className="text-sm font-bold text-white"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            {statusIcon}
          </Text>
        </View>

        {/* Command Details */}
        <View className="flex-1">
          <Text
            className="text-xs font-semibold text-slate-100 mb-1.5"
            numberOfLines={1}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            {command.transcription}
          </Text>

          <View className="flex-row items-center gap-2 mb-1">
            <View
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: commandTypeColor }}
            >
              <Text
                className="text-xs font-semibold text-white capitalize"
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
              >
                {command.commandType}
              </Text>
            </View>

            <Text
              className="text-xs text-slate-400"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              {formatDistanceToNow(command.timestamp, { addSuffix: true })}
            </Text>

            <Text
              className="text-xs text-slate-600"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              {command.executionTime}ms
            </Text>
          </View>

          {command.responseText && (
            <Text
              className="text-xs text-slate-300 mt-1"
              numberOfLines={1}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
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
          <Text
            className="text-xl text-slate-600 font-light"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            ×
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default CommandHistoryItem;
