/** UserAvatarRow - User list row with avatar, name, status, and message preview. */

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { spacing, borderRadius } from '@olorin/design-tokens';
import Colors from '../../theme/colors';
import { OnlineStatusBadge } from './OnlineStatusBadge';

interface User {
  id: string;
  name: string;
  avatar: string | null;
  status: 'online' | 'offline' | 'away';
}

interface UserAvatarRowProps {
  user: User;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  onPress: (user: User) => void;
}

function formatRowTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const dayMs = 86400000;
    if (diffMs < dayMs) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export const UserAvatarRow: React.FC<UserAvatarRowProps> = ({
  user,
  lastMessage,
  timestamp,
  unreadCount,
  onPress,
}) => {
  const initial = (user.name || '').charAt(0).toUpperCase();
  const formattedTime = timestamp ? formatRowTimestamp(timestamp) : '';

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress(user)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${user.name}, ${user.status}`}
      accessibilityHint={lastMessage ? `Last message: ${lastMessage}` : 'Open conversation'}
    >
      <View style={styles.avatarWrapper}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={styles.statusWrapper}>
          <OnlineStatusBadge status={user.status} size="sm" />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          {formattedTime.length > 0 && (
            <Text style={styles.timestamp}>{formattedTime}</Text>
          )}
        </View>
        {lastMessage && (
          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.preview,
                unreadCount && unreadCount > 0 ? styles.previewUnread : null,
              ]}
              numberOfLines={1}
            >
              {lastMessage}
            </Text>
            {unreadCount !== undefined && unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

const AVATAR_SIZE = 48;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    backgroundColor: Colors.Background.primary,
  },
  pressed: {
    backgroundColor: Colors.Glass.whiteSubtle,
  },
  avatarWrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.Glass.bgLight,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.Primary.p700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  statusWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.Text.muted,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    fontSize: 14,
    color: Colors.Text.muted,
    flex: 1,
    marginRight: spacing.sm,
  },
  previewUnread: {
    color: Colors.Text.secondary,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: Colors.Primary.p600,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.Text.primary,
  },
});
