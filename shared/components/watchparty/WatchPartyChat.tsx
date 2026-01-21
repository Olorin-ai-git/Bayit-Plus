import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  message_type: string;
  created_at: string;
}

interface WatchPartyChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  maxHeight?: number;
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
};

const ChatMessage: React.FC<{
  message: ChatMessage;
  isOwnMessage: boolean;
}> = ({ message, isOwnMessage }) => {
  const isEmoji = message.message_type === 'emoji';
  const isSystem = message.message_type === 'system';

  if (isSystem) {
    return (
      <View className="items-center my-1">
        <Text className="text-xs text-white/50 bg-white/20 py-1 px-3 rounded-full">{message.content}</Text>
      </View>
    );
  }

  return (
    <View className={`mb-1 flex-row ${isOwnMessage ? 'justify-start' : 'justify-end'}`}>
      <GlassView
        className={`max-w-[80%] py-3 px-4 rounded-lg ${isEmoji ? 'bg-transparent py-1' : ''} ${isOwnMessage ? 'bg-purple-500/30' : ''}`}
        intensity="low"
        noBorder={isEmoji}
      >
        {!isOwnMessage && !isEmoji && (
          <Text className="text-xs font-medium text-purple-500 mb-0.5">{message.user_name}</Text>
        )}
        <Text className={isEmoji ? "text-[28px] leading-9" : "text-sm text-white leading-5"}>
          {message.content}
        </Text>
        {!isEmoji && (
          <Text className="text-[10px] text-white/50 mt-1 self-start">{formatTime(message.created_at)}</Text>
        )}
      </GlassView>
    </View>
  );
};

export const WatchPartyChat: React.FC<WatchPartyChatProps> = ({
  messages,
  currentUserId,
  maxHeight = 300,
}) => {
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View className="gap-3">
      <Text className="text-sm font-medium text-white/70 px-1">{t('watchParty.chat')}</Text>
      <ScrollView
        ref={scrollViewRef}
        className="flex-grow-0"
        style={{ maxHeight }}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <Text className="text-center text-white/50 text-sm py-8">{t('watchParty.typeMessage')}</Text>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage
              key={msg.id || idx}
              message={msg}
              isOwnMessage={msg.user_id === currentUserId}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default WatchPartyChat;
