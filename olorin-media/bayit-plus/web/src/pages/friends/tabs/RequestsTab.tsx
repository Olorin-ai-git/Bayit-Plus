import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
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
    <View className="gap-4">
      <Text className="text-[13px] font-semibold text-white/60 uppercase tracking-wide mb-2" style={[isRTL ? styles.textRight : styles.textLeft]}>
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

      <Text className="text-[13px] font-semibold text-white/60 uppercase tracking-wide mb-2 mt-6" style={[isRTL ? styles.textRight : styles.textLeft]}>
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
            actionColor="rgba(255,255,255,0.6)"
            isRTL={isRTL}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  textRight: {
    textAlign: 'right',
  },
  textLeft: {
    textAlign: 'left',
  },
});
