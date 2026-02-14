/**
 * DirectMessagesScreenMobile - DM inbox with conversation list, search, and new message FAB.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { messagingService } from '@bayit/shared-services/api';
import { GlassInput } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { spacing } from '@olorin/design-tokens';
import { logger } from '../utils/logger';
import Colors from '../theme/colors';
import { UserAvatarRow } from '../components/social/UserAvatarRow';

const log = logger.scope('DirectMessagesScreen');

interface Conversation {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string | null;
  recipientStatus: 'online' | 'offline' | 'away';
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export const DirectMessagesScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = useCallback(async () => {
    try {
      const response = await messagingService.getConversations() as {
        conversations: Conversation[];
      };
      setConversations(response.conversations || []);
    } catch (err) {
      log.error('Failed to load conversations', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadConversations();
  }, [loadConversations]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.recipientName.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const handleConversationPress = useCallback(
    (user: { id: string; name: string }) => {
      const conv = conversations.find((c) => c.recipientId === user.id);
      navigation.navigate('Conversation' as never, {
        conversationId: conv?.id, recipientId: user.id, recipientName: user.name,
      } as never);
    }, [conversations, navigation]);

  const handleNewConversation = useCallback(() => {
    navigation.navigate('Conversation' as never);
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Conversation }) => (
    <UserAvatarRow
      user={{
        id: item.recipientId, name: item.recipientName,
        avatar: item.recipientAvatar, status: item.recipientStatus,
      }}
      lastMessage={item.lastMessage}
      timestamp={item.lastMessageAt}
      unreadCount={item.unreadCount}
      onPress={handleConversationPress}
    />
  ), [handleConversationPress]);

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <GlassLoadingSpinner size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('directMessages.title')}</Text>
        <GlassInput
          placeholder={t('directMessages.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessible
          accessibilityRole="search"
          accessibilityLabel={t('directMessages.searchLabel')}
          accessibilityHint={t('directMessages.searchHint')}
        />
      </View>
      <FlatList
        data={filteredConversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh}
            tintColor={Colors.Primary.p500} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{t('directMessages.emptyTitle')}</Text>
            <Text style={styles.emptyMessage}>{t('directMessages.emptyMessage')}</Text>
          </View>
        }
      />
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={handleNewConversation}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t('directMessages.newConversation')}
        accessibilityHint={t('directMessages.newConversationHint')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
};

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.Background.primary,
  },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
    paddingBottom: spacing.md, backgroundColor: Colors.Glass.whiteSubtle,
  },
  title: {
    fontSize: 28, fontWeight: 'bold', color: Colors.Text.primary, marginBottom: spacing.md,
  },
  list: { flex: 1 },
  emptyContainer: {
    justifyContent: 'center', alignItems: 'center',
    paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18, fontWeight: '600', color: Colors.Text.primary,
    marginBottom: spacing.sm, textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14, color: Colors.Text.secondary, textAlign: 'center', lineHeight: 20,
  },
  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.xl,
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.Primary.p700, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: Colors.Primary.p900,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6,
  },
  fabPressed: { backgroundColor: Colors.Primary.p600 },
  fabIcon: { fontSize: 28, fontWeight: '300', color: Colors.Text.primary, lineHeight: 30 },
});
