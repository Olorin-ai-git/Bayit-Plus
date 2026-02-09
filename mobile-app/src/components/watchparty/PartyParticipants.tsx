/**
 * PartyParticipants - Horizontal scrollable row of participant avatars.
 *
 * Shows each participant's avatar and name, highlights the current
 * user, marks the host, and displays the total participant count.
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWatchPartyStore } from '@bayit/shared-stores/watchPartyStore';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import { GlassAvatar, GlassBadge, spacing, borderRadius } from '@olorin/glass-ui/native';
import Colors from '../../theme/colors';

interface Participant {
  user_id: string;
  user_name: string;
  is_muted: boolean;
  is_speaking: boolean;
}

interface PartyParticipantsProps {
  overrideParticipants?: Participant[];
}

const ParticipantChip = React.memo(({ participant, isCurrentUser, isHost }: {
  participant: Participant; isCurrentUser: boolean; isHost: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <View style={[styles.chip, participant.is_speaking && styles.chipSpeaking]}>
      <View style={styles.avatarWrap}>
        <GlassAvatar name={participant.user_name} size="sm"
          style={[styles.avatar, isHost && styles.avatarHost]} />
        {isHost && (
          <View style={styles.hostBadge}>
            <Text style={styles.hostBadgeText}>{t('watchParty.hostBadge')}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.name, isCurrentUser && styles.nameCurrent]} numberOfLines={1}>
        {participant.user_name}{isCurrentUser ? ` (${t('watchParty.you')})` : ''}
      </Text>
    </View>
  );
});

ParticipantChip.displayName = 'ParticipantChip';

export const PartyParticipants: React.FC<PartyParticipantsProps> = ({ overrideParticipants }) => {
  const { t } = useTranslation();
  const storeParticipants = useWatchPartyStore((s) => s.participants);
  const hostId = useWatchPartyStore((s) => s.party?.host_id);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const participants = overrideParticipants ?? storeParticipants;

  const sorted = React.useMemo(() => {
    if (!participants.length) return [];
    return [...participants].sort((a, b) => {
      if (a.user_id === hostId) return -1;
      if (b.user_id === hostId) return 1;
      if (a.user_id === currentUserId) return -1;
      if (b.user_id === currentUserId) return 1;
      return 0;
    });
  }, [participants, hostId, currentUserId]);

  const isHost = useCallback((uid: string) => uid === hostId, [hostId]);
  const isCurrent = useCallback((uid: string) => uid === currentUserId, [currentUserId]);

  if (!participants.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('watchParty.participants', { count: participants.length })}
        </Text>
        <GlassBadge variant="default" size="sm">{String(participants.length)}</GlassBadge>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {sorted.map((p) => (
          <ParticipantChip key={p.user_id} participant={p}
            isCurrentUser={isCurrent(p.user_id)} isHost={isHost(p.user_id)} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.sm },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  title: { fontSize: 14, fontWeight: '600', color: Colors.Text.secondary },
  scrollContent: { paddingHorizontal: spacing.md, gap: spacing.md },
  chip: { alignItems: 'center', width: 64 },
  chipSpeaking: { opacity: 1 },
  avatarWrap: { position: 'relative', marginBottom: spacing.xs },
  avatar: { borderWidth: 2, borderColor: Colors.Glass.border },
  avatarHost: { borderColor: Colors.Warning.default },
  hostBadge: {
    position: 'absolute', bottom: -2, alignSelf: 'center',
    backgroundColor: Colors.Warning.default, borderRadius: borderRadius.xs,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  hostBadgeText: { fontSize: 8, fontWeight: 'bold', color: Colors.Background.primary },
  name: { fontSize: 11, color: Colors.Text.muted, textAlign: 'center' },
  nameCurrent: { color: Colors.Primary.p400, fontWeight: '600' },
});

export default PartyParticipants;
