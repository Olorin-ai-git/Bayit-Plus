/**
 * Player card component showing player info and status.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { User, Crown } from 'lucide-react';

interface PlayerCardProps {
  player?: {
    user_name: string;
    color: 'white' | 'black';
    is_connected: boolean;
    time_remaining_ms?: number;
  };
  isCurrentTurn: boolean;
  isHost?: boolean;
}

export default function PlayerCard({ player, isCurrentTurn, isHost = false }: PlayerCardProps) {
  if (!player) {
    return (
      <View style={[styles.container, styles.waitingContainer]}>
        <Text style={styles.waitingText}>Waiting for opponent...</Text>
      </View>
    );
  }

  const formatTime = (ms?: number) => {
    if (!ms) return null;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[
      styles.container,
      isCurrentTurn && styles.activeContainer,
      !player.is_connected && styles.disconnectedContainer
    ]}>
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <View style={[styles.avatar, player.color === 'white' ? styles.whiteAvatar : styles.blackAvatar]}>
            <User size={20} color={player.color === 'white' ? colors.dark : colors.text} />
          </View>

          <View style={styles.details}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{player.user_name}</Text>
              {isHost && <Crown size={14} color={colors.warning} />}
            </View>
            <Text style={styles.color}>{player.color.toUpperCase()}</Text>
          </View>
        </View>

        {player.time_remaining_ms !== undefined && (
          <View style={styles.timer}>
            <Text style={[styles.timerText, isCurrentTurn && styles.activeTimer]}>
              {formatTime(player.time_remaining_ms)}
            </Text>
          </View>
        )}
      </View>

      {!player.is_connected && (
        <Text style={styles.disconnectedText}>Disconnected</Text>
      )}

      {isCurrentTurn && (
        <View style={styles.turnIndicator}>
          <View style={styles.turnDot} />
          <Text style={styles.turnText}>Their turn</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(10, 10, 20, 0.3)',
    backdropFilter: 'blur(20px)',
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  activeContainer: {
    borderColor: colors.primary,
    ...Platform.select({
      web: {
        boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
      },
    }),
  },
  disconnectedContainer: {
    opacity: 0.6,
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  waitingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteAvatar: {
    backgroundColor: colors.text,
  },
  blackAvatar: {
    backgroundColor: colors.dark,
    borderWidth: 2,
    borderColor: colors.text,
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  color: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  activeTimer: {
    color: colors.warning,
  },
  disconnectedText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  turnText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
});
