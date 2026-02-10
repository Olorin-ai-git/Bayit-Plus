import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './EmptyState';
import { FriendCard } from './FriendCard';
import type { FriendRequest } from '../../../stores/friendsStore';

interface RequestsTabProps {
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  onAcceptRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onCancelRequest: (requestId: string) => void;
  isRTL: boolean;
}

export function RequestsTab({
  incomingRequests,
  outgoingRequests,
  onAcceptRequest,
  onRejectRequest,
  onCancelRequest,
  isRTL,
}: RequestsTabProps) {
  const { t } = useTranslation();

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return t('friends.timeMinutesAgo', '{{minutes}}m ago', { minutes: diffMins });
    } else if (diffHours < 24) {
      return t('friends.timeHoursAgo', '{{hours}}h ago', { hours: diffHours });
    } else if (diffDays < 7) {
      return t('friends.timeDaysAgo', '{{days}}d ago', { days: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
        {t('friends.incomingRequests', 'Incoming Requests')}
      </Text>
      {incomingRequests.length === 0 ? (
        <EmptyState
          title={t('friends.noIncoming', 'No incoming requests')}
          subtitle=""
          compact
        />
      ) : (
        incomingRequests.map((request) => (
          <FriendCard
            key={request.id}
            userId={request.sender_id}
            name={request.sender_name}
            avatar={request.sender_avatar}
            subtitle={
              request.message ||
              t('friends.sentAt', 'Sent {{time}}', {
                time: formatTimestamp(request.sent_at),
              })
            }
            onAction={() => onAcceptRequest(request.id)}
            actionLabel={t('friends.accept', 'Accept')}
            actionColor="#22C55E"
            secondaryAction={() => onRejectRequest(request.id)}
            secondaryLabel={t('friends.reject', 'Reject')}
            isRTL={isRTL}
          />
        ))
      )}

      <Text style={[styles.sectionTitle, styles.sectionSpacing, isRTL && styles.textRight]}>
        {t('friends.outgoingRequests', 'Outgoing Requests')}
      </Text>
      {outgoingRequests.length === 0 ? (
        <EmptyState
          title={t('friends.noOutgoing', 'No outgoing requests')}
          subtitle=""
          compact
        />
      ) : (
        outgoingRequests.map((request) => (
          <FriendCard
            key={request.id}
            userId={request.receiver_id}
            name={request.receiver_name}
            avatar={request.receiver_avatar}
            subtitle={t('friends.sentAt', 'Sent {{time}}', {
              time: formatTimestamp(request.sent_at),
            })}
            onAction={() => onCancelRequest(request.id)}
            actionLabel={t('friends.cancel', 'Cancel')}
            actionColor="rgba(255,255,255,0.6)"
            isRTL={isRTL}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  textRight: {
    textAlign: 'right',
  },
});
