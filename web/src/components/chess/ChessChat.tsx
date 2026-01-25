/**
 * Chess chat component with AI bot integration and voice support.
 * Allows players to communicate and request chess advice from AI.
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Platform, StyleSheet } from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';
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
    <View className="flex-1 bg-black/30 backdrop-blur-xl rounded-2xl p-4 shadow-lg">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-white/10">
        <Text className="text-lg font-semibold text-white">{t('chess.title')}</Text>

        {/* Voice controls */}
        {voiceEnabled && (
          <View className="flex-row items-center gap-3">
            <Pressable
              className="p-3 rounded-lg"
              style={[isMuted ? styles.micMuted : styles.micActive]}
              onPress={toggleMute}
            >
              {isMuted ? (
                <MicOff size={16} color={colors.text} />
              ) : (
                <Mic size={16} color={colors.success} />
              )}
            </Pressable>

            {voiceConnected && participants.length > 0 && (
              <Text className="text-xs text-gray-400">
                {participants.length} {t('chess.speaking')}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 mb-4"
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {messages.map((msg, idx) => (
          <View key={idx} className="mb-4 p-3 bg-white/5 rounded-lg">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-purple-500">{msg.user_name}</Text>
              <Text className="text-xs text-gray-400">{formatTime(msg.timestamp)}</Text>
            </View>

            <Text className="text-sm text-white leading-5">{msg.message}</Text>

            {/* Bot response */}
            {msg.bot_response && (
              <View className="mt-3 pl-4 border-l-[3px] border-green-500 py-2">
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="text-base">🤖</Text>
                  <Text className="text-xs font-semibold text-green-500">{t('chess.bot')}</Text>
                </View>
                <Text className="text-sm text-white italic leading-[18px]">{msg.bot_response}</Text>
              </View>
            )}
          </View>
        ))}

        {messages.length === 0 && (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-sm text-gray-400 mb-3">{t('chess.noMoves')}</Text>
            <Text className="text-xs text-gray-400 text-center">{t('chess.botHint')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View className="flex-row items-end gap-3 pt-3 border-t border-white/10">
        <View className="flex-1">
          <GlassInput
            value={inputText}
            onChangeText={setInputText}
            onKeyPress={handleKeyPress}
            placeholder={t('chess.chatPlaceholder')}
            inputStyle={{ fontSize: 14, maxHeight: 100 }}
            multiline
            maxLength={500}
          />
        </View>

        <Pressable
          onPress={handleSend}
          className="p-3 rounded-lg bg-purple-500/20 justify-center items-center"
          style={[!inputText.trim() && styles.disabled]}
          disabled={!inputText.trim()}
        >
          <Send size={20} color={inputText.trim() ? colors.primary : colors.textSecondary} />
        </Pressable>
      </View>

      {/* Hint text */}
      <Text className="text-[11px] text-gray-400 mt-2 text-center italic">
        {t('chess.botHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  micMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  micActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  disabled: {
    opacity: 0.5,
  },
});
