import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

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
        style={[
          horizontal ? styles.participantHorizontal : styles.participantVertical,
          participant.is_speaking && styles.speaking,
        ]}
        intensity="low"
        borderColor={participant.is_speaking ? colors.success : undefined}
      >
        <View
          style={[
            styles.avatar,
            isHost && styles.avatarHost,
          ]}
        >
          <Text style={styles.avatarText}>
            {isHost ? '👑' : participant.user_name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.nameContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {participant.user_name}
          </Text>
          {isCurrentUser && (
            <Text style={styles.youLabel}>({t('watchParty.you')})</Text>
          )}
          {isHost && <Text style={styles.hostLabel}>{t('watchParty.host')}</Text>}
        </View>

        {participant.is_muted && (
          <Text style={styles.mutedIcon}>🔇</Text>
        )}
      </GlassView>
    );
  };

  if (horizontal) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {t('watchParty.participants')} ({participants.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.horizontalList}>
            {sortedParticipants.map(renderParticipant)}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('watchParty.participants')} ({participants.length})
      </Text>
      <View style={styles.verticalList}>
        {sortedParticipants.map(renderParticipant)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  horizontalList: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  verticalList: {
    gap: spacing.xs,
  },
  participantHorizontal: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 80,
  },
  participantVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  speaking: {
    borderColor: colors.success,
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
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  youLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  hostLabel: {
    fontSize: fontSize.xs,
    color: colors.warning,
  },
  mutedIcon: {
    fontSize: fontSize.sm,
  },
});

export default WatchPartyParticipants;
