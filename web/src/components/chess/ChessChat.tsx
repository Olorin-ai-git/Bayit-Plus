/**
 * Chess chat component with AI bot integration and voice support.
 * Allows players to communicate and request chess advice from AI.
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { Send, Mic, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLiveKitRoom } from '../../hooks/useLiveKitRoom';
import { GlassInput } from '@bayit/shared/ui';

interface ChessChatMessage {
  user_id: string;
  user_name: string;
  message: string;
  is_bot_request: boolean;
  bot_response?: string;
  timestamp: string;
}

interface ChessChatProps {
  gameCode: string;
  messages: ChessChatMessage[];
  onSendMessage: (message: string) => void;
  voiceEnabled?: boolean;
}

export default function ChessChat({
  gameCode,
  messages,
  onSendMessage,
  voiceEnabled = true
}: ChessChatProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // LiveKit voice integration (optional)
  const {
    isConnected: voiceConnected,
    isMuted,
    toggleMute,
    participants,
  } = useLiveKitRoom({
    roomName: `chess-${gameCode}`,
    enabled: voiceEnabled,
  }) as any; // Type assertion for compatibility

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (trimmed) {
      onSendMessage(trimmed);
      setInputText('');
    }
  };

  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('chess.title')}</Text>

        {/* Voice controls */}
        {voiceEnabled && (
          <View style={styles.voiceControls}>
            <Pressable
              style={[styles.voiceButton, isMuted && styles.voiceButtonMuted]}
              onPress={toggleMute}
            >
              {isMuted ? (
                <MicOff size={16} color={colors.text} />
              ) : (
                <Mic size={16} color={colors.success} />
              )}
            </Pressable>

            {voiceConnected && participants.length > 0 && (
              <Text style={styles.participantCount}>
                {participants.length} {t('chess.speaking')}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((msg, idx) => (
          <View key={idx} style={styles.messageContainer}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageAuthor}>{msg.user_name}</Text>
              <Text style={styles.messageTime}>{formatTime(msg.timestamp)}</Text>
            </View>

            <Text style={styles.messageText}>{msg.message}</Text>

            {/* Bot response */}
            {msg.bot_response && (
              <View style={styles.botResponse}>
                <View style={styles.botHeader}>
                  <Text style={styles.botIcon}>🤖</Text>
                  <Text style={styles.botLabel}>{t('chess.bot')}</Text>
                </View>
                <Text style={styles.botText}>{msg.bot_response}</Text>
              </View>
            )}
          </View>
        ))}

        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('chess.noMoves')}</Text>
            <Text style={styles.emptyHint}>{t('chess.botHint')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <GlassInput
          value={inputText}
          onChangeText={setInputText}
          onKeyPress={handleKeyPress}
          placeholder={t('chess.chatPlaceholder')}
          inputStyle={styles.input}
          multiline
          maxLength={500}
          containerStyle={styles.inputWrapper}
        />

        <Pressable
          onPress={handleSend}
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          disabled={!inputText.trim()}
        >
          <Send size={20} color={inputText.trim() ? colors.primary : colors.textSecondary} />
        </Pressable>
      </View>

      {/* Hint text */}
      <Text style={styles.hint}>
        {t('chess.botHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 20, 0.3)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    padding: spacing.md,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  voiceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  voiceButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
  },
  voiceButtonMuted: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
  },
  participantCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  messages: {
    flex: 1,
    marginBottom: spacing.md,
  },
  messagesContent: {
    paddingBottom: spacing.sm,
  },
  messageContainer: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  messageAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  messageTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  botResponse: {
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    paddingVertical: spacing.sm,
  },
  botHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  botIcon: {
    fontSize: 16,
  },
  botLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  botText: {
    fontSize: 13,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  hint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
