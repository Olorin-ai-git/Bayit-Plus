/**
 * ConversationScreenMobile - Full DM thread with inverted message list and input bar.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { messagingService } from '@bayit/shared-services/api';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { spacing } from '@olorin/design-tokens';
import { logger } from '../utils/logger';
import Colors from '../theme/colors';
import { MessageBubble } from '../components/social/MessageBubble';
import { MessageInputBar } from '../components/social/MessageInputBar';
import { OnlineStatusBadge } from '../components/social/OnlineStatusBadge';
import { useAuthStore } from '@bayit/shared-stores';

const log = logger.scope('ConversationScreen');
const POLL_INTERVAL_MS = 5000;

type RouteParams = {
  Conversation: {
    conversationId?: string;
    recipientId?: string;
    recipientName?: string;
  };
};

interface MessageItem {
  id: string; text: string; senderId: string; timestamp: string; isRead: boolean;
}

interface RecipientInfo { id: string; name: string; status: 'online' | 'offline' | 'away'; }

export const ConversationScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'Conversation'>>();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { conversationId, recipientId, recipientName } = route.params || {};

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [recipient, setRecipient] = useState<RecipientInfo>({
    id: recipientId || '', name: recipientName || t('directMessages.unknownUser'),
    status: 'offline',
  });
  const listRef = useRef<FlatList<MessageItem>>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const loadMessages = useCallback(async () => {
    if (!activeConvId) { setIsLoading(false); return; }
    try {
      const res = await messagingService.getMessages(activeConvId) as {
        messages: MessageItem[]; recipient: RecipientInfo;
      };
      setMessages(res.messages || []);
      if (res.recipient) setRecipient(res.recipient);
    } catch (err) {
      log.error('Failed to load messages', err);
    } finally { setIsLoading(false); }
  }, [activeConvId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (!activeConvId) return;
    pollRef.current = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    if (recipientName) navigation.setOptions({ title: recipientName });
  }, [navigation, recipientName]);

  const handleSend = useCallback(async (text: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
      if (activeConvId) {
        const sent = await messagingService.sendMessage(activeConvId, text) as {
          message: MessageItem;
        };
        setMessages((prev) => [...prev, sent.message]);
      } else if (recipientId) {
        const res = await messagingService.startConversation(recipientId, text) as {
          conversationId: string; message: MessageItem;
        };
        setActiveConvId(res.conversationId);
        setMessages([res.message]);
        log.info('New conversation started', { conversationId: res.conversationId });
      }
    } catch (err) {
      log.error('Failed to send message', err);
    } finally { setIsSending(false); }
  }, [activeConvId, recipientId, isSending]);

  const sorted = useMemo(() =>
    [...messages].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages]);

  const renderItem = useCallback(({ item }: { item: MessageItem }) => (
    <MessageBubble message={item} isMine={item.senderId === currentUserId} />
  ), [currentUserId]);

  const keyExtractor = useCallback((item: MessageItem) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}><GlassLoadingSpinner size="large" /></View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.headerBar} accessible accessibilityRole="header"
        accessibilityLabel={`${recipient.name}, ${recipient.status}`}>
        <Text style={styles.headerName} numberOfLines={1}>{recipient.name}</Text>
        <OnlineStatusBadge status={recipient.status} size="md" />
      </View>
      <FlatList ref={listRef} data={sorted} renderItem={renderItem}
        keyExtractor={keyExtractor} style={styles.messageList}
        contentContainerStyle={styles.messageContent} showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('directMessages.startConversation')}</Text>
          </View>
        }
      />
      <MessageInputBar onSend={handleSend} disabled={isSending} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.Background.primary,
  },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.Glass.border,
    backgroundColor: Colors.Glass.whiteSubtle,
  },
  headerName: { fontSize: 18, fontWeight: '600', color: Colors.Text.primary, flex: 1 },
  messageList: { flex: 1 },
  messageContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexGrow: 1 },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl,
  },
  emptyText: { fontSize: 15, color: Colors.Text.muted, textAlign: 'center' },
});
