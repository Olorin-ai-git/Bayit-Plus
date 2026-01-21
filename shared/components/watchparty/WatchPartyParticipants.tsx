import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';

interface Participant {
  user_id: string;
  user_name: string;
  is_muted: boolean;
  is_speaking: boolean;
}

interface WatchPartyParticipantsProps {
  participants: Participant[];
  hostId: string;
  currentUserId: string;
  horizontal?: boolean;
}

export const WatchPartyParticipants: React.FC<WatchPartyParticipantsProps> = ({
  participants,
  hostId,
  currentUserId,
  horizontal = false,
}) => {
  const { t } = useTranslation();

  if (!participants?.length) return null;

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.user_id === hostId) return -1;
    if (b.user_id === hostId) return 1;
    return 0;
  });

  const renderParticipant = (participant: Participant) => {
    const isHost = participant.user_id === hostId;
    const isCurrentUser = participant.user_id === currentUserId;

    return (
      <GlassView
        key={participant.user_id}
        className={horizontal ? "flex-col items-center py-3 px-4 min-w-[80px]" : "flex-row items-center py-3 px-4 gap-3"}
        intensity="low"
        borderColor={participant.is_speaking ? '#10b981' : undefined}
      >
        <View
          className={`w-8 h-8 rounded-full items-center justify-center ${isHost ? 'bg-amber-500/20' : 'bg-white/20'}`}
        >
          <Text className="text-sm font-semibold text-white">
            {isHost ? '👑' : participant.user_name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-medium text-white" numberOfLines={1}>
            {participant.user_name}
          </Text>
          {isCurrentUser && (
            <Text className="text-xs text-white/50">({t('watchParty.you')})</Text>
          )}
          {isHost && <Text className="text-xs text-amber-500">{t('watchParty.host')}</Text>}
        </View>

        {participant.is_muted && (
          <Text className="text-sm">🔇</Text>
        )}
      </GlassView>
    );
  };

  if (horizontal) {
    return (
      <View className="gap-3">
        <Text className="text-sm font-medium text-white/70 px-1">
          {t('watchParty.participants')} ({participants.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3 py-1">
            {sortedParticipants.map(renderParticipant)}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text className="text-sm font-medium text-white/70 px-1">
        {t('watchParty.participants')} ({participants.length})
      </Text>
      <View className="gap-1">
        {sortedParticipants.map(renderParticipant)}
      </View>
    </View>
  );
};

export default WatchPartyParticipants;
