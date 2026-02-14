/**
 * ChannelChat - Live viewer chat for channels
 *
 * FlatList of real-time messages with WebSocket connectivity,
 * input bar at bottom, auto-scroll to latest messages.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import { GlassButton, GlassInput, GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { channelChatService } from '@bayit/shared-services/api';
import { Colors } from '../../theme/colors';
import { BottomSheet } from '../BottomSheet';
import logger from '@/utils/logger';

const log = logger.scope('ChannelChat');
const SCROLL_DELAY_MS = 100;

interface ChatMessage {
  id: string; userId: string; userName: string;
  message: string; timestamp: string; isSystem: boolean;
}

interface ChannelChatProps { channelId: string; visible: boolean; onClose: () => void; }

const formatTime = (ts: string): string => {
  try { return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const MessageItem = React.memo(({ item, isOwn }: { item: ChatMessage; isOwn: boolean }) => {
  if (item.isSystem) {
    return <View style={styles.systemRow}><Text style={styles.systemText}>{item.message}</Text></View>;
  }
  return (
    <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}
      accessible accessibilityRole="text"
      accessibilityLabel={`${item.userName}: ${item.message}`}>
      <View style={styles.msgContent}>
        {!isOwn && <Text style={styles.sender}>{item.userName}</Text>}
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text style={styles.msgText}>{item.message}</Text>
        </View>
        <Text style={[styles.time, isOwn && styles.timeOwn]}>{formatTime(item.timestamp)}</Text>
      </View>
    </View>
  );
});
MessageItem.displayName = 'MessageItem';

export const ChannelChat: React.FC<ChannelChatProps> = ({ channelId, visible, onClose }) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const wsRef = useRef<ReturnType<typeof channelChatService.connect> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setIsConnecting(true);
    log.info('Connecting to channel chat', { channelId });
    const connection = channelChatService.connect(channelId, {
      onMessage: (msg: ChatMessage) => setMessages((prev) => [...prev, msg]),
      onConnected: () => { setIsConnecting(false); log.info('Channel chat connected', { channelId }); },
      onError: (err: Error) => { log.error('Channel chat error', { channelId, error: err.message }); setIsConnecting(false); },
    });
    wsRef.current = connection;
    return () => { connection.disconnect(); wsRef.current = null; setMessages([]); };
  }, [visible, channelId]);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), SCROLL_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || !wsRef.current) return;
    log.info('Sending channel chat message');
    wsRef.current.send(trimmed);
    setInputText('');
  }, [inputText]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ChatMessage>) => (
    <MessageItem item={item} isOwn={item.userId === currentUserId} />
  ), [currentUserId]);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <BottomSheet visible={visible} onClose={onClose} height={420} showHandle>
      <Text style={[styles.title, { textAlign }]}>{t('channelChat.title')}</Text>
      {isConnecting ? (
        <View style={styles.centered}>
          <GlassLoadingSpinner size="medium" />
          <Text style={styles.connectingText}>{t('channelChat.connecting')}</Text>
        </View>
      ) : (
        <>
          <FlatList ref={listRef} data={messages} renderItem={renderItem}
            keyExtractor={keyExtractor} style={styles.list}
            contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <NativeIcon name="messageSquare" size="lg" color={Colors.Text.muted} />
                <Text style={styles.emptyText}>{t('channelChat.noMessages')}</Text>
              </View>
            } />
          <View style={styles.inputRow}>
            <GlassInput placeholder={t('channelChat.typeMessage')} value={inputText}
              onChangeText={setInputText} onSubmitEditing={handleSend}
              returnKeyType="send" style={styles.inputField}
              accessibilityLabel={t('channelChat.messageInput')}
              accessibilityHint={t('channelChat.messageInputHint')} />
            <GlassButton variant="primary" size="small" onPress={handleSend}
              disabled={!inputText.trim()} accessibilityLabel={t('channelChat.send')}
              accessibilityRole="button">
              <NativeIcon name="send" size="sm" color={Colors.white} />
            </GlassButton>
          </View>
        </>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  list: { flex: 1 },
  listContent: { gap: spacing.xs, paddingVertical: spacing.sm },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  connectingText: { fontSize: fontSize.sm, color: colors.textSecondary },
  emptyText: { fontSize: fontSize.sm, color: Colors.Text.muted },
  msgRow: { flexDirection: 'row', marginBottom: spacing.xs },
  msgRowOwn: { flexDirection: 'row-reverse' },
  msgContent: { maxWidth: '78%' },
  sender: { fontSize: 11, color: Colors.Text.muted, marginBottom: 2, marginLeft: spacing.xs },
  bubble: { padding: spacing.sm, borderRadius: borderRadius.md },
  bubbleOwn: { backgroundColor: Colors.Primary.p700 },
  bubbleOther: { backgroundColor: Colors.Glass.bgMedium },
  msgText: { fontSize: 14, color: Colors.Text.primary, lineHeight: 20 },
  time: { fontSize: 10, color: Colors.Text.disabled, marginTop: 2, marginLeft: spacing.xs },
  timeOwn: { textAlign: 'right', marginRight: spacing.xs, marginLeft: 0 },
  systemRow: { alignItems: 'center', paddingVertical: spacing.xs },
  systemText: { fontSize: 12, color: Colors.Text.muted, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm, alignItems: 'center' },
  inputField: { flex: 1 },
});
