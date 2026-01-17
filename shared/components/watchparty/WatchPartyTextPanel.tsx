/**
 * Watch Party Text Panel
 *
 * A simplified watch party panel for platforms without WebRTC audio support (e.g., tvOS).
 * Provides text chat, participant list, and playback sync - but no audio controls.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import WatchPartyChat from './WatchPartyChat';
import WatchPartyChatInput from './WatchPartyChatInput';
import WatchPartySyncIndicator from './WatchPartySyncIndicator';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

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
    <GlassView style={styles.participant} intensity="low">
      <View style={[styles.avatar, isHost && styles.avatarHost]}>
        <Text style={styles.avatarText}>
          {isHost ? '👑' : participant.user_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.nameContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {participant.user_name}
        </Text>
        {isCurrentUser && (
          <Text style={styles.badge}>{t('watchParty.you')}</Text>
        )}
        {isHost && <Text style={styles.hostBadge}>{t('watchParty.host')}</Text>}
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
    <GlassView style={styles.container} intensity="high">
      {/* Header with Room Code */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.roomLabel}>{t('watchParty.roomCode')}</Text>
          <View style={styles.roomCodeContainer}>
            <Text style={styles.roomCode}>{party.room_code}</Text>
          </View>
        </View>

        <WatchPartySyncIndicator
          isSynced={isSynced}
          hostPaused={hostPaused}
          isHost={isHost}
        />
      </View>

      <View style={styles.divider} />

      {/* Text-Only Mode Indicator */}
      <View style={styles.textOnlyBanner}>
        <Text style={styles.textOnlyIcon}>💬</Text>
        <Text style={styles.textOnlyText}>{t('watchParty.textOnlyMode')}</Text>
      </View>

      <View style={styles.divider} />

      {/* Participants (simplified - no audio indicators) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('watchParty.participants')} ({participants.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.participantList}>
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
          <View style={styles.divider} />
          <View style={styles.chatSection}>
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
      <View style={styles.divider} />
      <View style={styles.actions}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    gap: spacing.xs,
  },
  roomLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  roomCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roomCode: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  textOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(107, 33, 168, 0.1)',
    borderRadius: borderRadius.md,
  },
  textOnlyIcon: {
    fontSize: 16,
  },
  textOnlyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  participantList: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minWidth: 120,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHost: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  nameContainer: {
    gap: 2,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  badge: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  hostBadge: {
    fontSize: fontSize.xs,
    color: colors.warning,
  },
  chatSection: {
    flex: 1,
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
});

export default WatchPartyTextPanel;
