/**
 * PartyChat - Real-time chat panel for Watch Party sessions.
 *
 * Displays a FlatList of chat messages with sender avatar, name,
 * and message text. Includes an input row for sending messages.
 * Auto-scrolls to the newest message on arrival.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWatchPartyStore } from '@bayit/shared-stores/watchPartyStore';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import { GlassButton, GlassInput, GlassAvatar, spacing, borderRadius } from '@olorin/glass-ui/native';
import { logger } from '../../utils/logger';
import Colors from '../../theme/colors';

const log = logger.scope('PartyChat');
const SCROLL_DELAY_MS = 120;

interface PartyChatProps {
  chatInput: string;
  onChatInputChange: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

interface ChatMessage {
  id: string; user_id: string; user_name: string;
  message: string; message_type: string; timestamp: string;
}

function formatTime(ts: string): string {
  try { return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

const MessageItem = React.memo(({ item, isOwn }: { item: ChatMessage; isOwn: boolean }) => {
  if (item.message_type === 'system') {
    return <View style={styles.systemRow}><Text style={styles.systemText}>{item.message}</Text></View>;
  }
  return (
    <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
      {!isOwn && <GlassAvatar name={item.user_name} size="xs" />}
      <View style={styles.msgContent}>
        {!isOwn && <Text style={styles.sender}>{item.user_name}</Text>}
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text style={styles.msgText}>{item.message}</Text>
        </View>
        <Text style={[styles.time, isOwn && styles.timeOwn]}>{formatTime(item.timestamp)}</Text>
      </View>
    </View>
  );
});
MessageItem.displayName = 'MessageItem';

export const PartyChat: React.FC<PartyChatProps> = ({
  chatInput, onChatInputChange, onSend, disabled = false,
}) => {
  const { t } = useTranslation();
  const messages = useWatchPartyStore((s) => s.messages);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), SCROLL_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ChatMessage>) => (
    <MessageItem item={item} isOwn={item.user_id === currentUserId} />
  ), [currentUserId]);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const handleSend = useCallback(() => {
    if (!chatInput.trim()) return;
    onSend(); log.info('Chat message sent');
  }, [chatInput, onSend]);

  return (
    <View style={styles.container}>
      <FlatList ref={listRef} data={messages} renderItem={renderItem}
        keyExtractor={keyExtractor} style={styles.list}
        contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>{t('watchParty.chat.empty')}</Text></View>
        }
      />
      <View style={styles.inputRow}>
        <GlassInput placeholder={t('watchParty.typeMessage')} value={chatInput}
          onChangeText={onChatInputChange} onSubmitEditing={handleSend}
          returnKeyType="send" editable={!disabled} style={styles.inputField} />
        <GlassButton variant="primary" size="small" onPress={handleSend}
          disabled={!chatInput.trim() || disabled}>{t('watchParty.send')}</GlassButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, gap: spacing.xs },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: 14, color: Colors.Text.muted },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginBottom: spacing.xs },
  msgRowOwn: { flexDirection: 'row-reverse' },
  msgContent: { maxWidth: '75%' },
  sender: { fontSize: 11, color: Colors.Text.muted, marginBottom: 2, marginLeft: spacing.xs },
  bubble: { padding: spacing.sm, borderRadius: borderRadius.md },
  bubbleOwn: { backgroundColor: Colors.Primary.p700 },
  bubbleOther: { backgroundColor: Colors.Glass.bgMedium },
  msgText: { fontSize: 14, color: Colors.Text.primary, lineHeight: 20 },
  time: { fontSize: 10, color: Colors.Text.disabled, marginTop: 2, marginLeft: spacing.xs },
  timeOwn: { textAlign: 'right', marginRight: spacing.xs, marginLeft: 0 },
  systemRow: { alignItems: 'center', paddingVertical: spacing.xs },
  systemText: { fontSize: 12, color: Colors.Text.muted, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, alignItems: 'center' },
  inputField: { flex: 1 },
});

export default PartyChat;
