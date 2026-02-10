import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface FriendCardProps {
  userId: string;
  name: string;
  avatar: string | null;
  subtitle?: string;
  friendCount?: number;
  gamesPlayed?: number;
  relationship?: string;
  onAction?: () => void;
  actionLabel?: string;
  actionColor?: string;
  secondaryAction?: () => void;
  secondaryLabel?: string;
  isRTL?: boolean;
}

export function FriendCard({
  name,
  avatar,
  subtitle,
  friendCount,
  gamesPlayed,
  onAction,
  actionLabel,
  actionColor = '#A855F7',
  secondaryAction,
  secondaryLabel,
  isRTL = false,
}: FriendCardProps) {
  return (
    <View style={[styles.card, isRTL && styles.cardRTL]}>
      <View style={styles.avatarContainer}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {(friendCount !== undefined || gamesPlayed !== undefined) && (
          <View style={styles.stats}>
            {friendCount !== undefined && (
              <Text style={styles.statText}>{friendCount} friends</Text>
            )}
            {gamesPlayed !== undefined && (
              <Text style={styles.statText}>{gamesPlayed} games</Text>
            )}
          </View>
        )}
      </View>

      {(onAction || secondaryAction) && (
        <View style={styles.actions}>
          {secondaryAction && secondaryLabel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={secondaryAction}
            >
              <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          )}
          {onAction && actionLabel && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: actionColor }]}
              onPress={onAction}
            >
              <Text style={styles.actionButtonText}>{actionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backdropFilter: 'blur(10px)',
  },
  cardRTL: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
});
