/**
 * FeedbackInbox - Inbox for avatar interaction feedback.
 *
 * Displays a list of feedback items with read/unread indicators,
 * mark-as-read and respond actions, plus empty state.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OlorinIcon } from '@olorin/icons/native';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const inboxLogger = logger.scope('FeedbackInbox');

interface FeedbackItem {
  id: string;
  senderName: string;
  previewText: string;
  receivedAt: string;
  isRead: boolean;
}

interface FeedbackInboxProps {
  feedbackItems: FeedbackItem[];
  onMarkRead: (feedbackId: string) => void;
  onRespond: (feedbackId: string) => void;
}

function formatReceivedAt(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return '<1h';
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}

export const FeedbackInbox: React.FC<FeedbackInboxProps> = ({
  feedbackItems,
  onMarkRead,
  onRespond,
}) => {
  const { t } = useTranslation();

  const unreadCount = feedbackItems.filter((item) => !item.isRead).length;

  const handleMarkRead = useCallback((id: string) => {
    inboxLogger.info('Feedback marked as read', { feedbackId: id });
    onMarkRead(id);
  }, [onMarkRead]);

  const handleRespond = useCallback((id: string) => {
    inboxLogger.info('Feedback respond initiated', { feedbackId: id });
    onRespond(id);
  }, [onRespond]);

  const renderItem = useCallback(({ item }: { item: FeedbackItem }) => (
    <View style={[styles.itemCard, !item.isRead && styles.unreadCard]}
      accessibilityLabel={t('zehAni.feedback.itemLabel', {
        sender: item.senderName,
        status: item.isRead
          ? t('zehAni.feedback.read') : t('zehAni.feedback.unread'),
      })}
      accessibilityRole="text">
      <View style={styles.itemHeader}>
        <View style={styles.senderRow}>
          {!item.isRead && <View style={styles.unreadDot} />}
          <Text style={[styles.senderName, !item.isRead && styles.senderNameUnread]}>
            {item.senderName}
          </Text>
        </View>
        <Text style={styles.timeText}>{formatReceivedAt(item.receivedAt)}</Text>
      </View>
      <Text style={styles.previewText} numberOfLines={2}>{item.previewText}</Text>
      <View style={styles.itemActions}>
        {!item.isRead && (
          <Pressable style={styles.actionButton}
            onPress={() => handleMarkRead(item.id)}
            accessibilityLabel={t('zehAni.feedback.markRead')}
            accessibilityHint={t('zehAni.feedback.markReadHint')}
            accessibilityRole="button">
            <OlorinIcon name="check" size={14} color={Colors.Text.muted} />
            <Text style={styles.actionText}>{t('zehAni.feedback.markRead')}</Text>
          </Pressable>
        )}
        <Pressable style={styles.actionButton}
          onPress={() => handleRespond(item.id)}
          accessibilityLabel={t('zehAni.feedback.respond')}
          accessibilityHint={t('zehAni.feedback.respondHint')}
          accessibilityRole="button">
          <OlorinIcon name="message-circle" size={14} color={Colors.Primary.p400} />
          <Text style={[styles.actionText, styles.actionTextPrimary]}>
            {t('zehAni.feedback.respond')}
          </Text>
        </Pressable>
      </View>
    </View>
  ), [handleMarkRead, handleRespond, t]);

  if (feedbackItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <OlorinIcon name="inbox" size={40} color={Colors.Text.muted} />
        <Text style={styles.emptyText} accessibilityRole="text">
          {t('zehAni.feedback.empty')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {t('zehAni.feedback.title')}
        </Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}
              accessibilityLabel={t('zehAni.feedback.unreadCount', {
                count: String(unreadCount),
              })}>
              {unreadCount}
            </Text>
          </View>
        )}
      </View>
      <FlatList data={feedbackItems} keyExtractor={(item) => item.id}
        renderItem={renderItem} contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.Text.primary },
  unreadBadge: {
    backgroundColor: Colors.Primary.default, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  unreadBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.Text.primary },
  listContent: { paddingHorizontal: 16, gap: 10, paddingBottom: 20 },
  itemCard: {
    backgroundColor: Colors.Glass.whiteSubtle, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.Glass.whiteLight,
  },
  unreadCard: { borderColor: Colors.Primary.p700 },
  itemHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.Primary.default,
  },
  senderName: { fontSize: 15, fontWeight: '500', color: Colors.Text.secondary },
  senderNameUnread: { fontWeight: '700', color: Colors.Text.primary },
  timeText: { fontSize: 12, color: Colors.Text.muted },
  previewText: {
    fontSize: 14, color: Colors.Text.secondary, lineHeight: 20, marginBottom: 10,
  },
  itemActions: { flexDirection: 'row', gap: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 13, color: Colors.Text.muted },
  actionTextPrimary: { color: Colors.Primary.p400 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, color: Colors.Text.muted, textAlign: 'center' },
});
