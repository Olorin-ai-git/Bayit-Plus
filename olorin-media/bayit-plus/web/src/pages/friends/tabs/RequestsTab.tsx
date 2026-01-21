import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { colors, spacing } from '@bayit/shared/theme';
import { EmptyState } from '../components/EmptyState';
import { IncomingRequestCard } from '../components/IncomingRequestCard';
import { FriendCard } from '../components/FriendCard';
import { formatTimestamp } from '../utils';
import type { FriendRequest } from '../types';

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

  return (
    <View style={styles.listContainer}>
      <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
        {t('friends.incomingRequests', 'Incoming Requests')}
      </Text>
      {incomingRequests.length === 0 ? (
        <EmptyState
          icon={null}
          title={t('friends.noIncoming', 'No incoming requests')}
          subtitle=""
          compact
        />
      ) : (
        incomingRequests.map((request) => (
          <IncomingRequestCard
            key={request.id}
            request={request}
            onAccept={onAcceptRequest}
            onReject={onRejectRequest}
            formatTimestamp={(timestamp) => formatTimestamp(timestamp, t)}
            isRTL={isRTL}
          />
        ))
      )}

      <Text style={[styles.sectionTitle, isRTL && styles.textRTL, styles.sectionTitleSpaced]}>
        {t('friends.outgoingRequests', 'Outgoing Requests')}
      </Text>
      {outgoingRequests.length === 0 ? (
        <EmptyState
          icon={null}
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
              time: formatTimestamp(request.sent_at, t),
            })}
            onAction={() => onCancelRequest(request.id)}
            actionLabel={t('friends.cancel', 'Cancel')}
            actionIcon={X}
            actionColor={colors.textMuted}
            isRTL={isRTL}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  sectionTitleSpaced: {
    marginTop: spacing.lg,
  },
  textRTL: {
    textAlign: 'right',
  },
});
