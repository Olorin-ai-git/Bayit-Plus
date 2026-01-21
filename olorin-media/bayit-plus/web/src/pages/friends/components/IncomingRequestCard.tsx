import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react';
import { GlassCard, GlassAvatar } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import type { FriendRequest } from '../types';

interface IncomingRequestCardProps {
  request: FriendRequest;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  formatTimestamp: (timestamp: string) => string;
  isRTL: boolean;
}

export function IncomingRequestCard({
  request,
  onAccept,
  onReject,
  formatTimestamp,
  isRTL,
}: IncomingRequestCardProps) {
  return (
    <GlassCard style={styles.requestCard}>
      <View style={[styles.requestContent, isRTL && styles.requestContentRTL]}>
        <GlassAvatar
          uri={request.sender_avatar}
          name={request.sender_name}
          size="medium"
        />

        <View style={styles.requestInfo}>
          <Text style={[styles.requestName, isRTL && styles.textRTL]}>
            {request.sender_name}
          </Text>
          {request.message && (
            <Text style={[styles.requestMessage, isRTL && styles.textRTL]}>
              "{request.message}"
            </Text>
          )}
          <Text style={[styles.requestTime, isRTL && styles.textRTL]}>
            {formatTimestamp(request.sent_at)}
          </Text>
        </View>

        <View style={[styles.requestActions, isRTL && styles.requestActionsRTL]}>
          <Pressable
            onPress={() => onAccept(request.id)}
            style={({ pressed }) => [
              styles.glassIconButton,
              styles.successButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Check size={20} color={colors.success} />
          </Pressable>
          <Pressable
            onPress={() => onReject(request.id)}
            style={({ pressed }) => [
              styles.glassIconButton,
              styles.dangerButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <X size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  requestCard: {
    padding: spacing.md,
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  requestContentRTL: {
    flexDirection: 'row-reverse',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  requestMessage: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  requestActionsRTL: {
    flexDirection: 'row-reverse',
  },
  glassIconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  successButton: {
    backgroundColor: colors.glassPurpleLight,
  },
  dangerButton: {
    backgroundColor: colors.glassPurpleLight,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  textRTL: {
    textAlign: 'right',
  },
});
