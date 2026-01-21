/**
 * Watch Party Text Panel
 *
 * A simplified watch party panel for platforms without WebRTC audio support (e.g., tvOS).
 * Provides text chat, participant list, and playback sync - but no audio controls.
 */
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import WatchPartyChat from './WatchPartyChat';
import WatchPartyChatInput from './WatchPartyChatInput';
import WatchPartySyncIndicator from './WatchPartySyncIndicator';

interface Participant {
  user_id: string;
  user_name: string;
  is_muted: boolean;
  is_speaking: boolean;
}

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  message_type: string;
  created_at: string;
}

interface Party {
  id: string;
  host_id: string;
  room_code: string;
  chat_enabled: boolean;
}

interface WatchPartyTextPanelProps {
  party: Party | null;
  participants: Participant[];
  messages: ChatMessage[];
  isHost: boolean;
  isSynced: boolean;
  hostPaused: boolean;
  currentUserId: string;
  onLeave: () => void;
  onEnd: () => void;
  onSendMessage: (message: string, type?: string) => void;
}

const TextOnlyParticipant: React.FC<{
  participant: Participant;
  isHost: boolean;
  isCurrentUser: boolean;
}> = ({ participant, isHost, isCurrentUser }) => {
  const { t } = useTranslation();

  return (
    <GlassView className="flex-row items-center py-3 px-4 gap-3 min-w-[120px]" intensity="low">
      <View className={`w-8 h-8 rounded-full items-center justify-center ${isHost ? 'bg-amber-500/20' : 'bg-white/20'}`}>
        <Text className="text-sm font-semibold text-white">
          {isHost ? '👑' : participant.user_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="gap-0.5">
        <Text className="text-sm font-medium text-white" numberOfLines={1}>
          {participant.user_name}
        </Text>
        {isCurrentUser && (
          <Text className="text-xs text-white/50">{t('watchParty.you')}</Text>
        )}
        {isHost && <Text className="text-xs text-amber-500">{t('watchParty.host')}</Text>}
      </View>
    </GlassView>
  );
};

export const WatchPartyTextPanel: React.FC<WatchPartyTextPanelProps> = ({
  party,
  participants,
  messages,
  isHost,
  isSynced,
  hostPaused,
  currentUserId,
  onLeave,
  onEnd,
  onSendMessage,
}) => {
  const { t } = useTranslation();

  if (!party) return null;

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.user_id === party.host_id) return -1;
    if (b.user_id === party.host_id) return 1;
    return 0;
  });

  return (
    <GlassView className="flex-1 p-6 gap-4 rounded-2xl" intensity="high">
      {/* Header with Room Code */}
      <View className="flex-row justify-between items-center">
        <View className="gap-1">
          <Text className="text-xs text-white/70">{t('watchParty.roomCode')}</Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-2xl font-bold text-purple-500 tracking-widest">{party.room_code}</Text>
          </View>
        </View>

        <WatchPartySyncIndicator
          isSynced={isSynced}
          hostPaused={hostPaused}
          isHost={isHost}
        />
      </View>

      <View className="h-px bg-white/20" />

      {/* Text-Only Mode Indicator */}
      <View className="flex-row items-center justify-center gap-3 py-3 bg-purple-500/10 rounded-lg">
        <Text className="text-base">💬</Text>
        <Text className="text-sm text-white/70">{t('watchParty.textOnlyMode')}</Text>
      </View>

      <View className="h-px bg-white/20" />

      {/* Participants (simplified - no audio indicators) */}
      <View className="gap-3">
        <Text className="text-sm font-medium text-white/70">
          {t('watchParty.participants')} ({participants.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3 py-1">
            {sortedParticipants.map((participant) => (
              <TextOnlyParticipant
                key={participant.user_id}
                participant={participant}
                isHost={participant.user_id === party.host_id}
                isCurrentUser={participant.user_id === currentUserId}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Chat Section */}
      {party.chat_enabled && (
        <>
          <View className="h-px bg-white/20" />
          <View className="flex-1 gap-4">
            <WatchPartyChat
              messages={messages}
              currentUserId={currentUserId}
              maxHeight={200}
            />
            <WatchPartyChatInput
              onSend={onSendMessage}
              disabled={!party.chat_enabled}
            />
          </View>
        </>
      )}

      {/* Action Buttons */}
      <View className="h-px bg-white/20" />
      <View className="flex-row justify-end gap-4">
        <GlassButton
          title={t('watchParty.leave')}
          onPress={onLeave}
          variant="secondary"
          size="sm"
        />
        {isHost && (
          <GlassButton
            title={t('watchParty.endParty')}
            onPress={onEnd}
            variant="danger"
            size="sm"
          />
        )}
      </View>
    </GlassView>
  );
};

export default WatchPartyTextPanel;
