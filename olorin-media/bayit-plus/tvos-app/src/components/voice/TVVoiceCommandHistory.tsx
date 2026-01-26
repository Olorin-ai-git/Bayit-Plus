/**
 * TV Voice Command History Component
 * Displays last 5 voice commands with focus navigation
 * Shows command text and success/failure status
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useVoiceStore } from '../../stores/voiceStore';
import { useTranslation } from 'react-i18next';

interface TVVoiceCommandHistoryProps {
  maxItems?: number;
  onSelectCommand?: (command: string) => void;
  compact?: boolean;
}

export const TVVoiceCommandHistory: React.FC<TVVoiceCommandHistoryProps> = ({
  maxItems = 5,
  onSelectCommand,
  compact = false,
}) => {
  const { t } = useTranslation();
  const { getLastNCommands } = useVoiceStore();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const commands = getLastNCommands(maxItems);

  if (commands.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {t('voice.no_history', 'No voice commands yet')}
        </Text>
      </View>
    );
  }

  const renderItem = ({ item, index }: any) => {
    const isFocused = focusedIndex === index;
    const statusIcon = item.success ? '✓' : '❌';
    const statusColor = item.success ? '#10B981' : '#EF4444';

    return (
      <Pressable
        onPress={() => onSelectCommand?.(item.command)}
        onFocus={() => setFocusedIndex(index)}
        onBlur={() => setFocusedIndex(null)}
        accessible
        accessibilityLabel={`${t('voice.command', 'Command')}: ${item.command}`}
        accessibilityHint={item.success ? t('voice.success', 'Successful') : t('voice.failed', 'Failed')}
      >
        <View
          style={[
            styles.commandItem,
            {
              backgroundColor: isFocused ? 'rgba(168, 85, 247, 0.3)' : 'rgba(0, 0, 0, 0.2)',
              borderColor: isFocused ? '#A855F7' : 'transparent',
              transform: [{ scale: isFocused ? 1.05 : 1 }],
            },
          ]}
        >
          <View style={styles.commandContent}>
            <Text style={styles.commandText} numberOfLines={1}>
              {item.command}
            </Text>
            <Text style={styles.commandTime}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>

          <Text
            style={[
              styles.statusIcon,
              {
                color: statusColor,
              },
            ]}
          >
            {statusIcon}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('voice.command_history', 'Recent Commands')}
      </Text>

      <FlatList
        data={commands}
        renderItem={renderItem}
        keyExtractor={(_, index) => `command-${index}`}
        scrollEnabled={!compact}
        nestedScrollEnabled={!compact}
        style={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  listContainer: {
    maxHeight: 400,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 4,
    minHeight: 80,
  },
  commandContent: {
    flex: 1,
  },
  commandText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  commandTime: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  statusIcon: {
    fontSize: 32,
    marginLeft: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 24,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

export default TVVoiceCommandHistory;
